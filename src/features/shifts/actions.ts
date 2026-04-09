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
  if (!session?.user || !["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
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
  if (!session?.user) throw new Error("Unauthorized")

  const pumpId = formData.get("pumpId") as string
  if (!pumpId) throw new Error("Please select a pump")

  const openingMeterStr = formData.get("openingMeter") as string
  const openingMeter = parseFloat(openingMeterStr)
  if (isNaN(openingMeter) || openingMeter < 0) {
    throw new Error("Please enter a valid starting meter reading.")
  }

  // Check if pump is already in use by another active shift
  const existingShift = await prisma.shift.findFirst({
    where: { pumpId, status: "OPEN" }
  })

  if (existingShift) {
    throw new Error("This pump is already in use by an active shift.")
  }

  const pump = await prisma.pump.findUnique({ where: { id: pumpId } })
  if (!pump) throw new Error("Pump not found")
  if (pump.status !== "ACTIVE") throw new Error("Pump is disabled or in maintenance")

  await prisma.$transaction(async (tx: any) => {
    // 1. Create Shift
    await tx.shift.create({
      data: {
        userId: (session as any).user.id,
        pumpId: pump.id,
        openingMeter,
        expectedLiters: 0,
        status: "OPEN"
      }
    })

    // 2. Set Pump's actual master meter to this manually inputted meter
    await tx.pump.update({
      where: { id: pumpId },
      data: { meterReading: openingMeter }
    })

    // 3. Log
    await tx.activityLog.create({
      data: {
        userId: (session as any).user.id,
        action: "SHIFT_OPENED",
        details: `Started shift on ${pump.name} at manual meter ${openingMeter}L`
      }
    })
  })

  revalidatePath("/shifts")
}

export async function closeShift(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const shiftId = formData.get("shiftId") as string
  const physicalClosingMeter = parseFloat(formData.get("closingMeter") as string)

  if (isNaN(physicalClosingMeter)) throw new Error("Invalid meter reading")

  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { pump: true } })
  if (!shift || shift.status !== "OPEN") throw new Error("Active shift not found")

  // The actual dispensed amount based on physical pump numbers
  const actualLiters = physicalClosingMeter - shift.openingMeter

  if (actualLiters < 0) {
    throw new Error(`Closing meter cannot be lower than opening meter (${shift.openingMeter}L).`)
  }

  await prisma.$transaction(async (tx: any) => {
    // 1. Close the shift
    await tx.shift.update({
      where: { id: shift.id },
      data: {
        status: "CLOSED",
        closingMeter: physicalClosingMeter,
        actualLiters: actualLiters,
        closedAt: new Date(),
      }
    })

    // 2. Update Pump's master lifetime meter to the new number
    await tx.pump.update({
      where: { id: shift.pumpId },
      data: { meterReading: physicalClosingMeter }
    })

    // 3. Log it
    await tx.activityLog.create({
       data: {
         userId: (session as any).user.id,
         action: "SHIFT_CLOSED",
         details: `Closed shift on ${shift.pump.name}. Expected System Dispensed: ${shift.expectedLiters}L. Actual Physical Dispensed: ${actualLiters}L. Discrepancy: ${actualLiters - shift.expectedLiters}L.`
       }
    })
  })

  revalidatePath("/shifts")
}
