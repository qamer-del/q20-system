"use client"

import { Menu } from "lucide-react"
import { useState } from "react"
import Sidebar from "./Sidebar"

export default function MobileHeader({ role = "CASHIER" }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="lg:hidden flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 relative overflow-hidden">
            <svg className="w-4 h-4 text-white absolute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 0-8 0v4a6 6 0 1 0 11.2 3" />
              <line x1="14" y1="14" x2="19" y2="19" />
            </svg>
          </div>
          <span className="text-white font-black tracking-tighter text-lg">Q20</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative flex w-80 flex-col bg-slate-900 h-full shadow-2xl sidebar-slide rtl:sidebar-slide-rtl">
            <Sidebar mobile role={role} />
          </div>
        </div>
      )}
    </>
  )
}
