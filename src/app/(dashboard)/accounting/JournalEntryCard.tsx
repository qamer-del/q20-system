"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react"

export default function JournalEntryCard({ journal, dict }: { journal: any, dict: any }) {
  const [open, setOpen] = useState(false)

  // Verify each JE balances
  const jeDebit = journal.transactions.reduce((s: number, t: any) => s + t.debit, 0)
  const jeCredit = journal.transactions.reduce((s: number, t: any) => s + t.credit, 0)
  const jeBalanced = Math.abs(jeDebit - jeCredit) < 0.01

  return (
    <div 
      className={`border rounded-2xl transition-all duration-300 shadow-sm overflow-hidden ${
        jeBalanced 
          ? 'border-slate-200 dark:border-slate-800' 
          : 'border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10'
      }`}
    >
      {/* Header (Collapsed View) */}
      <div 
        className="flex justify-between items-center p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl ${jeBalanced ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
            {jeBalanced ? (
              <span className="font-mono text-[10px] font-black tracking-widest uppercase">JE</span>
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              {journal.description}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest font-bold">
              {new Date(journal.date).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="font-black text-slate-900 dark:text-white">
              SAR {jeDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            {!jeBalanced && (
              <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-black uppercase">
                {dict.Accounting?.unbalanced || "Unbalanced"}
              </span>
            )}
          </div>
          {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded View */}
      <div 
        className={`transition-all duration-500 ease-in-out border-t border-dashed border-slate-100 dark:border-slate-800 p-0 overflow-hidden ${
          open ? "max-h-[1000px] opacity-100 p-6" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-3">
          {journal.transactions.map((t: any, i: number) => (
            <div key={i} className="flex flex-col sm:flex-row justify-between text-sm font-mono tracking-wider items-start sm:items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className={`${t.credit > 0 ? "sm:ml-12 text-rose-600 dark:text-rose-400 font-bold" : "font-black text-emerald-600 dark:text-emerald-400"} flex items-center gap-3`}>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-xs uppercase font-serif font-black">{t.account.code}</span>
                {t.account.name}
              </span>
              <div className="w-full sm:w-64 flex justify-between bg-white dark:bg-slate-950 px-4 py-2 mt-2 sm:mt-0 rounded-lg border border-slate-100 dark:border-slate-800 shadow-inner">
                <span className={t.debit > 0 ? "text-slate-900 dark:text-white font-black" : "text-slate-200 dark:text-slate-800"}>
                  {t.debit > 0 ? t.debit.toFixed(2) : "0.00"}
                </span>
                <span className={t.credit > 0 ? "text-slate-900 dark:text-white font-black" : "text-slate-200 dark:text-slate-800"}>
                  {t.credit > 0 ? t.credit.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
