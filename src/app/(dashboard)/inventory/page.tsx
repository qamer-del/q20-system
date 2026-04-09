import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { reconcileTank, deleteTank } from "@/features/inventory/actions"
import { Droplets, AlertTriangle, Layers, Plus, Trash2 } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import DeleteTankButton from "./DeleteTankButton"
import HardwareSetupForms from "./HardwareSetupForms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function InventoryPage() {
  await protectRoute(["ADMIN", "MANAGER"])
  const dict = await getTranslation()
  const fuelTypes = await prisma.fuelType.findMany()
  const tanks = await prisma.tank.findMany({
    include: { fuelType: true }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
          <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-3 md:gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 rounded-2xl">
              <Layers className="w-8 h-8" />
            </div>
            {(dict.Inventory as any).title}
          </h1>
        </div>

        {/* --- TANK DASHBOARD --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {tanks.map((tank: any) => {
            const fillPercentage = (tank.currentVolume / tank.capacity) * 100
            const isLowStock = fillPercentage < 15

            return (
              <Card key={tank.id} className={`overflow-hidden border-t-8 transition-shadow hover:shadow-lg ${isLowStock ? 'border-t-rose-500' : 'border-t-emerald-500'}`}>
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-wide flex items-center gap-3">
                        {tank.name}
                      </CardTitle>
                      <CardDescription className="font-bold text-slate-500 tracking-widest uppercase text-xs mt-2">
                        {tank.fuelType.name} ({tank.fuelType.code})
                      </CardDescription>
                    </div>
                    {isLowStock ? (
                      <span className="bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900 dark:text-rose-400 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                        <AlertTriangle className="w-4 h-4" /> {(dict.Inventory as any).low_stock}
                      </span>
                    ) : (
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-400 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full shadow-sm">
                        {(dict.Inventory as any).safe}
                      </span>
                    )}

                    {/* DELETE TANK ACTION */}
                    <DeleteTankButton tankId={tank.id} />
                  </div>
                </CardHeader>

                <CardContent className="pt-8">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${isLowStock ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex font-mono text-sm justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{tank.currentVolume.toLocaleString()} L</span>
                    <span className="font-bold text-slate-400">{tank.capacity.toLocaleString()} L {(dict.Inventory as any).max}</span>
                  </div>

                  <ActionForm action={reconcileTank} successMessage="Inventory reconciled successfully!" className="mt-8 flex gap-3 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 relative">
                    <input type="hidden" name="tankId" value={tank.id} />
                    <Input
                      type="number"
                      name="actualVolume"
                      placeholder={(dict.Inventory as any).physical_reading}
                      className="flex-1 font-mono tracking-wider bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 font-bold"
                      required
                    />
                    <SubmitButton variant="outline" className="shrink-0 uppercase tracking-widest text-xs h-12">
                      {(dict.Inventory as any).reconcile}
                    </SubmitButton>
                  </ActionForm>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* --- SYSTEM SETUP FORMS (Usually hidden in a modal, shown here for testing) --- */}
        <div className="pt-12">
          <Card className="border-t-4 border-t-slate-800 dark:border-t-slate-700">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle>{(dict.Inventory as any).hardware_registry}</CardTitle>
              <CardDescription>{(dict.Inventory as any).hardware_desc}</CardDescription>
            </CardHeader>

// ...
            <CardContent className="pt-8">
              <HardwareSetupForms fuelTypes={fuelTypes} tanks={tanks} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
