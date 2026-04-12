"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

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
    await tx.employeeLiability.create({
      data: {
        userId: shift.userId,
        shiftId: shift.id,
        amount: shortageAmount,
        reason,
        status: "PENDING"
      }
    })

    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "LIABILITY_ASSIGNED",
        details: `Assigned liability of SAR ${shortageAmount.toFixed(2)} to ${shift.user.name} for shift on ${shift.pump.name}.`
      }
    })
  })

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
    await tx.employeeLiability.update({
      where: { id: liabilityId },
      data: {
        status: newStatus,
        notes: notes || undefined,
        settledAt: ["SETTLED", "WAIVED", "SALARY_DEDUCTION"].includes(newStatus) ? new Date() : null
      }
    })

    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "LIABILITY_UPDATED",
        details: `Updated liability status to ${newStatus} for ${liability.user.name}. ${notes ? `Notes: ${notes}` : ""}`
      }
    })
  })

  revalidatePath("/liabilities")
  revalidatePath("/shifts")
  return { success: true }
}
