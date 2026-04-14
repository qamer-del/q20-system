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
import { generateZatcaTlvBase64, generateZatcaUblXml } from "@/features/zatca/engine"
import crypto from "crypto"

// =============================================
// Centralized Account Seeding (called once per tx)
// =============================================
async function getOrSeedAccounts(tx: any) {
  const cash = await tx.account.upsert({ where: { code: "1001" }, update: {}, create: { code: "1001", name: "Cash on Hand", type: "ASSET" } })
  const bank = await tx.account.upsert({ where: { code: "1002" }, update: {}, create: { code: "1002", name: "Bank Account", type: "ASSET" } })
  const inventory = await tx.account.upsert({ where: { code: "1003" }, update: {}, create: { code: "1003", name: "Raw Fuel Inventory", type: "ASSET" } })
  const sales = await tx.account.upsert({ where: { code: "4001" }, update: {}, create: { code: "4001", name: "Sales Revenue", type: "REVENUE" } })
  const cogs = await tx.account.upsert({ where: { code: "5001" }, update: {}, create: { code: "5001", name: "Cost of Goods Sold (COGS)", type: "EXPENSE" } })
  const vatPayable = await tx.account.upsert({ where: { code: "2001" }, update: {}, create: { code: "2001", name: "VAT Payable (ZATCA 15%)", type: "LIABILITY" } })
  return { cash, bank, inventory, sales, cogs, vatPayable }
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
  const pumpId = formData.get("pumpId") as string
  const shiftId = formData.get("shiftId") as string
  const quantityString = formData.get("quantity") as string
  const paymentMethod = formData.get("paymentMethod") as string

  if (!tankId || !pumpId || !shiftId) throw new Error("Validation Error: Missing terminal configuration (Tank, Pump, or Shift).")
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

    // 2c. Deduct Inventory & Increment Shift Expected Liters
    await tx.tank.update({
      where: { id: tankId },
      data: { currentVolume: { decrement: quantity } }
    })

    await tx.shift.update({
      where: { id: shiftId },
      data: { expectedLiters: { increment: quantity } }
    })

    // 2d. Double-Entry Journal Entry
    const accounts = await getOrSeedAccounts(tx)
    const debitAccount = paymentMethod === "CASH" ? accounts.cash : accounts.bank

    // Calculate COGS based on latest purchase price (LIFO approximation of WAC)
    const latestPurchase = await tx.purchase.findFirst({
      where: { fuelTypeId: tank.fuelTypeId },
      orderBy: { createdAt: 'desc' }
    })
    const costPerLiter = latestPurchase ? latestPurchase.unitPrice : (unitPrice * 0.85) // Fallback 15% margin
    // The COGS value must be extracted of VAT to compare against net revenue? No, purchases are recorded with net amount to inventory.
    // However, the unitPrice in purchase might be gross. Wait, in purchase we use `netAmount = extractVat(quantity * unitPrice)`. 
    // This means inventory is valued at net amount! So cost per liter should be net.
    const netCostPerLiter = latestPurchase ? extractVatFromInclusive(costPerLiter).netAmount : extractVatFromInclusive(unitPrice * 0.85).netAmount
    const totalCogsAmount = roundSAR(multiply(quantity, netCostPerLiter))

    const journal = await tx.journalEntry.create({
      data: {
        description: `POS Sale: ${quantity}L of ${tank.fuelType.name} via ${paymentMethod}`,
        transactions: {
          create: [
            // Revenue Recognition
            { accountId: debitAccount.id, debit: totalAmount, credit: 0 },
            { accountId: accounts.sales.id, debit: 0, credit: netAmount },
            { accountId: accounts.vatPayable.id, debit: 0, credit: vatAmount },
            
            // COGS / Inventory Depletion Principle
            { accountId: accounts.cogs.id, debit: totalCogsAmount, credit: 0 },
            { accountId: accounts.inventory.id, debit: 0, credit: totalCogsAmount }
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

    // === ZATCA PHASE 2 UBL XML GENERATOR ===
    const invoiceNumber = generateInvoiceNumber("INV")
    const d = new Date()
    const uuid = crypto.randomUUID()
    
    const zatcaXml = generateZatcaUblXml({
      uuid,
      invoiceNumber,
      issueDate: d.toISOString().split('T')[0],
      issueTime: d.toISOString().split('T')[1].split('.')[0] + 'Z',
      totalAmount,
      netAmount,
      vatAmount,
      fuelName: tank.fuelType.name,
      quantity,
      unitPrice
    })

    // 2f. Create Sale Record
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        totalAmount,
        netAmount,
        vatAmount,
        paymentMethod: paymentMethod as any,
        // @ts-ignore
        userId: session.user.id,
        pumpId,
        shiftId,
        zatcaQrCode,
        zatcaHash: "PENDING-CLEARANCE",
        zatcaXml,
        journalEntryId: journal.id
      }
    })

    await tx.saleItem.create({
      data: {
        saleId: sale.id,
        fuelTypeId: tank.fuelTypeId,
        quantity,
        unitPrice,
        totalPrice: totalAmount
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
  revalidatePath("/shifts")
  revalidatePath("/dashboard")
  revalidatePath("/inventory")
  revalidatePath("/invoices")
  revalidatePath("/accounting")
  revalidatePath("/reporting")
}
