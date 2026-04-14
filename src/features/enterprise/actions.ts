"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { extractVatFromInclusive } from "@/lib/financial"

// ==========================================
// 1. VAT Quarterly Settlement
// ==========================================
export async function settleVAT() {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" }

  return await prisma.$transaction(async (tx) => {
    // 1. Calculate Balances
    const vatPayableAcc = await tx.account.findUnique({ where: { code: "2001" }, include: { transactions: true } })
    const vatInputAcc = await tx.account.findUnique({ where: { code: "1004" }, include: { transactions: true } })
    const bankAcc = await tx.account.findUnique({ where: { code: "1002" } })

    if (!vatPayableAcc || !vatInputAcc || !bankAcc) return { error: "Core accounts missing" }

    const vatPayableBalance = vatPayableAcc.transactions.reduce((s, t) => s + Number(t.credit) - Number(t.debit), 0)
    const vatInputBalance = vatInputAcc.transactions.reduce((s, t) => s + Number(t.debit) - Number(t.credit), 0)
    
    const netVAT = vatPayableBalance - vatInputBalance

    if (netVAT <= 0) return { error: "No VAT payable or refund due." }

    // 2. Settlement Journal Entry
    const journal = await tx.journalEntry.create({
      data: {
        description: "Official ZATCA VAT Settlement",
        transactions: {
          create: [
            { accountId: vatPayableAcc.id, debit: vatPayableBalance, credit: 0 },
            { accountId: vatInputAcc.id, debit: 0, credit: vatInputBalance },
            { accountId: bankAcc.id, debit: 0, credit: netVAT }
          ]
        }
      }
    })

    return { success: true, journalId: journal.id, paid: netVAT }
  })
}

// ==========================================
// 2. Accounts Payable (Supplier Purchases)
// ==========================================
export async function purchaseFuelOnCredit(supplierName: string, fuelTypeId: string, quantity: number, totalInclusiveAmount: number) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) return { error: "Unauthorized" }

  const { netAmount, vatAmount } = extractVatFromInclusive(totalInclusiveAmount)

  return await prisma.$transaction(async (tx) => {
    // 1. Create Supplier Invoice (Pending)
    const invoice = await tx.supplierInvoice.create({
      data: {
        supplier: supplierName,
        amount: totalInclusiveAmount,
        status: "PENDING"
      }
    })

    // 2. Ensure AP Account Exists
    let apAccount = await tx.account.findUnique({ where: { code: "2002" } })
    if (!apAccount) {
      apAccount = await tx.account.create({ data: { code: "2002", name: "Accounts Payable", type: "LIABILITY" } })
    }
    const inventoryAcc = await tx.account.findUnique({ where: { code: "1003" } })
    const vatInputAcc = await tx.account.findUnique({ where: { code: "1004" } })

    // 3. Accounting Entry (Debit Inventory/VAT, Credit AP)
    await tx.journalEntry.create({
      data: {
        description: `Supplier Purchase on Credit: ${supplierName}`,
        transactions: {
          create: [
            { accountId: inventoryAcc!.id, debit: netAmount, credit: 0 },
            { accountId: vatInputAcc!.id, debit: vatAmount, credit: 0 },
            { accountId: apAccount.id, debit: 0, credit: totalInclusiveAmount }
          ]
        }
      }
    })

    return { success: true, invoiceId: invoice.id }
  })
}

export async function paySupplierInvoice(invoiceId: string) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" }

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.supplierInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice || invoice.status === "PAID") return { error: "Invalid Invoice" }

    const amount = Number(invoice.amount)

    const apAccount = await tx.account.findUnique({ where: { code: "2002" } })
    const bankAccount = await tx.account.findUnique({ where: { code: "1002" } })

    // 1. Settle Accounting
    await tx.journalEntry.create({
      data: {
        description: `Supplier Payment Settled: ${invoice.supplier}`,
        transactions: {
          create: [
            { accountId: apAccount!.id, debit: amount, credit: 0 },
            { accountId: bankAccount!.id, debit: 0, credit: amount }
          ]
        }
      }
    })

    // 2. Mark Paid
    await tx.supplierInvoice.update({
      where: { id: invoiceId },
      data: { status: "PAID" }
    })

    return { success: true }
  })
}

// ==========================================
// 3. Monthly Closing
// ==========================================
export async function closeMonth(month: string) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" }

  const startDate = new Date(`${month}-01T00:00:00Z`)
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999)

  const entries = await prisma.ledgerTransaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { account: true }
  })

  const revenue = entries
    .filter(e => e.account.type === "REVENUE")
    .reduce((sum, e) => sum + Number(e.credit) - Number(e.debit), 0)

  const expenses = entries
    .filter(e => e.account.type === "EXPENSE")
    .reduce((sum, e) => sum + Number(e.debit) - Number(e.credit), 0)

  await prisma.monthlySummary.create({
    data: {
      month,
      revenue,
      expenses
    }
  })

  return { success: true, revenue, expenses }
}
