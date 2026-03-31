import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Droplet, Activity, CircleDollarSign, LayoutDashboard, DatabaseZap } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function DashboardPage() {
  const session = await auth()
  // @ts-ignore
  if (!session?.user) redirect("/login")
  
  const dict = await getTranslation()

  // 1. Fetch live data
  const tanks = await prisma.tank.findMany()
  const sales = await prisma.sale.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { items: true }})
  
  // 2. Aggregate Data
  const totalSales = await prisma.sale.aggregate({ _sum: { totalAmount: true } })
  const salesAmount = totalSales._sum.totalAmount || 0
  
  const accountsData = await prisma.account.findMany({ include: { transactions: true } })
  const assets = accountsData.filter(a => a.type === "ASSET").reduce((sum, a) => sum + a.transactions.reduce((s, t) => s + t.debit - t.credit, 0), 0)
  const liabilities = accountsData.filter(a => a.type === "LIABILITY").reduce((sum, a) => sum + a.transactions.reduce((s, t) => s + t.credit - t.debit, 0), 0)
  const estimatedZakat = (assets - liabilities) * 0.025

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
               <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                 <LayoutDashboard className="w-8 h-8" />
               </div>
               {(dict.Dashboard as any).title}
            </h1>
            <p className="text-slate-500 mt-2 text-lg">{(dict.General as any).welcome}, <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{session.user.name}</span></p>
          </div>
        </div>

        {/* Top Kpis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-emerald-500">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                 {(dict.Dashboard as any).total_sales}
                 <CircleDollarSign className="w-4 h-4 text-emerald-500" />
               </CardTitle>
             </CardHeader>
             <CardContent>
               <span className="text-3xl font-black text-slate-900 dark:text-white">SAR {salesAmount.toLocaleString()}</span>
             </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                 {(dict.Dashboard as any).active_tanks}
                 <DatabaseZap className="w-4 h-4 text-blue-500" />
               </CardTitle>
             </CardHeader>
             <CardContent>
               <span className="text-3xl font-black text-slate-900 dark:text-white">{tanks.length} {tanks.length === 1 ? 'Tank' : 'Tanks'}</span>
               <div className="flex mt-3 gap-1">
                 {tanks.map(t => (
                    <div key={t.id} className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: `${(t.currentVolume / t.capacity) * 100}%`}} />
                    </div>
                 ))}
               </div>
             </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                 Zakat Estimate
                 <Activity className="w-4 h-4 text-amber-500" />
               </CardTitle>
             </CardHeader>
             <CardContent>
               <span className="text-3xl font-black text-amber-600 dark:text-amber-400">SAR {estimatedZakat > 0 ? estimatedZakat.toLocaleString() : "0"}</span>
             </CardContent>
          </Card>
        </div>

        {/* Lower Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle>{(dict.Dashboard as any).recent_activity}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-widest text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                     <tr>
                       <th className="p-4">Time</th>
                       <th className="p-4">Invoice #</th>
                       <th className="p-4 text-center">{(dict.General as any).status}</th>
                       <th className="p-4 text-right">Total</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                     {sales.map(s => (
                       <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer">
                         <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{new Date(s.createdAt).toLocaleTimeString()}</td>
                         <td className="p-4 font-bold text-slate-900 dark:text-white">{s.invoiceNumber}</td>
                         <td className="p-4 text-center">
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900 rounded-md text-[10px] uppercase font-bold tracking-widest">
                               PAID
                            </span>
                         </td>
                         <td className="p-4 text-right font-black text-slate-900 dark:text-white">SAR {s.totalAmount.toLocaleString()}</td>
                       </tr>
                     ))}
                     {sales.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No recent sales.</td></tr>}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle>Hardware Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
               {tanks.map(tank => {
                 const percentage = (tank.currentVolume / tank.capacity) * 100
                 return (
                   <div key={tank.id}>
                     <div className="flex justify-between items-end mb-2">
                       <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{tank.name}</span>
                       <span className="text-xs font-mono text-slate-500">{tank.currentVolume.toLocaleString()} / {tank.capacity.toLocaleString()} L</span>
                     </div>
                     <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
                       <div className={`h-full transition-all duration-1000 ${percentage < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} />
                     </div>
                   </div>
                 )
               })}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
