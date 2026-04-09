import { prisma } from "@/lib/prisma"
import { Calculator, TrendingUp, HandCoins, Building, FileSpreadsheet, Receipt, Info } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { calculateBalance, calculateZakat, roundSAR } from "@/lib/financial"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function ReportingPage() {
  const dict = await getTranslation()
  const accountsData = await prisma.account.findMany({
    include: { transactions: true }
  })

  // Operational Analytics Data
  const pumpsAnalytics = await prisma.pump.findMany({
    include: { tank: { include: { fuelType: true } } }
  })
  const fuelTypeAnalytics = await prisma.fuelType.findMany()
  const salesItemsData = await prisma.saleItem.findMany({
    include: { sale: true }
  })

  // Calculate all account balances using precision helpers
  const accounts = accountsData.map((account: any) => {
    const totalDebit = account.transactions.reduce((sum: number, t: any) => sum + t.debit, 0)
    const totalCredit = account.transactions.reduce((sum: number, t: any) => sum + t.credit, 0)
    const balance = calculateBalance(account.type, totalDebit, totalCredit)
    return { ...account, totalDebit, totalCredit, balance }
  })

  // Income Statement
  const revenues = accounts.filter((a: any) => a.type === "REVENUE")
  const expenses = accounts.filter((a: any) => a.type === "EXPENSE")
  const totalRevenue = roundSAR(revenues.reduce((s: number, a: any) => s + a.balance, 0))
  const totalExpense = roundSAR(expenses.reduce((s: number, a: any) => s + a.balance, 0))
  const netIncome = roundSAR(totalRevenue - totalExpense)

  // Balance Sheet
  const assets = accounts.filter((a: any) => a.type === "ASSET")
  const liabilities = accounts.filter((a: any) => a.type === "LIABILITY")
  const equities = accounts.filter((a: any) => a.type === "EQUITY")
  
  const totalAssets = roundSAR(assets.reduce((s: number, a: any) => s + a.balance, 0))
  const totalLiabilities = roundSAR(liabilities.reduce((s: number, a: any) => s + a.balance, 0))
  const totalEquity = roundSAR(equities.reduce((s: number, a: any) => s + a.balance, 0))

  // Include Retained Earnings (Net Income) in equity for balance sheet
  const totalEquityWithRetained = roundSAR(totalEquity + netIncome)

  // VAT Summary
  const vatPayable = accounts.find((a: any) => a.code === "2001")
  const vatReceivable = accounts.find((a: any) => a.code === "1004")
  const vatPayableBalance = vatPayable?.balance || 0
  const vatReceivableBalance = vatReceivable?.balance || 0
  const netVatOwed = roundSAR(vatPayableBalance - vatReceivableBalance)

  // ZATCA Zakat Calculation (proper Saudi method)
  const zakatData = calculateZakat(
    accounts.map((a: any) => ({ type: a.type, balance: a.balance, code: a.code })),
    'gregorian'
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
           <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-3 md:gap-4 tracking-tight glass-title shadow-sm">
             <div className="p-3 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl">
               <FileSpreadsheet className="w-8 h-8" />
             </div>
             System Analytics & Reports
          </h1>
          <Button variant="outline" className="shadow-none hidden md:flex" onClick={() => window.print()}>
             Export PDF
          </Button>
        </div>

        {/* --- OPERATIONAL & SALES ANALYTICS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Pump Performance */}
          <Card className="border-t-4 border-t-fuchsia-500 shadow-xl">
             <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <TrendingUp className="text-fuchsia-500 w-5 h-5" /> Pump Performance Matrix
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 overflow-x-auto p-0">
               <table className="w-full text-left border-collapse text-sm">
                 <thead>
                   <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                     <th className="p-4">Pump ID</th>
                     <th className="p-4">Lifetime Liters Dispensed</th>
                     <th className="p-4">Connected Tank</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {pumpsAnalytics.map((p: any) => (
                     <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                       <td className="p-4 font-bold max-w-[150px] truncate">{p.name}</td>
                       <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-black">{p.meterReading.toLocaleString()} L</td>
                       <td className="p-4 font-bold text-xs uppercase tracking-widest text-slate-500">{p.tank.name} ({p.tank.fuelType.code})</td>
                     </tr>
                   ))}
                   {pumpsAnalytics.length === 0 && (
                     <tr><td colSpan={3} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">No Pumps Registered</td></tr>
                   )}
                 </tbody>
               </table>
             </CardContent>
          </Card>

          {/* Sales by Fuel Grade */}
          <Card className="border-t-4 border-t-orange-500 shadow-xl">
             <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <TrendingUp className="text-orange-500 w-5 h-5" /> Sales Volume by Fuel Grade
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 overflow-x-auto p-0">
               <table className="w-full text-left border-collapse text-sm">
                 <thead>
                   <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                     <th className="p-4">Fuel Grade</th>
                     <th className="p-4">Total Sold (Liters)</th>
                     <th className="p-4">Gross Revenue</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {fuelTypeAnalytics.map((f: any) => {
                     // Aggregate all sale items for this fuel type
                     const items = salesItemsData.filter((i: any) => i.fuelTypeId === f.id)
                     const totalLiters = items.reduce((sum: number, i: any) => sum + i.quantity, 0)
                     const totalRev = items.reduce((sum: number, i: any) => sum + i.totalPrice, 0)

                     return (
                       <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                         <td className="p-4 font-bold">{f.name} <span className="p-1 px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">{f.code}</span></td>
                         <td className="p-4 font-mono font-black">{totalLiters.toLocaleString(undefined, {minimumFractionDigits: 2})} L</td>
                         <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">SAR {totalRev.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                       </tr>
                     )
                   })}
                 </tbody>
               </table>
             </CardContent>
          </Card>

        </div>

        {/* VAT Summary Card */}
        <Card className="border-t-4 border-t-cyan-500 shadow-xl">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Receipt className="text-cyan-500 w-5 h-5" /> VAT Summary (ZATCA 15%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-6 text-center">
                <span className="block text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-2">VAT Collected (Output)</span>
                <span className="text-2xl font-black text-rose-700 dark:text-rose-400">SAR {vatPayableBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-6 text-center">
                <span className="block text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-2">VAT Paid (Input)</span>
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400">SAR {vatReceivableBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className={`${netVatOwed >= 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50'} border rounded-2xl p-6 text-center`}>
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                  {netVatOwed >= 0 ? 'Net VAT Due to ZATCA' : 'VAT Refund Claimable'}
                </span>
                <span className={`text-2xl font-black ${netVatOwed >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  SAR {Math.abs(netVatOwed).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-4 uppercase tracking-widest font-bold flex items-center justify-center gap-1">
              <Info className="w-3 h-3" /> Output VAT (15% on sales) minus Input VAT (15% on purchases) = Net payable to ZATCA
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* INCOME STATEMENT */}
          <Card className="border-t-4 border-t-emerald-500 shadow-xl">
             <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
               <CardTitle className="text-xl font-black flex items-center gap-2">
                <TrendingUp className="text-emerald-500 w-5 h-5" /> {(dict.Reporting as any).income_statement}
               </CardTitle>
             </CardHeader>
             
             <CardContent className="space-y-8 text-sm pt-2">
               <div>
                 <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 text-[10px]">{(dict.Reporting as any).revenue}</h3>
                 <div className="space-y-2 font-mono">
                   {revenues.map((r: any) => (
                     <div key={r.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{r.name}</span>
                       <span>SAR {r.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   ))}
                   {revenues.length === 0 && <p className="text-slate-400 italic">No revenue recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 text-[10px]">{(dict.Reporting as any).expenses}</h3>
                 <div className="space-y-2 font-mono">
                   {expenses.map((e: any) => (
                     <div key={e.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{e.name}</span>
                       <span>SAR {e.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   ))}
                   {expenses.length === 0 && <p className="text-slate-400 italic">No expenses recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                 </div>
               </div>

               <div className={`mt-8 p-6 rounded-2xl flex justify-between items-center ${netIncome >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border border-emerald-200 dark:border-emerald-900/50" : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 border border-rose-200 dark:border-rose-900/50"}`}>
                 <span className="font-black uppercase tracking-widest text-[10px] dark:text-white">{(dict.Reporting as any).net_income}</span>
                 <span className={`text-2xl font-black ${netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>SAR {netIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
               </div>
             </CardContent>
          </Card>

          {/* BALANCE SHEET */}
          <Card className="border-t-4 border-t-blue-500 shadow-xl">
             <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
               <CardTitle className="text-xl font-black flex items-center gap-2">
                <Building className="text-blue-500 w-5 h-5" /> {(dict.Reporting as any).balance_sheet}
               </CardTitle>
             </CardHeader>

             <CardContent className="space-y-8 text-sm pt-2">
               <div>
                 <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 text-[10px]">{(dict.Reporting as any).assets}</h3>
                 <div className="space-y-2 font-mono">
                   {assets.map((a: any) => (
                     <div key={a.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{a.name}</span>
                       <span>SAR {a.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   ))}
                   {assets.length === 0 && <p className="text-slate-400 italic">No assets recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {totalAssets.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 text-[10px]">{(dict.Reporting as any).liabilities} + Equity</h3>
                 <div className="space-y-2 font-mono">
                   {liabilities.map((l: any) => (
                     <div key={l.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{l.name}</span>
                       <span>SAR {l.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   ))}
                   {equities.map((e: any) => (
                     <div key={e.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{e.name}</span>
                       <span>SAR {e.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   ))}
                   {/* Retained Earnings (Net Income) */}
                   {netIncome !== 0 && (
                     <div className="flex justify-between text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                       <span className="font-sans font-bold italic">Retained Earnings (YTD)</span>
                       <span>SAR {netIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                     </div>
                   )}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {roundSAR(totalLiabilities + totalEquityWithRetained).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                   </div>
                 </div>
               </div>

               <div className="mt-8 pt-6 border-t font-mono border-dashed border-slate-300 dark:border-slate-800">
                  {roundSAR(totalAssets) !== roundSAR(totalLiabilities + totalEquityWithRetained) ? (
                     <p className="text-[10px] text-rose-500 text-center font-bold tracking-widest uppercase border border-rose-200 bg-rose-50 p-3 rounded-xl dark:bg-rose-900/20 dark:border-rose-900">
                       Ledger Out of Balance. Verify Journal Entries.
                     </p>
                  ) : (
                     <p className="text-[10px] text-emerald-500 text-center font-bold tracking-widest uppercase border border-emerald-200 bg-emerald-50 p-3 rounded-xl dark:bg-emerald-900/20 dark:border-emerald-900">
                       ✓ Assets = Liabilities + Equity — Ledger Balanced
                     </p>
                  )}
               </div>
             </CardContent>
          </Card>

          {/* OFFICIAL ZAKAT DECLARATION (ZATCA Compliant) */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-2xl text-white overflow-hidden relative group">
             
             <HandCoins className="absolute -right-8 -bottom-8 w-64 h-64 text-white opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-700" />

             <CardHeader className="border-b border-slate-700/50 pb-6 mb-6 relative z-10">
               <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Calculator className="text-amber-400 w-6 h-6" /> {(dict.Reporting as any).zakat_report}
               </CardTitle>
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">
                 ZATCA Simplified Method (صافي الأصول المتداولة)
               </p>
             </CardHeader>

             <CardContent className="relative z-10 p-8 pt-0">
               <div className="space-y-4 text-sm font-mono tracking-widest font-bold">
                  
                  {/* Zakatable Base Breakdown */}
                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-700/50">
                    <p className="text-[10px] text-amber-400 uppercase tracking-widest font-black mb-3">مصادر الوعاء الزكوي — Zakatable Base Components</p>
                    
                    <div className="flex justify-between border-b border-slate-700/30 pb-2">
                      <span className="text-slate-400 font-sans text-[10px] uppercase">Current Assets (Cash + Bank + VAT Receivable)</span>
                      <span className="text-white">SAR {zakatData.currentAssets.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700/30 pb-2">
                      <span className="text-slate-400 font-sans text-[10px] uppercase">(Less) Current Liabilities (VAT Payable)</span>
                      <span className="text-rose-400">- SAR {zakatData.currentLiabilities.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    {zakatData.equity > 0 && (
                      <div className="flex justify-between border-b border-slate-700/30 pb-2">
                        <span className="text-slate-400 font-sans text-[10px] uppercase">Equity</span>
                        <span>SAR {zakatData.equity.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2">
                      <span className="text-amber-400 font-sans text-[10px] uppercase font-black">الوعاء الزكوي (Zakatable Base)</span>
                      <span className="text-amber-400 font-black text-lg">SAR {zakatData.zakatBase.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>

                  {/* Rate Information */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 text-center">
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Hijri Year Rate</span>
                      <span className="font-black text-white">2.5%</span>
                      <span className="block text-amber-400 font-mono mt-1">SAR {zakatData.zakatDueHijri.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="bg-slate-800/30 border border-amber-900/50 rounded-lg p-3 text-center">
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Gregorian Year Rate</span>
                      <span className="font-black text-amber-400">≈2.578%</span>
                      <span className="block text-amber-400 font-mono mt-1">SAR {zakatData.zakatDueGregorian.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>

                  {/* Final Zakat Owed */}
                  <div className="mt-6 bg-slate-800/80 border border-slate-700 rounded-2xl p-6 relative z-10 text-center backdrop-blur-md shadow-inner">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-black">الزكاة المستحقة — Estimated Zakat Due</span>
                    <span className="text-4xl font-black text-amber-400 tracking-tighter">SAR {zakatData.zakatOwed.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    <span className="block text-[9px] text-slate-500 mt-2 uppercase tracking-widest">Based on Gregorian calendar (365 days)</span>
                  </div>
               </div>
               
               <p className="text-[9px] text-slate-500 text-center mt-6 uppercase tracking-widest font-bold">
                 هيئة الزكاة والضريبة والجمارك — Saudi General Authority of Zakat, Tax & Customs
               </p>
             </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
