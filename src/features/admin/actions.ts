"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"

// =============================================
// SYSTEM RESET — Multi-Step Secure Process
// =============================================

/**
 * Reset invoices/sales only.
 * Removes: Sales, SaleItems, and their linked JournalEntries.
 * Keeps: Accounts, Tanks, Suppliers, Purchases, Users.
 */
export async function resetInvoicesOnly(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only administrators can perform system resets.")
  }

  // Re-verify password
  const password = formData.get("password") as string
  if (!password) throw new Error("Password verification required.")
  
  const user = await prisma.user.findUnique({ where: { id: (session as any).user.id } })
  if (!user?.password) throw new Error("User authentication failed.")

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) throw new Error("Incorrect password. Reset aborted for security.")

  const confirmation = formData.get("confirmation") as string
  if (confirmation !== "RESET INVOICES") throw new Error('Please type "RESET INVOICES" to confirm.')

  // Execute reset
  await prisma.$transaction(async (tx: any) => {
    // Get all sale journal entry IDs
    const sales = await tx.sale.findMany({ select: { journalEntryId: true } })
    const journalIds = sales.map((s: any) => s.journalEntryId).filter(Boolean)

    // Delete in order: SaleItems → Sales → LedgerTransactions → JournalEntries
    await tx.saleItem.deleteMany({})
    await tx.sale.deleteMany({})

    if (journalIds.length > 0) {
      await tx.ledgerTransaction.deleteMany({ where: { journalEntryId: { in: journalIds } } })
      await tx.journalEntry.deleteMany({ where: { id: { in: journalIds } } })
    }

    // Log the reset
    await tx.systemReset.create({
      data: {
        type: "INVOICES_ONLY",
        performedById: (session as any).user.id,
        reason: (formData.get("reason") as string) || "No reason provided",
        details: `Deleted ${sales.length} invoices and ${journalIds.length} journal entries.`
      }
    })

    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "SYSTEM_RESET_INVOICES",
        details: `CRITICAL: Reset all invoices. ${sales.length} sales deleted, ${journalIds.length} journal entries removed.`
      }
    })
  })

  revalidatePath("/", "layout")
}

/**
 * Reset all financial data.
 * Removes: Sales, Purchases, JournalEntries, LedgerTransactions.
 * Keeps: Accounts (Chart of Accounts), Tanks (resets volume to 0), Suppliers, Users.
 */
export async function resetFinancialData(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only administrators can perform system resets.")
  }

  const password = formData.get("password") as string
  if (!password) throw new Error("Password verification required.")

  const user = await prisma.user.findUnique({ where: { id: (session as any).user.id } })
  if (!user?.password) throw new Error("User authentication failed.")

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) throw new Error("Incorrect password. Reset aborted for security.")

  const confirmation = formData.get("confirmation") as string
  if (confirmation !== "RESET FINANCIAL") throw new Error('Please type "RESET FINANCIAL" to confirm.')

  await prisma.$transaction(async (tx: any) => {
    const salesCount = await tx.sale.count()
    const purchasesCount = await tx.purchase.count()
    const journalsCount = await tx.journalEntry.count()

    // Delete all financial records
    await tx.saleItem.deleteMany({})
    await tx.sale.deleteMany({})
    await tx.purchase.deleteMany({})
    await tx.ledgerTransaction.deleteMany({})
    await tx.journalEntry.deleteMany({})

    // Reset tank volumes to 0
    await tx.tank.updateMany({ data: { currentVolume: 0 } })

    await tx.systemReset.create({
      data: {
        type: "FINANCIAL_DATA",
        performedById: (session as any).user.id,
        reason: (formData.get("reason") as string) || "No reason provided",
        details: `Deleted ${salesCount} sales, ${purchasesCount} purchases, ${journalsCount} journal entries. Tank volumes reset to 0.`
      }
    })

    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "SYSTEM_RESET_FINANCIAL",
        details: `CRITICAL: Full financial reset. ${salesCount} sales, ${purchasesCount} purchases, ${journalsCount} journals deleted. All tank volumes set to 0.`
      }
    })
  })

  revalidatePath("/", "layout")
}

/**
 * Full system reset — Nuclear option.
 * Removes EVERYTHING except the current admin user and system reset logs.
 */
export async function resetFullSystem(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only administrators can perform system resets.")
  }

  const password = formData.get("password") as string
  if (!password) throw new Error("Password verification required.")

  const user = await prisma.user.findUnique({ where: { id: (session as any).user.id } })
  if (!user?.password) throw new Error("User authentication failed.")

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) throw new Error("Incorrect password. Reset aborted for security.")

  const confirmation = formData.get("confirmation") as string
  if (confirmation !== "FULL SYSTEM RESET") throw new Error('Please type "FULL SYSTEM RESET" to confirm.')

  await prisma.$transaction(async (tx: any) => {
    // Count everything first for the audit log
    const counts = {
      sales: await tx.sale.count(),
      purchases: await tx.purchase.count(),
      journals: await tx.journalEntry.count(),
      accounts: await tx.account.count(),
      tanks: await tx.tank.count(),
      fuelTypes: await tx.fuelType.count(),
      suppliers: await tx.supplier.count(),
    }

    // Delete in dependency order
    await tx.saleItem.deleteMany({})
    await tx.sale.deleteMany({})
    await tx.purchase.deleteMany({})
    await tx.ledgerTransaction.deleteMany({})
    await tx.journalEntry.deleteMany({})
    await tx.account.deleteMany({})
    await tx.tank.deleteMany({})
    await tx.fuelType.deleteMany({})
    await tx.supplier.deleteMany({})

    // Delete activity logs for non-admin users FIRST (FK constraint)
    await tx.activityLog.deleteMany({
      where: { userId: { not: (session as any).user.id } }
    })

    // Delete all users EXCEPT the current admin
    await tx.user.deleteMany({
      where: { id: { not: (session as any).user.id } }
    })

    await tx.systemReset.create({
      data: {
        type: "FULL_SYSTEM",
        performedById: (session as any).user.id,
        reason: (formData.get("reason") as string) || "No reason provided",
        details: `NUCLEAR RESET: Deleted ${counts.sales} sales, ${counts.purchases} purchases, ${counts.journals} journals, ${counts.accounts} accounts, ${counts.tanks} tanks, ${counts.fuelTypes} fuel types, ${counts.suppliers} suppliers. All non-admin users removed.`
      }
    })

    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "SYSTEM_RESET_FULL",
        details: `CRITICAL: FULL SYSTEM RESET. All data except current admin has been permanently deleted.`
      }
    })
  })

  revalidatePath("/", "layout")
}
