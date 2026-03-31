"use client"

import { deleteTank } from "@/features/inventory/actions"
import { Trash2 } from "lucide-react"

export default function DeleteTankButton({ tankId }: { tankId: string }) {
  return (
    <form 
      action={deleteTank} 
      className="ml-3" 
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to delete this tank? This cannot be undone.")) {
           e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="tankId" value={tankId} />
      <button 
        type="submit" 
        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" 
        title="Delete Tank"
      >
         <Trash2 className="w-4 h-4" />
      </button>
    </form>
  )
}
