"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { roundSAR, multiply, extractVatFromInclusive } from "@/lib/financial"

// =============================================
// Account Seeding for Purchases
// =============================================
async function getOrSeedPurchaseAccounts(tx: any) {
  const cash = await tx.account.upsert({ where: { code: "1001" }, update: {}, create: { code: "1001", name: "Cash on Hand", type: "ASSET" } })
  const bank = await tx.account.upsert({ where: { code: "1002" }, update: {}, create: { code: "1002", name: "Bank Account", type: "ASSET" } })
  const cogs = await tx.account.upsert({ where: { code: "5001" }, update: {}, create: { code: "5001", name: "Cost of Fuel Purchased", type: "EXPENSE" } })
  const vatInput = await tx.account.upsert({ where: { code: "1004" }, update: {}, create: { code: "1004", name: "VAT Input Tax (Receivable)", type: "ASSET" } })
  return { cash, bank, cogs, vatInput }
}

// =============================================
// Supplier Management
// =============================================
export async function addSupplier(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER") throw new Error("Unauthorized")

  const name = formData.get("name") as string
  const vatNumber = formData.get("vatNumber") as string
  const contactInfo = formData.get("contactInfo") as string

  if (!name || name.trim().length < 2) throw new Error("Supplier name is required (min 2 characters).")

  await prisma.supplier.create({
    data: { name: name.trim(), vatNumber: vatNumber?.trim() || null, contactInfo: contactInfo?.trim() || null }
  })

  // Audit
  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id,
      action: "SUPPLIER_ADDED",
      details: `Added supplier: ${name}${vatNumber ? ` (VAT: ${vatNumber})` : ""}`
    }
  })

  revalidatePath("/purchases")
}

export async function editSupplier(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER") throw new Error("Unauthorized")

  const supplierId = formData.get("id") as string
  if (!supplierId) throw new Error("Supplier ID is required.")

  const name = formData.get("name") as string
  if (!name || name.trim().length < 2) throw new Error("Supplier name is required.")

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: name.trim(),
      vatNumber: (formData.get("vatNumber") as string)?.trim() || null,
    }
  })

  revalidatePath("/purchases")
}

// =============================================
// Purchase Refill — Production-Grade
// =============================================
export async function processRefillPurchase(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    throw new Error("Unauthorized: Only Admin or Accountant can process purchases.")
  }

  // 1. Extract & Validate Inputs
  const supplierId = formData.get("supplierId") as string
  const tankId = formData.get("tankId") as string
  const invoiceNumber = formData.get("invoiceNumber") as string
  const paymentMethod = formData.get("paymentMethod") as string

  if (!supplierId) throw new Error("Please select a supplier.")
  if (!tankId) throw new Error("Please select a tank.")
  if (!invoiceNumber?.trim()) throw new Error("Invoice number is required.")

  // CRITICAL: Enforce payment method
  if (!paymentMethod || !["CASH", "BANK"].includes(paymentMethod)) {
    throw new Error("Please select a payment method (Cash or Bank).")
  }

  const quantity = parseFloat(formData.get("quantity") as string)
  const unitPrice = parseFloat(formData.get("unitPrice") as string)

  if (isNaN(quantity) || quantity <= 0) throw new Error("Quantity must be a positive number.")
  if (isNaN(unitPrice) || unitPrice <= 0) throw new Error("Unit price must be a positive number.")

  // 2. Execute Atomic Transaction
  await prisma.$transaction(async (tx: any) => {
    // 2a. Validate Tank Capacity
    const tank = await tx.tank.findUnique({ where: { id: tankId }, include: { fuelType: true } })
    if (!tank) throw new Error("Tank not found.")

    const freeSpace = roundSAR(tank.capacity - tank.currentVolume)
    if (quantity > freeSpace) {
      throw new Error(`Overflow Risk! Tank "${tank.name}" only has ${freeSpace.toFixed(2)}L of free space. Requested: ${quantity}L.`)
    }

    // 2b. Precision Financial Calculations
    const totalAmount = multiply(quantity, unitPrice)
    const { netAmount, vatAmount } = extractVatFromInclusive(totalAmount)

    // 2c. Add Fuel to Tank
    await tx.tank.update({
      where: { id: tankId },
      data: { currentVolume: { increment: quantity } }
    })

    // 2d. Double-Entry Accounting
    const accounts = await getOrSeedPurchaseAccounts(tx)
    const creditAccount = paymentMethod === "CASH" ? accounts.cash : accounts.bank

    const journal = await tx.journalEntry.create({
      data: {
        description: `Supplier Refill: ${quantity}L for ${tank.name} (Inv: ${invoiceNumber})`,
        transactions: {
          create: [
            // Debit: Cost of Goods (Expense) — net amount
            { accountId: accounts.cogs.id, debit: netAmount, credit: 0 },
            // Debit: VAT Input (Asset) — we claim this back from ZATCA
            { accountId: accounts.vatInput.id, debit: vatAmount, credit: 0 },
            // Credit: Cash or Bank decreased — we paid the supplier
            { accountId: creditAccount.id, debit: 0, credit: totalAmount }
          ]
        }
      }
    })

    // 2e. Record Purchase
    await tx.purchase.create({
      data: {
        invoiceNumber: invoiceNumber.trim(),
        supplierId,
        fuelTypeId: tank.fuelTypeId,
        quantity,
        unitPrice,
        totalAmount,
        journalEntryId: journal.id,
      }
    })

    // 2f. Audit Log
    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "PURCHASE_PROCESSED",
        details: `Purchase: ${quantity}L ${tank.fuelType.name} @ SAR ${unitPrice}/L = SAR ${totalAmount.toFixed(2)} (VAT: SAR ${vatAmount.toFixed(2)}). Supplier Invoice: ${invoiceNumber}. Payment: ${paymentMethod}.`
      }
    })
  })

  revalidatePath("/purchases")
  revalidatePath("/inventory")
  revalidatePath("/dashboard")
  revalidatePath("/accounting")
  revalidatePath("/reporting")
}
