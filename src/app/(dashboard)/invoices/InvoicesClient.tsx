"use client"

import { useState } from "react"
import { Search, SortAsc, Calendar, DollarSign, QrCode } from "lucide-react"
import InvoiceCard from "./InvoiceCard"

export default function InvoicesClient({ initialSales }: { initialSales: any[] }) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")

  const filteredSales = initialSales.filter((sale) => {
    const searchLower = search.toLowerCase()
    return (
      sale.invoiceNumber.toLowerCase().includes(searchLower) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchLower)) ||
      (sale.user?.name && sale.user.name.toLowerCase().includes(searchLower))
    )
  })

  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sortBy === "amount") {
      return b.totalAmount - a.totalAmount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-6">
      {/* Search & Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900/50 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice # or cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => setSortBy("date")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                sortBy === "date" 
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Calendar className="w-3 h-3" />
              Date
            </button>
            <button
              onClick={() => setSortBy("amount")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                sortBy === "amount" 
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <DollarSign className="w-3 h-3" />
              Amount
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center px-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Showing {sortedSales.length} Invoices
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sortedSales.map((sale) => (
          <InvoiceCard key={sale.id} sale={sale} />
        ))}

        {sortedSales.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4">
              <QrCode className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No Invoices Found</p>
            <p className="text-slate-500 mt-2 text-sm max-w-sm text-center">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
