"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  roundSAR,
  multiply,
  extractVatFromInclusive,
  generateInvoiceNumber,
} from "@/lib/financial"
import { generateZatcaTlvBase64 } from "@/features/zatca/engine"

// =============================================
// Centralized Account Seeding (called once per tx)
// =============================================
async function getOrSeedAccounts(tx: any) {
  const cash = await tx.account.upsert({ where: { code: "1001" }, update: {}, create: { code: "1001", name: "Cash on Hand", type: "ASSET" }})
  const bank = await tx.account.upsert({ where: { code: "1002" }, update: {}, create: { code: "1002", name: "Bank Account", type: "ASSET" }})
  const sales = await tx.account.upsert({ where: { code: "4001" }, update: {}, create: { code: "4001", name: "Sales Revenue", type: "REVENUE" }})
  const vatPayable = await tx.account.upsert({ where: { code: "2001" }, update: {}, create: { code: "2001", name: "VAT Payable (ZATCA 15%)", type: "LIABILITY" }})
  return { cash, bank, sales, vatPayable }
}

// =============================================
// CORE POS SALE — Production-Grade
// =============================================
export async function processSale(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user?.id) throw new Error("Unauthorized: Please log in.")

  // 1. Extract & Validate Inputs
  const tankId = formData.get("tankId") as string
  const quantityString = formData.get("quantity") as string
  const paymentMethod = formData.get("paymentMethod") as string

  if (!tankId) throw new Error("Validation Error: Please select a fuel tank.")
  if (!quantityString) throw new Error("Validation Error: Please enter a quantity.")

  // CRITICAL FIX: Enforce payment method selection
  if (!paymentMethod || !["CASH", "BANK"].includes(paymentMethod)) {
    throw new Error("Validation Error: Please select a valid payment method (Cash or Bank).")
  }

  const quantity = parseFloat(quantityString)
  if (isNaN(quantity) || quantity <= 0) throw new Error("Validation Error: Quantity must be a positive number.")
  if (quantity > 99999) throw new Error("Validation Error: Quantity exceeds maximum limit.")

  // 2. Execute Atomic Transaction
  await prisma.$transaction(async (tx: any) => {
    // 2a. Validate Inventory
    const tank = await tx.tank.findUnique({ where: { id: tankId }, include: { fuelType: true } })
    if (!tank) throw new Error("Error: Tank not found.")
    if (tank.currentVolume < quantity) {
      throw new Error(`Insufficient fuel in ${tank.name}. Available: ${roundSAR(tank.currentVolume)}L. Requested: ${quantity}L.`)
    }

    // 2b. Calculate Financials with Precision
    const unitPrice = tank.fuelType.pricePerLiter
    const grossTotal = multiply(quantity, unitPrice)
    const { netAmount, vatAmount, totalAmount } = extractVatFromInclusive(grossTotal)

    // 2c. Deduct Inventory
    await tx.tank.update({
      where: { id: tankId },
      data: { currentVolume: { decrement: quantity } }
    })

    // 2d. Double-Entry Journal Entry
    const accounts = await getOrSeedAccounts(tx)
    const debitAccount = paymentMethod === "CASH" ? accounts.cash : accounts.bank

    const journal = await tx.journalEntry.create({
      data: {
        description: `POS Sale: ${quantity}L of ${tank.fuelType.name} via ${paymentMethod}`,
        transactions: {
          create: [
            { accountId: debitAccount.id, debit: totalAmount, credit: 0 },
            { accountId: accounts.sales.id, debit: 0, credit: netAmount },
            { accountId: accounts.vatPayable.id, debit: 0, credit: vatAmount }
          ]
        }
      }
    })

    // 2e. ZATCA QR Code (Phase 2 TLV format)
    const zatcaQrCode = generateZatcaTlvBase64(
      "Fuel Station LLC",
      "300000000000003",
      new Date().toISOString(),
      totalAmount.toFixed(2),
      vatAmount.toFixed(2)
    )

    // 2f. Create Sale Record
    await tx.sale.create({
      data: {
        invoiceNumber: generateInvoiceNumber("INV"),
        totalAmount,
        netAmount,
        vatAmount,
        paymentMethod: paymentMethod as any,
        // @ts-ignore
        userId: session.user.id,
        zatcaQrCode,
        zatcaHash: "PENDING-CLEARANCE",
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

    // 2g. Audit Log
    await tx.activityLog.create({
      data: {
        // @ts-ignore
        userId: session.user.id,
        action: "SALE_PROCESSED",
        details: `Sale: ${quantity}L ${tank.fuelType.name} @ SAR ${unitPrice}/L = SAR ${totalAmount.toFixed(2)} (VAT: SAR ${vatAmount.toFixed(2)}). Payment: ${paymentMethod}. Tank: ${tank.name}.`
      }
    })
  })

  revalidatePath("/pos")
  revalidatePath("/dashboard")
  revalidatePath("/inventory")
  revalidatePath("/invoices")
  revalidatePath("/accounting")
  revalidatePath("/reporting")
}
