"use client"

import { useState } from "react"
import { addFuelType, addTank, deleteTank } from "@/features/inventory/actions"
import { addPump } from "@/features/shifts/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Droplets, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function HardwareSetupForms({ fuelTypes, tanks }: { fuelTypes: any[], tanks: any[] }) {
  const [loadings, setLoadings] = useState({ fuel: false, tank: false, pump: false })

  const handleAction = async (actionFn: any, formData: FormData, type: 'fuel' | 'tank' | 'pump') => {
    setLoadings(prev => ({ ...prev, [type]: true }))
    try {
      await actionFn(formData)
      toast.success("Added successfully")
    } catch (e: any) {
      toast.error(e.message || "An error occurred")
    } finally {
      setLoadings(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
      <form action={(d) => handleAction(addFuelType, d, 'fuel')} className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">1. Add Fuel Grade</h4>
        <Input type="text" name="name" placeholder="Name (e.g. Super 98)" required />
        <Input type="text" name="code" placeholder="Code (e.g. S98)" required />
        <Input type="number" step="0.01" name="price" placeholder="Price per Liter (SAR)" required />
        <Button type="submit" variant="outline" className="w-full mt-2" disabled={loadings.fuel}>
           {loadings.fuel ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Register Grade</>}
        </Button>
      </form>

      <form action={(d) => handleAction(addTank, d, 'tank')} className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">2. Add Underground Tank</h4>
        <Input type="text" name="name" placeholder="Tank Name" required />
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" name="capacity" placeholder="Capacity (L)" required />
          <Input type="number" name="initialVolume" placeholder="Current (L)" required />
        </div>
        <select name="fuelTypeId" className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium transition-all" required>
          <option value="">Select a Fuel Grade...</option>
          {fuelTypes.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <Button type="submit" variant="secondary" className="w-full mt-2" disabled={loadings.tank}>
          {loadings.tank ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Droplets className="w-4 h-4 mr-2 text-blue-500" /> Register Tank</>}
        </Button>
      </form>

      <form action={(d) => handleAction(addPump, d, 'pump')} className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">3. Add Terminal Pump</h4>
        <Input type="text" name="name" placeholder="Pump Designation (e.g. Pump 1)" required />
        <select name="tankId" className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium transition-all" required>
          <option value="">Connect to Tank...</option>
          {tanks.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.fuelType.code})</option>)}
        </select>
        <Button type="submit" variant="default" className="w-full mt-2 bg-slate-900 border text-white" disabled={loadings.pump}>
          {loadings.pump ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Droplets className="w-4 h-4 mr-2" /> Register Pump</>}
        </Button>
      </form>
    </div>
  )
}
