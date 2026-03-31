import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10)

    const admin = await prisma.user.upsert({
      where: { email: "admin@station.com" },
      update: {}, // do nothing if it already exists
      create: {
        email: "admin@station.com",
        name: "Super Admin",
        password: hashedPassword,
        role: "ADMIN",
      },
    })

    return NextResponse.json({ 
      message: "Database seeded successfully!", 
      user: { email: admin.email, role: admin.role, password: "password123" } 
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 })
  }
}
