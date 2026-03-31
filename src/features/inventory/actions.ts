"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

// ------------------------------------
// 1. Create a new Fuel Type (e.g., Diesel)
// ------------------------------------
export async function addFuelType(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.fuelType.create({
    data: {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      pricePerLiter: parseFloat(formData.get("price") as string),
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
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.tank.create({
    data: {
      name: formData.get("name") as string,
      capacity: parseFloat(formData.get("capacity") as string),
      currentVolume: parseFloat(formData.get("initialVolume") as string),
      fuelTypeId: formData.get("fuelTypeId") as string,
    }
  })

  revalidatePath("/inventory")
}

// ------------------------------------
// 3. Reconcile Tank (Fix Discrepancies)
// ------------------------------------
export async function reconcileTank(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT") {
    throw new Error("Unauthorized")
  }

  const tankId = formData.get("tankId") as string
  const actualPhysicalVolume = parseFloat(formData.get("actualVolume") as string)

  const tank = await prisma.tank.findUnique({ where: { id: tankId }})
  if (!tank) throw new Error("Tank not found")
  
  const discrepancy = actualPhysicalVolume - tank.currentVolume

  // 1. Update Tank
  await prisma.tank.update({
    where: { id: tankId },
    data: { currentVolume: actualPhysicalVolume }
  })

  // 2. Log exactly who did this reconciliation for Audit
  await prisma.activityLog.create({
    data: {
      userId: session.user.id as string,
      action: "RECONCILED_TANK",
      details: `Tank ${tank.name}. Expected: ${tank.currentVolume}L. Actual: ${actualPhysicalVolume}L. Discrepancy: ${discrepancy}L.`
    }
  })

  revalidatePath("/inventory")
}

// ------------------------------------
// 4. Delete Tank (Safe Removal)
// ------------------------------------
export async function deleteTank(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized")

  const tankId = formData.get("tankId") as string

  const tank = await prisma.tank.findUnique({ where: { id: tankId } })
  if (!tank) throw new Error("Tank not found")

  // Safety Lock: Prevent deleting un-empty tanks to protect financial records
  if (tank.currentVolume > 0) {
    throw new Error(`Safety Violation: Cannot delete a tank holding ${tank.currentVolume}L. Disperse or reconcile fuel to 0L first.`)
  }

  // Delete the physical tank
  await prisma.tank.delete({
    where: { id: tankId }
  })

  // Audit
  await prisma.activityLog.create({
    data: {
      userId: session.user.id as string,
      action: "DELETED_TANK",
      details: `Deleted empty tank: ${tank.name} (Capacity: ${tank.capacity}L)`
    }
  })

  revalidatePath("/inventory")
}
