import { prisma } from "@/lib/prisma"
import { Calculator, TrendingUp, HandCoins, Building, FileSpreadsheet } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function calcBalance(type: string, debit: number, credit: number) {
  if (type === "ASSET" || type === "EXPENSE") return debit - credit
  return credit - debit
}

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

  const accounts = accountsData.map((account: any) => {
    const totalDebit = account.transactions.reduce((sum: number, t: any) => sum + t.debit, 0)
    const totalCredit = account.transactions.reduce((sum: number, t: any) => sum + t.credit, 0)
    const balance = calcBalance(account.type, totalDebit, totalCredit)
    return { ...account, balance }
  })

  const revenues = accounts.filter((a: any) => a.type === "REVENUE")
  const expenses = accounts.filter((a: any) => a.type === "EXPENSE")
  const totalRevenue = revenues.reduce((s: number, a: any) => s + a.balance, 0)
  const totalExpense = expenses.reduce((s: number, a: any) => s + a.balance, 0)
  const netIncome = totalRevenue - totalExpense

  const assets = accounts.filter((a: any) => a.type === "ASSET")
  const liabilities = accounts.filter((a: any) => a.type === "LIABILITY")
  const equities = accounts.filter((a: any) => a.type === "EQUITY")
  
  const totalAssets = assets.reduce((s: number, a: any) => s + a.balance, 0)
  const totalLiabilities = liabilities.reduce((s: number, a: any) => s + a.balance, 0)
  const totalEquity = equities.reduce((s: number, a: any) => s + a.balance, 0)

  const zakatBase = totalAssets - totalLiabilities
  const zakatOwed = zakatBase > 0 ? zakatBase * 0.025 : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
             <div className="p-3 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl">
               <FileSpreadsheet className="w-8 h-8" />
             </div>
             {(dict.Reporting as any).title}
          </h1>
          <Button variant="outline" className="shadow-none hidden md:flex">
             Export PDF
          </Button>
        </div>

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
                       <span>SAR {r.balance.toLocaleString()}</span>
                     </div>
                   ))}
                   {revenues.length === 0 && <p className="text-slate-400 italic">No revenue recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {totalRevenue.toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 text-[10px]">{(dict.Reporting as any).expenses}</h3>
                 <div className="space-y-2 font-mono">
                   {expenses.map((e: any) => (
                     <div key={e.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{e.name}</span>
                       <span>SAR {e.balance.toLocaleString()}</span>
                     </div>
                   ))}
                   {expenses.length === 0 && <p className="text-slate-400 italic">No expenses recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {totalExpense.toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               <div className={`mt-8 p-6 rounded-2xl flex justify-between items-center ${netIncome >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border border-emerald-200 dark:border-emerald-900/50" : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 border border-rose-200 dark:border-rose-900/50"}`}>
                 <span className="font-black uppercase tracking-widest text-[10px] dark:text-white">{(dict.Reporting as any).net_income}</span>
                 <span className={`text-2xl font-black ${netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>SAR {netIncome.toLocaleString()}</span>
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
                       <span>SAR {a.balance.toLocaleString()}</span>
                     </div>
                   ))}
                   {assets.length === 0 && <p className="text-slate-400 italic">No assets recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {totalAssets.toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 text-[10px]">{(dict.Reporting as any).liabilities}</h3>
                 <div className="space-y-2 font-mono">
                   {liabilities.map((l: any) => (
                     <div key={l.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{l.name}</span>
                       <span>SAR {l.balance.toLocaleString()}</span>
                     </div>
                   ))}
                   {equities.map((e: any) => (
                     <div key={e.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                       <span className="font-sans font-bold">{e.name}</span>
                       <span>SAR {e.balance.toLocaleString()}</span>
                     </div>
                   ))}
                   {liabilities.length === 0 && equities.length === 0 && <p className="text-slate-400 italic">No liabilities/equity recorded</p>}
                   <div className="flex justify-between font-black text-slate-900 dark:text-white mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                     <span className="font-sans">{(dict.General as any).total}</span>
                     <span>SAR {(totalLiabilities + totalEquity).toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               <div className="mt-8 pt-6 border-t font-mono border-dashed border-slate-300 dark:border-slate-800">
                  {totalAssets !== (totalLiabilities + totalEquity) && (
                     <p className="text-[10px] text-rose-500 text-center font-bold tracking-widest uppercase border border-rose-200 bg-rose-50 p-3 rounded-xl dark:bg-rose-900/20 dark:border-rose-900">
                       Ledger Out of Balance. Verify JEs.
                     </p>
                  )}
               </div>
             </CardContent>
          </Card>

          {/* OFFICIAL ZAKAT DECLARATION */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-2xl text-white overflow-hidden relative group">
             
             {/* Decorative Background Icon */}
             <HandCoins className="absolute -right-8 -bottom-8 w-64 h-64 text-white opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-700" />

             <CardHeader className="border-b border-slate-700/50 pb-6 mb-6 relative z-10">
               <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Calculator className="text-amber-400 w-6 h-6" /> {(dict.Reporting as any).zakat_report}
               </CardTitle>
             </CardHeader>

             <CardContent className="relative z-10 p-8 pt-0">
               <div className="space-y-6 text-sm font-mono tracking-widest font-bold">
                  <div className="flex justify-between border-b border-slate-700/50 pb-3">
                    <span className="text-slate-400 font-sans uppercase text-[10px]">{(dict.Reporting as any).assets}</span>
                    <span>SAR {totalAssets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-3">
                    <span className="text-slate-400 font-sans uppercase text-[10px]">(Less) {(dict.Reporting as any).liabilities}</span>
                    <span>SAR {totalLiabilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-slate-300 font-sans uppercase text-[10px]">{(dict.Reporting as any).zakat_base}</span>
                    <span className="text-amber-400">SAR {zakatBase.toLocaleString()}</span>
                  </div>
               </div>

               <div className="mt-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-6 relative z-10 text-center backdrop-blur-md shadow-inner">
                  <span className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-black">Estimated Zakat Due (2.5%)</span>
                  <span className="text-4xl font-black text-amber-400 tracking-tighter">SAR {zakatOwed.toLocaleString()}</span>
               </div>
               
               <p className="text-[9px] text-slate-500 text-center mt-6 uppercase tracking-widest font-bold">
                 Saudi General Authority of Zakat & Tax
               </p>
             </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
