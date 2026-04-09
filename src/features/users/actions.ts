"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"

export async function createUser(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Only Administrators can create new staff accounts")
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const rawPassword = formData.get("password") as string
  const role = formData.get("role") as "ADMIN" | "MANAGER" | "CASHIER"

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error("A user with this email already exists")

  // Hash the password
  const hashedPassword = await bcrypt.hash(rawPassword, 10)

  await prisma.user.create({
    data: { name, email, password: hashedPassword, role }
  })

  // Log action
  await prisma.activityLog.create({
    data: {
      userId: session.user.id as string,
      action: "CREATED_STAFF",
      details: `Created new ${role} account for ${email}`
    }
  })

  revalidatePath("/users")
}

export async function deleteUser(formData: FormData) {
  const session = await auth()
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Only Administrators can revoke access")
  }

  const targetUserId = formData.get("userId") as string

  if (targetUserId === session.user.id) {
    throw new Error("You cannot delete your own active Admin account!")
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!targetUser) throw new Error("User not found")

  await prisma.user.delete({ where: { id: targetUserId } })

  // Log action
  await prisma.activityLog.create({
    data: {
      userId: session.user.id as string,
      action: "DELETED_STAFF",
      details: `Revoked access and deleted account for ${targetUser.email} (${targetUser.role})`
    }
  })

  revalidatePath("/users")
}
