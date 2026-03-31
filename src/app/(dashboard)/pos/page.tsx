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

  // Fetch all tanks so the cashier can select which pump they are selling petrol from
  const tanks = await prisma.tank.findMany({
    include: { fuelType: true }
  })

  // Start with an empty POS if there's no tanks set up yet
  if (tanks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <p className="text-xl font-bold dark:text-white">No Pumps Available</p>
          <p className="text-slate-500 mt-2">Please ask an Admin to set up Underground Tanks in the Inventory tab first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto lg:mt-6">
        <PosClient tanks={tanks} />
      </div>
    </div>
  )
}
