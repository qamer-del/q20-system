"use client"

import { useState } from "react"
import { editSupplier } from "@/features/purchases/actions"
import { Building2, Save, X, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function VendorRow({ supplier }: { supplier: { id: string, name: string, vatNumber: string | null, contactInfo: string | null } }) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <form action={editSupplier} onSubmit={() => setIsEditing(false)} className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 rounded-xl space-y-3 shadow-inner">
        <input type="hidden" name="id" value={supplier.id} />
        <div className="grid grid-cols-2 gap-3">
          <Input name="name" defaultValue={supplier.name} required className="bg-white dark:bg-slate-900 h-10" />
          <Input name="vatNumber" defaultValue={supplier.vatNumber || ""} required className="bg-white dark:bg-slate-900 h-10 font-mono text-sm" />
        </div>
        <div className="flex gap-2 pt-1 border-t border-blue-100 dark:border-blue-900/50 pt-3">
          <Button type="submit" variant="primary" className="h-8 text-xs px-3"><Save className="w-3 h-3 mr-1" /> Save</Button>
          <Button type="button" variant="outline" className="h-8 text-xs px-3" onClick={() => setIsEditing(false)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 px-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
      <div className="flex items-center gap-3">
        <Building2 className="w-4 h-4 text-slate-400" />
        <div>
          <p className="font-bold text-sm text-slate-900 dark:text-white">{supplier.name}</p>
          <p className="text-[10px] font-mono text-slate-500">VAT: {supplier.vatNumber}</p>
        </div>
      </div>
      <Button type="button" variant="outline" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
        <Edit2 className="w-3 h-3 text-slate-500" />
      </Button>
    </div>
  )
}
