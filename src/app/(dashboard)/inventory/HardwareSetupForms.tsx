import { addFuelType, addTank } from "@/features/inventory/actions"
import { addPump } from "@/features/shifts/actions"
import { Input } from "@/components/ui/input"
import { Droplets, Plus, Gauge } from "lucide-react"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

export default function HardwareSetupForms({ fuelTypes, tanks }: { fuelTypes: any[], tanks: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">

      {/* Step 1: Register Fuel Grade */}
      <ActionForm action={addFuelType} successMessage="Fuel grade registered successfully." className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">
          1. Register Fuel Grade
        </h4>
        <div className="space-y-1">
          <Input type="text" name="name" placeholder="Grade Name (e.g. Super 98)" required />
        </div>
        <div className="space-y-1">
          <Input type="text" name="code" placeholder="Grade Code (e.g. S98)" required />
        </div>
        <div className="space-y-1">
          <Input type="number" step="0.01" name="price" placeholder="Unit Price per Liter (SAR)" required />
        </div>
        <SubmitButton variant="outline" className="w-full mt-2">
          <Plus className="w-4 h-4 mr-2" /> Register Fuel Grade
        </SubmitButton>
      </ActionForm>

      {/* Step 2: Register Fuel Tank */}
      <ActionForm action={addTank} successMessage="Fuel tank registered successfully." className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">
          2. Register Fuel Tank
        </h4>
        <Input type="text" name="name" placeholder="Tank Name (e.g. Tank A)" required />
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" name="capacity" placeholder="Capacity (L)" required />
          <Input type="number" name="initialVolume" placeholder="Current Stock (L)" required />
        </div>
        <select name="fuelTypeId" className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium transition-all" required>
          <option value="">Select Fuel Grade...</option>
          {fuelTypes.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <SubmitButton variant="secondary" className="w-full mt-2">
          <Droplets className="w-4 h-4 mr-2 text-blue-500" /> Register Fuel Tank
        </SubmitButton>
      </ActionForm>

      {/* Step 3: Register Dispensing Pump */}
      <ActionForm action={addPump} successMessage="Dispensing pump registered successfully." className="space-y-4">
        <h4 className="font-bold text-sm tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-3">
          3. Register Dispensing Pump
        </h4>
        <Input type="text" name="name" placeholder="Pump Name (e.g. Pump 1)" required />
        <select name="tankId" className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium transition-all" required>
          <option value="">Connect to Fuel Tank...</option>
          {tanks.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.fuelType.code})</option>)}
        </select>
        <SubmitButton variant="default" className="w-full mt-2 bg-slate-900 border text-white">
          <Gauge className="w-4 h-4 mr-2" /> Register Pump
        </SubmitButton>
      </ActionForm>

    </div>
  )
}
