"use client"

import { useState } from "react"
import { openShift, closeShift } from "@/features/shifts/actions"
import { PlayCircle, StopCircle, Fuel, Loader2, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function OpenShiftForms({ pumps }: { pumps: any[] }) {
  const [loadings, setLoadings] = useState<Record<string, boolean>>({})

  const handleOpen = async (formData: FormData, pumpId: string) => {
    setLoadings(prev => ({ ...prev, [pumpId]: true }))
    try {
      if (!formData.get("openingMeter")) {
        throw new Error("Please enter opening meter")
      }
      formData.append("pumpId", pumpId)
      await openShift(formData)
      toast.success("Shift Opened Successfully!")
    } catch (e: any) {
      toast.error(e.message || "Error opening shift")
    } finally {
      setLoadings(prev => ({ ...prev, [pumpId]: false }))
    }
  }

  return (
    <Card className="shadow-xl">
       <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
         <CardTitle className="flex items-center gap-2 text-xl font-black">
           <PlayCircle className="text-emerald-500 w-5 h-5" /> Start New Shift
         </CardTitle>
         <CardDescription>Select a pump and enter starting reading to begin.</CardDescription>
       </CardHeader>
       <CardContent className="pt-8">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {pumps.map((pump: any) => (
             <form action={(d) => handleOpen(d, pump.id)} key={pump.id} className="relative group cursor-default">
               <div className={`w-full text-left bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-6 rounded-3xl transition-all relative overflow-hidden ${pump.status === 'ACTIVE' ? 'hover:border-emerald-500 hover:shadow-lg' : 'opacity-50'}`}>
                 {pump.status !== "ACTIVE" && (
                   <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                     <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">{pump.status}</span>
                   </div>
                 )}
                 <Fuel className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-4 group-hover:text-emerald-500 transition-colors" />
                 <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">{pump.name}</h3>
                 <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-2">{pump.tank.fuelType.name}</p>
                 
                 {/* Input for Mobile-friendly / Manual Start */}
                 <div className="mt-6 space-y-2 relative z-20">
                   <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Starting Meter (Liters)</label>
                   <Input 
                     type="number" 
                     name="openingMeter"
                     required
                     step="0.01"
                     placeholder={pump.meterReading.toString()}
                     defaultValue={pump.meterReading.toString()}
                     className="font-mono font-bold text-base bg-slate-50" 
                     disabled={pump.status !== "ACTIVE" || loadings[pump.id]}
                     onClick={(e) => e.stopPropagation()} /* Prevents any native event bubbling overriding touches */
                     onTouchStart={(e) => e.stopPropagation()}
                   />
                   <Button 
                     type="submit" 
                     className="w-full mt-2 font-bold uppercase tracking-widest"
                     disabled={pump.status !== "ACTIVE" || loadings[pump.id]}
                   >
                     {loadings[pump.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Shift"}
                   </Button>
                 </div>
               </div>
             </form>
           ))}
           {pumps.length === 0 && (
             <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
               <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No pumps configured in inventory.</p>
             </div>
           )}
         </div>
       </CardContent>
    </Card>
  )
}

export function CloseShiftForm({ activeShift }: { activeShift: any }) {
  const [loading, setLoading] = useState(false)

  const handleClose = async (formData: FormData) => {
    setLoading(true)
    try {
      formData.append("shiftId", activeShift.id)
      await closeShift(formData)
      toast.success("Shift Closed Successfully!")
    } catch (e: any) {
      toast.error(e.message || "Error closing shift")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-t-4 border-t-blue-500 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 bg-blue-500 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Active Shift
      </div>
      
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-8">
        <CardTitle className="text-3xl font-black">{activeShift.pump.name}</CardTitle>
        <CardDescription className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Dispensing: <span className="text-blue-600 dark:text-blue-400">{activeShift.pump.tank.fuelType.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">Opening Meter</span>
            <span className="font-mono text-3xl font-black text-slate-700 dark:text-slate-300">
              {activeShift.openingMeter.toLocaleString()} L
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 mb-2 flex items-center gap-2">
              <TrendingDown className="w-3 h-3" /> System Expected Closing Meter
            </span>
            <span className="font-mono text-3xl font-black text-blue-600 dark:text-blue-400 block">
              {(activeShift.openingMeter + activeShift.expectedLiters).toLocaleString()} L
            </span>
            <span className="text-xs font-bold text-slate-400 mt-2 block">
              Based on {activeShift.expectedLiters.toLocaleString()}L tracked recorded sales.
            </span>
          </div>
        </div>

        <form action={handleClose} className="bg-rose-50/50 dark:bg-rose-900/10 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/50">
          <h3 className="font-black text-rose-900 dark:text-rose-400 mb-4 flex items-center gap-2">
            <StopCircle className="w-5 h-5" /> End Shift & Reconcile
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Physical Final Meter Reading (Liters)</label>
                <Input 
                  type="number" 
                  name="closingMeter" 
                  step="0.01"
                  required 
                  placeholder={((activeShift.openingMeter + activeShift.expectedLiters)).toString()}
                  className="h-16 text-2xl font-mono border-rose-200 focus-visible:ring-rose-500 dark:bg-slate-950 dark:border-rose-900 z-20 relative"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                />
             </div>
             <Button type="submit" variant="destructive" disabled={loading} className="h-16 px-8 rounded-xl font-bold uppercase tracking-widest w-full md:w-auto shrink-0 shadow-lg shadow-rose-900/20 z-20 relative">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit & Close Shift"}
             </Button>
          </div>
        </form>

      </CardContent>
    </Card>
  )
}
