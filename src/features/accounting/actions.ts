"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { AccountType } from "@prisma/client"

// ------------------------------------
// 1. Create a Custom Ledger Account
// ------------------------------------
export async function addAccount(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT") throw new Error("Unauthorized")

  await prisma.account.create({
    data: {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      type: formData.get("type") as AccountType,
    }
  })
  
  revalidatePath("/accounting")
}

// ------------------------------------
// 2. Post Manual Journal Entry (e.g. Paying Salaries, Rent, etc.)
// ------------------------------------
export async function postJournalEntry(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT") throw new Error("Unauthorized")

  const description = formData.get("description") as string
  const debitAccountId = formData.get("debitAccountId") as string
  const creditAccountId = formData.get("creditAccountId") as string
  const amount = parseFloat(formData.get("amount") as string)

  if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount")
  if (debitAccountId === creditAccountId) throw new Error("Cannot debit and credit the same account!")

  await prisma.journalEntry.create({
    data: {
      description: `Manual Entry: ${description}`,
      transactions: {
        create: [
          { accountId: debitAccountId, debit: amount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: amount }
        ]
      }
    }
  })

  // Refresh caching
  revalidatePath("/accounting")
  revalidatePath("/dashboard")
}
