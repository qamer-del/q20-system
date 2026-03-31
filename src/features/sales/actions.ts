"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

// Helper to ensure core accounting ledgers exist so POS doesn't crash on Day 1
async function getOrSeedAccounts(tx: any) {
  const c = await tx.account.upsert({ where: { code: "1001" }, update: {}, create: { code: "1001", name: "Cash on Hand", type: "ASSET" }})
  const b = await tx.account.upsert({ where: { code: "1002" }, update: {}, create: { code: "1002", name: "Bank / Mada POS", type: "ASSET" }})
  const s = await tx.account.upsert({ where: { code: "4001" }, update: {}, create: { code: "4001", name: "Sales Revenue", type: "REVENUE" }})
  const v = await tx.account.upsert({ where: { code: "2001" }, update: {}, create: { code: "2001", name: "VAT Payable (ZATCA 15%)", type: "LIABILITY" }})
  return { cash: c, bank: b, sales: s, vat: v }
}

export async function processSale(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  const tankId = formData.get("tankId") as string
  const quantityString = formData.get("quantity") as string
  const paymentMethod = formData.get("paymentMethod") as "CASH" | "CREDIT_CARD" | "MADA"
  
  const quantity = parseFloat(quantityString)
  if (isNaN(quantity) || quantity <= 0) throw new Error("Invalid quantity")

  // ==========================================
  // CORE POS TRANSACTION ENGINE
  // ==========================================
  await prisma.$transaction(async (tx: any) => {
    // 1. Validate Inventory
    const tank = await tx.tank.findUnique({ where: { id: tankId }, include: { fuelType: true } })
    if (!tank) throw new Error("Tank not found")
    if (tank.currentVolume < quantity) throw new Error(`Not enough fuel in ${tank.name}. Only ${tank.currentVolume}L left.`)

    // 2. Calculate Financials
    const unitPrice = tank.fuelType.pricePerLiter
    const totalAmount = parseFloat((quantity * unitPrice).toFixed(2))
    
    // Reverse calculating VAT (15% standard Saudi VAT) assuming pump price includes VAT.
    const netAmount = parseFloat((totalAmount / 1.15).toFixed(2))
    const vatAmount = parseFloat((totalAmount - netAmount).toFixed(2))

    // 3. Deduct Inventory Immediately
    await tx.tank.update({
      where: { id: tankId },
      data: { currentVolume: { decrement: quantity } }
    })

    const accounts = await getOrSeedAccounts(tx)
    const isCash = paymentMethod === "CASH"
    const debitAccount = isCash ? accounts.cash : accounts.bank

    // 4. Double-Entry Accounting (Journal Entry)
    const journal = await tx.journalEntry.create({
      data: {
        description: `POS Sale: ${quantity}L of ${tank.fuelType.name} via ${paymentMethod}`,
        transactions: {
          create: [
            // Debit: We received Cash or Bank from customer
            { accountId: debitAccount.id, debit: totalAmount, credit: 0 },
            // Credit: We recognize Sales Revenue (pure profit without VAT)
            { accountId: accounts.sales.id, debit: 0, credit: netAmount },
            // Credit: We owe ZATCA the 15% VAT
            { accountId: accounts.vat.id, debit: 0, credit: vatAmount }
          ]
        }
      }
    })

    // 5. Generate ZATCA Phase 2 Prep Payload (Base64 TLV format mock)
    const zatcaString = `1:Station, 2:300000000000003, 3:${new Date().toISOString()}, 4:${totalAmount}, 5:${vatAmount}`
    const b64QRPayload = Buffer.from(zatcaString).toString("base64")

    // 6. Finalize Sale Record
    await tx.sale.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount,
        netAmount,
        vatAmount,
        paymentMethod,
        // @ts-ignore
        userId: session.user.id,
        zatcaQrCode: b64QRPayload,
        zatcaHash: "PREP-HASH-PHASE-2",
        journalEntryId: journal.id,
        items: {
          create: [{
            fuelTypeId: tank.fuelTypeId,
            quantity,
            unitPrice,
            totalPrice: totalAmount
          }]
        }
      }
    })
  })

  // Refresh all dashboards to immediately show the new Sales, Profits, and Zakat!
  revalidatePath("/pos")
  revalidatePath("/dashboard")
  revalidatePath("/inventory")
}
