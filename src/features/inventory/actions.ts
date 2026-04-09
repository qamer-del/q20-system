"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { roundSAR } from "@/lib/financial"

// ------------------------------------
// 1. Create a new Fuel Type
// ------------------------------------
export async function addFuelType(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized: Only Admin can add fuel types.")

  const name = (formData.get("name") as string)?.trim()
  const code = (formData.get("code") as string)?.trim()
  const priceStr = formData.get("price") as string

  if (!name || name.length < 2) throw new Error("Fuel type name is required.")
  if (!code || code.length < 2) throw new Error("Fuel code is required.")

  const price = parseFloat(priceStr)
  if (isNaN(price) || price <= 0) throw new Error("Price must be a positive number.")

  // Check duplicate code
  const existing = await prisma.fuelType.findUnique({ where: { code } })
  if (existing) throw new Error(`Fuel code "${code}" already exists.`)

  await prisma.fuelType.create({
    data: { name, code, pricePerLiter: roundSAR(price) }
  })

  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id,
      action: "FUEL_TYPE_ADDED",
      details: `Added fuel type: ${name} (${code}) — SAR ${price}/L`
    }
  })

  revalidatePath("/inventory")
}

// ------------------------------------
// 2. Add a new Fuel Tank
// ------------------------------------
export async function addTank(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized: Only Admin can add tanks.")

  const name = (formData.get("name") as string)?.trim()
  const fuelTypeId = formData.get("fuelTypeId") as string

  if (!name || name.length < 2) throw new Error("Tank name is required.")
  if (!fuelTypeId) throw new Error("Please select a fuel type.")

  const capacity = parseFloat(formData.get("capacity") as string)
  const initialVolume = parseFloat(formData.get("initialVolume") as string)

  if (isNaN(capacity) || capacity <= 0) throw new Error("Capacity must be a positive number.")
  if (isNaN(initialVolume) || initialVolume < 0) throw new Error("Initial volume must be zero or positive.")
  if (initialVolume > capacity) throw new Error("Initial volume cannot exceed tank capacity.")

  await prisma.tank.create({
    data: { name, capacity, currentVolume: initialVolume, fuelTypeId }
  })

  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id,
      action: "TANK_ADDED",
      details: `Added tank: ${name} (Capacity: ${capacity}L, Initial: ${initialVolume}L)`
    }
  })

  revalidatePath("/inventory")
}

// ------------------------------------
// 3. Reconcile Tank
// ------------------------------------
export async function reconcileTank(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER") {
    throw new Error("Unauthorized")
  }

  const tankId = formData.get("tankId") as string
  const actualStr = formData.get("actualVolume") as string

  if (!tankId) throw new Error("Tank ID is required.")

  const actualPhysicalVolume = parseFloat(actualStr)
  if (isNaN(actualPhysicalVolume) || actualPhysicalVolume < 0) throw new Error("Actual volume must be zero or positive.")

  const tank = await prisma.tank.findUnique({ where: { id: tankId } })
  if (!tank) throw new Error("Tank not found.")

  if (actualPhysicalVolume > tank.capacity) throw new Error(`Volume ${actualPhysicalVolume}L exceeds tank capacity ${tank.capacity}L.`)

  const discrepancy = roundSAR(actualPhysicalVolume - tank.currentVolume)

  await prisma.tank.update({
    where: { id: tankId },
    data: { currentVolume: actualPhysicalVolume }
  })

  await prisma.activityLog.create({
    data: {
      userId: (session as any).user.id as string,
      action: "RECONCILED_TANK",
      details: `Tank ${tank.name}. System: ${tank.currentVolume}L. Physical: ${actualPhysicalVolume}L. Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy}L.`
    }
  })

  revalidatePath("/inventory")
}

// ------------------------------------
// 4. Delete Tank
// ------------------------------------
export async function deleteTank(formData: FormData) {
  try {
    const session = await auth()
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

    const tankId = formData.get("tankId") as string
    if (!tankId) throw new Error("Tank ID is required.")

    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      include: { pumps: true }
    })
    if (!tank) throw new Error("Tank not found.")

    if (tank.currentVolume > 0) {
      return { error: `Safety Violation: Cannot delete a tank holding ${tank.currentVolume}L. Reconcile fuel to 0L first.` }
    }

    if (tank.pumps.length > 0) {
      return { error: `Safety Violation: Cannot delete this tank because it has ${tank.pumps.length} pump(s) connected.` }
    }

    await prisma.tank.delete({ where: { id: tankId } })

    await prisma.activityLog.create({
      data: {
        userId: (session as any).user.id as string,
        action: "DELETED_TANK",
        details: `Deleted empty tank: ${tank.name} (Capacity: ${tank.capacity}L)`
      }
    })

    revalidatePath("/inventory")
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
