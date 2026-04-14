"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2, AlertCircle } from "lucide-react"
import { generateFinancialExcel, generateFinancialPDF } from "@/lib/exportReports"
import { toast } from "sonner"

interface ExportMenuProps {
  financialData: {
    stationName: string
    dateGenerated: string
    revenues: any[]
    expenses: any[]
    totalRevenue: number
    totalExpense: number
    netIncome: number
    assets: any[]
    liabilities: any[]
    equities: any[]
    totalAssets: number
    totalLiabilities: number
    totalEquityWithRetained: number
    vatPayable: number
    vatReceivable: number
    netVatOwed: number
    zakatData: any
    isLedgerBalanced: boolean
  }
}

export default function ExportMenu({ financialData }: ExportMenuProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const handleExportExcel = async () => {
    if (!financialData.isLedgerBalanced) {
      toast.warning("Warning: The ledger is not balanced. ZATCA may reject this report.", { duration: 5000 })
    }
    
    setIsExportingExcel(true)
    try {
      await generateFinancialExcel(financialData)
      toast.success("Excel report generated successfully.")
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate Excel report.")
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPDF = async () => {
    if (!financialData.isLedgerBalanced) {
      toast.warning("Warning: The ledger is not balanced. Review data before official submission.", { duration: 5000 })
    }

    setIsExportingPDF(true)
    try {
      await generateFinancialPDF(financialData)
      toast.success("PDF report generated successfully.")
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate PDF report.")
    } finally {
      setIsExportingPDF(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleExportPDF}
        disabled={isExportingPDF || isExportingExcel}
        className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
      >
        {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Export PDF
      </button>

      <button 
        onClick={handleExportExcel}
        disabled={isExportingPDF || isExportingExcel}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
      >
        {isExportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        Export Excel
      </button>
    </div>
  )
}
