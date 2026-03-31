"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

// Mocks the official API connection to the ZATCA Saudi Fatoora portal
export async function submitInvoiceToZatca(invoiceId: string) {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized")
  }

  // Simulate network latency to the Government Portal (1.5 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500))

  const sale = await prisma.sale.findUnique({ where: { id: invoiceId } })
  if (!sale) throw new Error("Invoice not found")

  // Generate a mock Official ZATCA Clearance Hash (Cryptographic Seal)
  const officialSeal = `ZATCA-CLEARED-${Date.now().toString(16).toUpperCase()}`

  // Update our local invoice database with the government's clearance seal
  await prisma.sale.update({
    where: { id: invoiceId },
    data: { zatcaHash: officialSeal }
  })

  revalidatePath("/invoices")
}
