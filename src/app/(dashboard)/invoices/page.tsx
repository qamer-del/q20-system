import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { QrCode } from "lucide-react"
import InvoicesClient from "./InvoicesClient"

export default async function ZatcaInvoicesPage() {
  await protectRoute(["ADMIN", "MANAGER", "CASHIER"])
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      items: { include: { fuelType: true } },
      user: true
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <QrCode className="w-8 h-8" />
            </div>
            ZATCA Invoices
          </h1>
          <span className="bg-emerald-900/10 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest">
            PHASE 2 COMPLIANT
          </span>
        </div>

        <InvoicesClient initialSales={sales} />

      </div>
    </div>
  )
}
