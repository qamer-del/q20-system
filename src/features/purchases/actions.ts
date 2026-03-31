"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

// Ensure basic Accounts exist for Purchases
// @ts-ignore
async function getOrSeedPurchaseAccounts(tx: any) {
  const bank = await tx.account.upsert({ where: { code: "1002" }, update: {}, create: { code: "1002", name: "Bank / Mada POS", type: "ASSET" }})
  const cogs = await tx.account.upsert({ where: { code: "5001" }, update: {}, create: { code: "5001", name: "Cost of Fuel Purchased", type: "EXPENSE" }})
  const vatInput = await tx.account.upsert({ where: { code: "1004" }, update: {}, create: { code: "1004", name: "VAT Input Tax (Receivable)", type: "ASSET" }})
  return { bank, cogs, vatInput }
}

export async function addSupplier(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT") throw new Error("Unauthorized")

  await prisma.supplier.create({
    data: {
      name: formData.get("name") as string,
      vatNumber: formData.get("vatNumber") as string,
      contactInfo: formData.get("contactInfo") as string,
    }
  })
  
  revalidatePath("/purchases")
}

export async function editSupplier(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT") throw new Error("Unauthorized")

  const supplierId = formData.get("id") as string
  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: formData.get("name") as string,
      vatNumber: formData.get("vatNumber") as string,
    }
  })
  
  revalidatePath("/purchases")
}

export async function processRefillPurchase(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized")
  }

  const supplierId = formData.get("supplierId") as string
  const tankId = formData.get("tankId") as string
  const invoiceNumber = formData.get("invoiceNumber") as string
  
  const quantity = parseFloat(formData.get("quantity") as string)
  const unitPrice = parseFloat(formData.get("unitPrice") as string)
  
  if (isNaN(quantity) || quantity <= 0) throw new Error("Invalid quantity")
  if (isNaN(unitPrice) || unitPrice <= 0) throw new Error("Invalid price")

  await prisma.$transaction(async (tx: any) => {
    // 1. Validate Tank Capacity (Prevent Overflow)
    const tank = await tx.tank.findUnique({ where: { id: tankId }, include: { fuelType: true } })
    if (!tank) throw new Error("Tank not found")
    
    if (tank.currentVolume + quantity > tank.capacity) {
      throw new Error(`Overflow Risk! Tank only has ${(tank.capacity - tank.currentVolume).toFixed(2)}L of free space.`)
    }

    // 2. Financial Math (Assuming input price is VAT-inclusive for simplicity)
    const totalAmount = parseFloat((quantity * unitPrice).toFixed(2))
    const netAmount = parseFloat((totalAmount / 1.15).toFixed(2))
    const vatAmount = parseFloat((totalAmount - netAmount).toFixed(2))

    // 3. Add Fuel to Physical Tank
    await tx.tank.update({
      where: { id: tankId },
      data: { currentVolume: { increment: quantity } }
    })

    const accounts = await getOrSeedPurchaseAccounts(tx)

    // 4. Double-Entry Accounting
    const journal = await tx.journalEntry.create({
      data: {
        description: `Supplier Refill: ${quantity}L for ${tank.name} (Inv: ${invoiceNumber})`,
        transactions: {
          create: [
            // Debit: We recognize the cost of goods (Expense)
            { accountId: accounts.cogs.id, debit: netAmount, credit: 0 },
            // Debit: We paid VAT to supplier, which we claim back from ZATCA (Asset)
            { accountId: accounts.vatInput.id, debit: vatAmount, credit: 0 },
            // Credit: Our Bank account decreased (paid the supplier)
            { accountId: accounts.bank.id, debit: 0, credit: totalAmount }
          ]
        }
      }
    })

    // 5. Finalize Purchase Record
    await tx.purchase.create({
      data: {
        invoiceNumber,
        supplierId,
        fuelTypeId: tank.fuelTypeId,
        quantity,
        unitPrice,
        totalAmount,
        journalEntryId: journal.id,
      }
    })
  })

  // Refresh caching
  revalidatePath("/purchases")
  revalidatePath("/inventory")
  revalidatePath("/dashboard")
}
