import { prisma } from "@/lib/prisma"
import { addFuelType, addTank, reconcileTank, deleteTank } from "@/features/inventory/actions"
import { Droplets, AlertTriangle, Layers, Plus, Trash2 } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import DeleteTankButton from "./DeleteTankButton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function InventoryPage() {
  const dict = await getTranslation()
  const fuelTypes = await prisma.fuelType.findMany()
  const tanks = await prisma.tank.findMany({
    include: { fuelType: true }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
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
                    <span className="font-bold text-slate-400">{tank.capacity.toLocaleString()} L MAX</span>
                  </div>

                  <form action={reconcileTank} className="mt-8 flex gap-3 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 relative">
                    <input type="hidden" name="tankId" value={tank.id} />
                    <Input 
                      type="number" 
                      name="actualVolume" 
                      placeholder="Physical Reading (Liters)" 
                      className="flex-1 font-mono tracking-wider bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 font-bold"
                      required
                    />
                    <Button type="submit" variant="outline" className="shrink-0 uppercase tracking-widest text-xs h-12">
                      Reconcile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* --- SYSTEM SETUP FORMS (Usually hidden in a modal, shown here for testing) --- */}
        <div className="pt-12">
           <Card className="border-t-4 border-t-slate-800 dark:border-t-slate-700">
             <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
               <CardTitle>Hardware Registry</CardTitle>
               <CardDescription>Install new underground tanks and map exact fuel variants.</CardDescription>
             </CardHeader>

             <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
               
               <form action={addFuelType} className="space-y-5">
                 <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">1. Add Fuel Grade</h4>
                 <Input type="text" name="name" placeholder="Name (e.g. Super 98)" required />
                 <Input type="text" name="code" placeholder="Code (e.g. S98)" required />
                 <Input type="number" step="0.01" name="price" placeholder="Price per Liter (SAR)" required />
                 <Button type="submit" variant="primary" className="w-full mt-2"><Plus className="w-5 h-5 mr-2" /> Register Fuel Grade</Button>
               </form>

               <form action={addTank} className="space-y-5">
                 <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">2. {(dict.Inventory as any).add_tank}</h4>
                 <Input type="text" name="name" placeholder={(dict.Inventory as any).tank_name} required />
                 <div className="grid grid-cols-2 gap-3">
                    <Input type="number" name="capacity" placeholder={(dict.Inventory as any).capacity} required />
                    <Input type="number" name="initialVolume" placeholder={(dict.Inventory as any).current_volume} required />
                 </div>
                 <select name="fuelTypeId" className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all" required>
                   <option value="">Select a Fuel Grade...</option>
                   {fuelTypes.map((f: any) => <option key={f.id} value={f.id}>{f.name} - SAR {f.pricePerLiter}/L</option>)}
                 </select>
                 <Button type="submit" variant="secondary" className="w-full mt-2"><Droplets className="w-5 h-5 mr-2" /> Register Tank</Button>
               </form>

             </CardContent>
           </Card>
        </div>

      </div>
    </div>
  )
}
