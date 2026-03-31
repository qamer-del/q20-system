"use client"

import { Printer } from "lucide-react"

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
    >
       <Printer className="w-5 h-5" /> Print A4
    </button>
  )
}
