import { addFuelType, addTank } from "@/features/inventory/actions"
import { addPump } from "@/features/shifts/actions"
import { Input } from "@/components/ui/input"
import { Droplets, Plus } from "lucide-react"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

export default function HardwareSetupForms({ fuelTypes, tanks }: { fuelTypes: any[], tanks: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
      <ActionForm action={addFuelType} successMessage="Fuel grade registered!" className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">1. Add Fuel Grade</h4>
        <Input type="text" name="name" placeholder="Name (e.g. Super 98)" required />
        <Input type="text" name="code" placeholder="Code (e.g. S98)" required />
        <Input type="number" step="0.01" name="price" placeholder="Price per Liter (SAR)" required />
        <SubmitButton variant="outline" className="w-full mt-2">
          <Plus className="w-4 h-4 mr-2" /> Register Grade
        </SubmitButton>
      </ActionForm>

      <ActionForm action={addTank} successMessage="Underground tank added!" className="space-y-4">
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
        <SubmitButton variant="secondary" className="w-full mt-2">
          <Droplets className="w-4 h-4 mr-2 text-blue-500" /> Register Tank
        </SubmitButton>
      </ActionForm>

      <ActionForm action={addPump} successMessage="Pump connected to framework!" className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">3. Add Terminal Pump</h4>
        <Input type="text" name="name" placeholder="Pump Designation (e.g. Pump 1)" required />
        <select name="tankId" className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium transition-all" required>
          <option value="">Connect to Tank...</option>
          {tanks.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.fuelType.code})</option>)}
        </select>
        <SubmitButton variant="default" className="w-full mt-2 bg-slate-900 border text-white">
          <Droplets className="w-4 h-4 mr-2" /> Register Pump
        </SubmitButton>
      </ActionForm>
    </div>
  )
}
