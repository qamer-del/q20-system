"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { createInternalJournalEntry, getOrCreateAccount } from "../accounting/actions"

// ================================================
// ASSIGN LIABILITY — manually from AdminApprovalCard
// ================================================
export async function assignLiability(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  const role = (session?.user as any)?.role
  if (!["ADMIN", "MANAGER"].includes(role)) {
    return { error: "غير مصرح: يمكن للمدراء فقط تعيين الالتزامات." }
  }

  const shiftId = formData.get("shiftId") as string
  if (!shiftId) return { error: "معرف الوردية مطلوب." }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { user: true, pump: true }
  })

  if (!shift) return { error: "الوردية غير موجودة." }

  const cashVariance = (shift.actualCash ?? 0) - (shift.expectedCash ?? 0)

  if (cashVariance >= 0) {
    return { error: "لا يوجد نقص في النقد لهذه الوردية." }
  }

  // Prevent duplicate liabilities for same shift
  const existing = await prisma.employeeLiability.findFirst({
    where: { shiftId, status: "PENDING" }
  })
  if (existing) {
    return { error: "تم تعيين مسؤولية لهذه الوردية مسبقاً." }
  }

  const shortageAmount = Math.abs(cashVariance)
  const reason = `نقص نقدي في الوردية على ${shift.pump.name} — ${new Date(shift.closedAt ?? shift.openedAt).toLocaleDateString("ar-SA")}`

  await prisma.$transaction(async (tx: any) => {
    // 1. Ensure system accounts exist
    await getOrCreateAccount("1001", "Cash", "ASSET", tx)
    await getOrCreateAccount("1201", "Employee Receivables", "ASSET", tx)

    // 2. Create the Liability Record
    await tx.employeeLiability.create({
      data: {
        userId: shift.userId,
        shiftId: shift.id,
        amount: shortageAmount,
        reason,
        status: "PENDING"
      }
    })

    // 3. Create OverShort Record for audit
    await tx.overShort.create({
      data: {
        shiftId: shift.id,
        type: "SHORTAGE",
        amount: shortageAmount
      }
    })

    // 4. Accounting Entry: (Debit: Employee Receivables, Credit: Cash)
    await createInternalJournalEntry({
      tx,
      description: `Manual Shortage Assignment - Shift #${shift.id}`,
      debitAccountCode: "1201",
      creditAccountCode: "1001",
      amount: shortageAmount
    })

    // 5. Audit Log
    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "LIABILITY_ASSIGNED",
        details: `Assigned manual liability of SAR ${shortageAmount.toFixed(2)} to ${shift.user.name}. Accounting handled.`
      }
    })
  }, { timeout: 10000 })


  revalidatePath("/shifts")
  revalidatePath("/liabilities")
  return { success: true }
}

// ================================================
// UPDATE LIABILITY STATUS
// ================================================
export async function updateLiabilityStatus(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  const role = (session?.user as any)?.role
  if (!["ADMIN", "MANAGER"].includes(role)) {
    return { error: "غير مصرح: يمكن للمدراء فقط تحديث الالتزامات." }
  }

  const liabilityId = formData.get("liabilityId") as string
  const newStatus = formData.get("status") as any
  const notes = formData.get("notes") as string

  if (!liabilityId || !newStatus) return { error: "جميع الحقول المطلوبة غير مكتملة." }

  const liability = await prisma.employeeLiability.findUnique({
    where: { id: liabilityId },
    include: { user: true }
  })

  if (!liability) return { error: "الالتزام غير موجود." }
  if (liability.status !== "PENDING") return { error: "تم اتخاذ إجراء على هذا الالتزام مسبقاً." }

  await prisma.$transaction(async (tx: any) => {
    // 1. Update the Liability Record
    await tx.employeeLiability.update({
      where: { id: liabilityId },
      data: {
        status: newStatus,
        notes: notes || undefined,
        settledAt: ["SETTLED", "WAIVED", "SALARY_DEDUCTION"].includes(newStatus) ? new Date() : null
      }
    })

    // 2. Ensure system accounts exist
    await getOrCreateAccount("1001", "Cash", "ASSET", tx)
    await getOrCreateAccount("1201", "Employee Receivables", "ASSET", tx)
    await getOrCreateAccount("5005", "Over/Short Account", "EXPENSE", tx)
    await getOrCreateAccount("6001", "Salary Expense", "EXPENSE", tx)

    // 3. Automated Accounting Entry based on STATUS
    let description = `Liability Resolution (${newStatus}) - ${liability.user.name}`
    
    if (newStatus === "SETTLED") {
      // Cash Payment: (Debit: Cash, Credit: Employee Receivables)
      await createInternalJournalEntry({
        tx,
        description: `Cash Settlement: ${description}`,
        debitAccountCode: "1001",
        creditAccountCode: "1201",
        amount: liability.amount
      })
    } 
    else if (newStatus === "SALARY_DEDUCTION") {
      // Salary Deduction: (Debit: Salary Expense, Credit: Employee Receivables)
      await createInternalJournalEntry({
        tx,
        description: `Salary Deduction: ${description}`,
        debitAccountCode: "6001",
        creditAccountCode: "1201",
        amount: liability.amount
      })
    }
    else if (newStatus === "WAIVED") {
      // Waiver/Write-off: (Debit: Over/Short Account, Credit: Employee Receivables)
      await createInternalJournalEntry({
        tx,
        description: `Liability Waiver: ${description}`,
        debitAccountCode: "5005",
        creditAccountCode: "1201",
        amount: liability.amount
      })
    }

    // 4. Audit Log
    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "LIABILITY_UPDATED",
        details: `Updated liability status to ${newStatus} for ${liability.user.name}. Accounting handled. Info: ${notes || "None"}`
      }
    })
  }, { timeout: 10000 })


  revalidatePath("/liabilities")
  revalidatePath("/shifts")
  return { success: true }
}
