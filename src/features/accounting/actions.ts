"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { roundSAR } from "@/lib/financial"

/**
 * INTERNAL HELPER: Get an account by code, or create it if it doesn't exist.
 * This ensures system accounts like "Cash", "Bank", "Employee Receivables" etc. are always available.
 */
export async function getOrCreateAccount(code: string, name: string, type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE", tx?: any) {
  const p = tx || prisma
  let account = await p.account.findUnique({ where: { code } })
  if (!account) {
    account = await p.account.create({
      data: { code, name, type }
    })
  }
  return account
}

/**
 * INTERNAL HELPER: Create a double-entry journal record between two accounts.
 */
export async function createInternalJournalEntry({ 
  description, 
  debitAccountCode, 
  creditAccountCode, 
  amount,
  tx 
}: { 
  description: string, 
  debitAccountCode: string, 
  creditAccountCode: string, 
  amount: number,
  tx?: any
}) {
  const p = tx || prisma
  const rounded = roundSAR(amount)
  
  // We don't specify names/types here, assuming they are either existing or 
  // we catch errors if someone tries to use a code that doesn't exist and we didn't pre-seed it.
  // For safety, we'll use findUnique.
  const drAcc = await p.account.findUnique({ where: { code: debitAccountCode } })
  const crAcc = await p.account.findUnique({ where: { code: creditAccountCode } })

  if (!drAcc || !crAcc) {
    console.error(`Accounting Error: Missing accounts. DR:${debitAccountCode} (${!!drAcc}), CR:${creditAccountCode} (${!!crAcc})`)
    throw new Error(`Accounting accounts missing: ${!drAcc ? debitAccountCode : ''} ${!crAcc ? creditAccountCode : ''}`)
  }

  return await p.journalEntry.create({
    data: {
      description,
      transactions: {
        create: [
          { accountId: drAcc.id, debit: rounded, credit: 0 },
          { accountId: crAcc.id, debit: 0, credit: rounded }
        ]
      }
    }
  })
}


// =============================================
// 1. Create Ledger Account — with Validation
// =============================================
export async function addAccount(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER") throw new Error("Unauthorized")

  const code = (formData.get("code") as string)?.trim()
  const name = (formData.get("name") as string)?.trim()
  const type = formData.get("type") as string

  let actualType = type
  let parentAccountId = null

  if (type === "BANK_ACCOUNT") {
    actualType = "ASSET"
    let mainBank = await prisma.account.findUnique({ where: { code: "1002" } })
    if (!mainBank) {
      mainBank = await prisma.account.create({
        data: { code: "1002", name: "Main Bank Account", type: "ASSET" }
      })
    }
    parentAccountId = mainBank.id
  }

  // Validation
  if (!code || code.length < 2) throw new Error("Account code is required (min 2 characters).")
  if (!name || name.length < 2) throw new Error("Account name is required (min 2 characters).")
  if (!["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(actualType)) {
    throw new Error("Invalid account type.")
  }

  // Check for duplicate code
  const existing = await prisma.account.findUnique({ where: { code } })
  if (existing) throw new Error(`Account code "${code}" already exists (${existing.name}). Use a different code.`)

  await prisma.account.create({
    data: { code, name, type: actualType as any, parentAccountId }
  })

  // Audit
  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id,
      action: "ACCOUNT_CREATED",
      details: `Created ledger account: ${code} — ${name} (${type})`
    }
  })

  revalidatePath("/accounting")
}

// =============================================
// 2. Post Manual Journal Entry — with Balance Validation
// =============================================
export async function postJournalEntry(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER") throw new Error("Unauthorized")

  const description = (formData.get("description") as string)?.trim()
  const debitAccountId = formData.get("debitAccountId") as string
  const creditAccountId = formData.get("creditAccountId") as string
  const amountStr = formData.get("amount") as string

  // Validation
  if (!description || description.length < 3) throw new Error("Description is required (min 3 characters).")
  if (!debitAccountId) throw new Error("Please select a Debit account.")
  if (!creditAccountId) throw new Error("Please select a Credit account.")

  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) throw new Error("Amount must be a positive number.")
  if (amount > 9999999) throw new Error("Amount exceeds maximum limit.")

  const roundedAmount = roundSAR(amount)
  if (debitAccountId === creditAccountId) throw new Error("Cannot debit and credit the same account.")

  // Verify accounts exist
  const debitAccount = await prisma.account.findUnique({ where: { id: debitAccountId }, include: { childAccounts: true } })
  const creditAccount = await prisma.account.findUnique({ where: { id: creditAccountId }, include: { childAccounts: true } })
  if (!debitAccount) throw new Error("Debit account not found.")
  if (!creditAccount) throw new Error("Credit account not found.")

  if (debitAccount.childAccounts.length > 0) throw new Error(`Cannot post directly to an aggregate parent account (${debitAccount.name}). Select a specific sub-account.`)
  if (creditAccount.childAccounts.length > 0) throw new Error(`Cannot post directly to an aggregate parent account (${creditAccount.name}). Select a specific sub-account.`)

  await prisma.journalEntry.create({
    data: {
      description: `Manual Entry: ${description}`,
      transactions: {
        create: [
          { accountId: debitAccountId, debit: roundedAmount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: roundedAmount }
        ]
      }
    }
  })

  // Audit
  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id,
      action: "JOURNAL_ENTRY_POSTED",
      details: `Manual JE: "${description}" — DR ${debitAccount.code} ${debitAccount.name} / CR ${creditAccount.code} ${creditAccount.name} — SAR ${roundedAmount.toFixed(2)}`
    }
  })

  revalidatePath("/accounting")
  revalidatePath("/dashboard")
  revalidatePath("/reporting")
}
