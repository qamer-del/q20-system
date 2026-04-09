"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

// ==========================================
// PUMP REGISTRY ACTIONS (Admin/Manager)
// ==========================================
export async function addPump(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized")
  }

  const name = formData.get("name") as string
  const tankId = formData.get("tankId") as string

  if (!name || !tankId) throw new Error("Missing required fields")

  await prisma.pump.create({
    data: { name, tankId }
  })

  // Audit
  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id,
      action: "PUMP_CREATED",
      details: `Registered new pump: ${name}`
    }
  })

  revalidatePath("/inventory")
}

// ==========================================
// SHIFT MANAGEMENT (Cashier/Admin)
// ==========================================
export async function openShift(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  const userId = (session?.user as any)?.id
  const pumpId = formData.get("pumpId") as string
  const openingCash = parseFloat(formData.get("openingCash") as string) || 0

  if (!pumpId) return { error: "Please select a pump" }
  if (isNaN(openingCash) || openingCash < 0) return { error: "Please enter valid starting cash." }

  const openingMeterStr = formData.get("openingMeter") as string
  const openingMeter = parseFloat(openingMeterStr)
  if (isNaN(openingMeter) || openingMeter < 0) {
    return { error: "Please enter a valid starting meter reading." }
  }

  // 1. RULE: A user can only have ONE open shift at a time
  const userActiveShift = await prisma.shift.findFirst({
    where: { userId, status: "OPEN" },
    include: { pump: true }
  })

  if (userActiveShift) {
    return { error: `You already have an active shift on ${userActiveShift.pump.name}. Close it before starting a new one.` }
  }

  // 2. RULE: A pump can only have ONE open shift at a time
  const pumpActiveShift = await prisma.shift.findFirst({
    where: { pumpId, status: "OPEN" },
    include: { user: true }
  })

  if (pumpActiveShift) {
    return { error: `This pump is currently being operated by ${pumpActiveShift.user.name}.` }
  }

  const pump = await prisma.pump.findUnique({ where: { id: pumpId } })
  if (!pump) return { error: "Pump not found" }
  if (pump.status !== "ACTIVE") return { error: "Pump is disabled or in maintenance" }

  await prisma.$transaction(async (tx: any) => {
    // 1. Create Shift
    await tx.shift.create({
      data: {
        userId,
        pumpId: pump.id,
        openingMeter,
        openingCash,
        expectedLiters: 0,
        status: "OPEN"
      }
    })

    // 2. Set Pump's actual master meter
    await tx.pump.update({
      where: { id: pumpId },
      data: { meterReading: openingMeter }
    })

    // 3. Log
    await tx.activityLog.create({
      data: {
        userId,
        action: "SHIFT_OPENED",
        details: `Started shift on ${pump.name} at meter ${openingMeter}L with SAR ${openingCash} opening cash.`
      }
    })
  })

  revalidatePath("/shifts")
  return { success: true }
}

export async function closeShift(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" }

  const currentUserId = (session?.user as any)?.id
  const role = (session?.user as any)?.role
  const shiftId = formData.get("shiftId") as string

  const physicalClosingMeter = parseFloat(formData.get("closingMeter") as string)
  const actualCash = parseFloat(formData.get("actualCash") as string) || 0
  const actualBank = parseFloat(formData.get("actualBank") as string) || 0

  if (isNaN(physicalClosingMeter)) return { error: "Invalid meter reading." }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      pump: true,
      user: true,
      sales: true
    }
  })

  if (!shift || shift.status !== "OPEN") return { error: "Active shift not found." }

  // Check visibility/auth
  const isOwner = String(shift.userId) === String(currentUserId)
  const isAuthorizedFull = role === 'ADMIN' || role === 'MANAGER'
  if (!isOwner && !isAuthorizedFull) {
    return { error: "Unauthorized: You can only close your own active shifts." }
  }

  // 1. Sequence Check
  const actualLiters = physicalClosingMeter - shift.openingMeter
  if (actualLiters < 0) {
    return { error: `Closing meter cannot be lower than opening meter (${shift.openingMeter}L).` }
  }

  // 2. Automated Financial Totals
  const expectedCash = shift.sales
    .filter(s => s.paymentMethod === 'CASH')
    .reduce((sum, s) => sum + s.totalAmount, 0)

  const expectedBank = shift.sales
    .filter(s => s.paymentMethod === 'BANK')
    .reduce((sum, s) => sum + s.totalAmount, 0)

  const cashVariance = actualCash - expectedCash
  const bankVariance = actualBank - expectedBank

  await prisma.$transaction(async (tx: any) => {
    // 1. Close & Record Detailed Reconciliation
    await tx.shift.update({
      where: { id: shift.id },
      data: {
        status: "CLOSED",
        closingMeter: physicalClosingMeter,
        actualLiters,
        expectedCash,
        expectedBank,
        actualCash,
        actualBank,
        cashVariance,
        bankVariance,
        closedAt: new Date(),
      }
    })

    // 2. Update Pump lifetime meter
    await tx.pump.update({
      where: { id: shift.pumpId },
      data: { meterReading: physicalClosingMeter }
    })

    // 3. Detailed Audit Trail
    const isOverride = !isOwner
    await tx.activityLog.create({
      data: {
        userId: currentUserId,
        action: "SHIFT_CLOSED",
        details: `${isOverride ? "[OVERRIDE] " : ""}Closed shift for ${shift.user.name} on ${shift.pump.name}. 
          Liter Reconciliation: Expected ${shift.expectedLiters}L, Actual ${actualLiters}L.
          Financial Reconciliation: Cash Var: SAR ${cashVariance}, Bank Var: SAR ${bankVariance}.`
      }
    })
  })

  revalidatePath("/shifts")
  revalidatePath("/dashboard")
  return { success: true }
}
