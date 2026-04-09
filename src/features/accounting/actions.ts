"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { roundSAR } from "@/lib/financial"

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

  // Validation
  if (!code || code.length < 2) throw new Error("Account code is required (min 2 characters).")
  if (!name || name.length < 2) throw new Error("Account name is required (min 2 characters).")
  if (!["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(type)) {
    throw new Error("Invalid account type.")
  }

  // Check for duplicate code
  const existing = await prisma.account.findUnique({ where: { code } })
  if (existing) throw new Error(`Account code "${code}" already exists (${existing.name}). Use a different code.`)

  await prisma.account.create({
    data: { code, name, type: type as any }
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
  const debitAccount = await prisma.account.findUnique({ where: { id: debitAccountId } })
  const creditAccount = await prisma.account.findUnique({ where: { id: creditAccountId } })
  if (!debitAccount) throw new Error("Debit account not found.")
  if (!creditAccount) throw new Error("Credit account not found.")

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
