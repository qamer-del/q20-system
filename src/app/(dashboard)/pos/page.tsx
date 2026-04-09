import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PosClient from "./PosClient"

export default async function PosPage() {
  const session = await auth()
  
  // @ts-ignore
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
    redirect("/dashboard")
  }

  // Cashiers must now run sales through a specific opened Shift on a specific Pump
  const activeShift = await prisma.shift.findFirst({
    where: { userId: (session as any).user.id, status: "OPEN" },
    include: { pump: { include: { tank: { include: { fuelType: true } } } } }
  })

  // Start with an empty POS if there's no active shift
  if (!activeShift) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-lg border-2 border-slate-100 dark:border-slate-800">
          <p className="text-2xl font-black text-slate-900 dark:text-white">No Active Shift Found</p>
          <p className="text-slate-500 font-medium leading-relaxed my-4">You cannot dispense fuel or authorize POS transactions until you open a secure shift on an active pump.</p>
          <a href="/shifts" className="inline-block mt-4 bg-emerald-500 text-white font-bold tracking-widest uppercase text-sm px-8 py-4 rounded-xl shadow-lg hover:bg-emerald-600 transition-colors">
            Go to Shift Control
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <PosClient activeShift={activeShift} />
      </div>
    </div>
  )
}
