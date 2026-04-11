import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Activity, CircleDollarSign, LayoutDashboard, DatabaseZap, Banknote, Landmark, Clock } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateBalance, calculateZakat, roundSAR } from "@/lib/financial"
import SmartSummary from "./SmartSummary"
import { CashierOpenShift, CashierCloseShift } from "./CashierShiftWidget"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function DashboardPage() {
  const session = await auth()
  // @ts-ignore
  if (!session?.user) redirect("/login")

  // @ts-ignore
  const role: string = (session.user as any).role || "CASHIER"
  // @ts-ignore
  const userId: string = (session.user as any).id

  const dict = await getTranslation()

  // ── CASHIER VIEW ─────────────────────────────────────────────────────────
  if (role === "CASHIER") {
    const pumps = await prisma.pump.findMany({
      include: { tank: { include: { fuelType: true } } }
    })

    const activeShift = await prisma.shift.findFirst({
      where: { status: "OPEN", userId },
      include: {
        pump: { include: { tank: { include: { fuelType: true } } } },
        sales: true
      }
    })

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
                <Clock className="w-7 h-7" />
              </div>
              My Shift
            </h1>
            <p className="text-slate-500 mt-2 text-base">
              {(dict.General as any).welcome}, <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{session.user.name}</span>
            </p>
          </div>

          {/* Shift Widget */}
          {activeShift
            ? <CashierCloseShift activeShift={activeShift} dict={dict} />
            : <CashierOpenShift pumps={pumps} dict={dict} />
          }

        </div>
      </div>
    )
  }

  // ── ADMIN / MANAGER VIEW ─────────────────────────────────────────────────
  const tanks = await prisma.tank.findMany()
  const sales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  })

  // Aggregate Financial Data
  const totalSales = await prisma.sale.aggregate({ _sum: { totalAmount: true } })
  const salesAmount = roundSAR(totalSales._sum.totalAmount || 0)

  const accountsData = await prisma.account.findMany({ include: { transactions: true } })
  const accounts = accountsData.map((account: any) => {
    const totalDebit = account.transactions.reduce((sum: number, t: any) => sum + t.debit, 0)
    const totalCredit = account.transactions.reduce((sum: number, t: any) => sum + t.credit, 0)
    const balance = calculateBalance(account.type, totalDebit, totalCredit)
    return { ...account, balance, code: account.code, type: account.type }
  })

  const cashBalance = roundSAR(accounts.find((a: any) => a.code === "1001")?.balance || 0)
  const bankBalance = roundSAR(accounts.find((a: any) => a.code === "1002")?.balance || 0)

  const zakatData = calculateZakat(
    accounts.map((a: any) => ({ type: a.type, balance: a.balance, code: a.code })),
    'gregorian'
  )

  // Today's Stats
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  const todaySalesRaw = await prisma.sale.findMany({
    where: { createdAt: { gte: startOfToday } },
    include: { items: true, pump: true }
  })
  const yesterdaySalesRaw = await prisma.sale.findMany({
    where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
    include: { items: true }
  })

  const todaySalesAmount = roundSAR(todaySalesRaw.reduce((s: number, x: any) => s + x.totalAmount, 0))
  const todayCash = roundSAR(todaySalesRaw.filter((s: any) => s.paymentMethod === 'CASH').reduce((sum: number, s: any) => sum + s.totalAmount, 0))
  const todayBank = roundSAR(todaySalesRaw.filter((s: any) => s.paymentMethod === 'BANK').reduce((sum: number, s: any) => sum + s.totalAmount, 0))
  const todayLiters = todaySalesRaw.reduce((sum: number, s: any) => sum + (s.items?.reduce((ls: number, i: any) => ls + (i.quantity || 0), 0) || 0), 0)
  const yesterdayLiters = yesterdaySalesRaw.reduce((sum: number, s: any) => sum + (s.items?.reduce((ls: number, i: any) => ls + (i.quantity || 0), 0) || 0), 0)

  const activePumps = await prisma.pump.count({ where: { status: 'ACTIVE' } })
  const totalFuelStock = Math.round(tanks.reduce((sum: number, t: any) => sum + t.currentVolume, 0))

  // Smart Insights
  const insights: string[] = []
  if (todayLiters > 0 && yesterdayLiters > 0) {
    const pct = Math.round(((todayLiters - yesterdayLiters) / yesterdayLiters) * 100)
    if (pct > 0) insights.push(`▲ Fuel dispensed is up ${pct}% compared to yesterday (${Math.round(todayLiters).toLocaleString()} L vs ${Math.round(yesterdayLiters).toLocaleString()} L).`)
    else if (pct < 0) insights.push(`▼ Fuel dispensed is down ${Math.abs(pct)}% versus yesterday (${Math.round(todayLiters).toLocaleString()} L vs ${Math.round(yesterdayLiters).toLocaleString()} L).`)
    else insights.push(`Fuel dispensed today is on par with yesterday at ~${Math.round(todayLiters).toLocaleString()} L.`)
  } else if (todayLiters > 0) {
    insights.push(`${Math.round(todayLiters).toLocaleString()} L dispensed today — no prior-day data for comparison.`)
  }

  if (todaySalesRaw.length > 0) {
    const pumpTotals: Record<string, { name: string; liters: number }> = {}
    for (const sale of todaySalesRaw as any[]) {
      const pumpId = sale.pumpId || "unknown"
      const pumpName = (sale as any).pump?.name || `Pump ${pumpId}`
      const liters = sale.items?.reduce((ls: number, i: any) => ls + (i.quantity || 0), 0) || 0
      if (!pumpTotals[pumpId]) pumpTotals[pumpId] = { name: pumpName, liters: 0 }
      pumpTotals[pumpId].liters += liters
    }
    const sorted = Object.values(pumpTotals).sort((a, b) => b.liters - a.liters)
    if (sorted.length > 0 && sorted[0].liters > 0) {
      insights.push(`▲ ${sorted[0].name} is the highest-performing pump today with ${Math.round(sorted[0].liters).toLocaleString()} L dispensed.`)
    }
  }

  const lastShift = await prisma.shift.findFirst({ where: { status: 'CLOSED' }, orderBy: { closedAt: 'desc' } })
  if (lastShift) {
    const cashVar = (lastShift as any).cashVariance || 0
    if (Math.abs(cashVar) >= 1) {
      insights.push(`⚠ Cash variance of SAR ${Math.abs(cashVar).toFixed(2)} detected in the last closed shift — review reconciliation.`)
    }
  }

  const lowTanks = tanks.filter((t: any) => (t.currentVolume / t.capacity) * 100 < 15)
  if (lowTanks.length > 0) {
    insights.push(`⚠ ${lowTanks.length} fuel tank${lowTanks.length > 1 ? 's' : ''} (${lowTanks.map((t: any) => t.name).join(', ')}) ${lowTanks.length > 1 ? 'are' : 'is'} critically low — immediate refill required.`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              {(dict.Dashboard as any).title}
            </h1>
            <p className="text-slate-500 mt-2 text-base md:text-lg">{(dict.General as any).welcome}, <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{session.user.name}</span></p>
          </div>
        </div>

        {/* Smart Daily Summary */}
        <SmartSummary
          todaySalesAmount={todaySalesAmount}
          todayCash={todayCash}
          todayBank={todayBank}
          todayLiters={Math.round(todayLiters)}
          activePumps={activePumps}
          totalFuelStock={totalFuelStock}
          insights={insights}
          dict={dict}
        />

        {/* All-Time KPIs */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-4 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full" />
            All-Time Station Totals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="hover:shadow-md transition-shadow border-t-4 border-t-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                  {(dict.Dashboard as any).total_sales}
                  <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-black text-slate-900 dark:text-white">SAR {salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow border-t-4 border-t-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                  {(dict.Dashboard as any).cash_balance}
                  <Banknote className="w-4 h-4 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`text-3xl font-black ${cashBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>SAR {cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow border-t-4 border-t-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                  {(dict.Dashboard as any).bank_balance}
                  <Landmark className="w-4 h-4 text-indigo-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`text-3xl font-black ${bankBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>SAR {bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                <span className="text-3xl font-black text-slate-900 dark:text-white">{tanks.length} {tanks.length === 1 ? (dict.Dashboard as any).tank : (dict.Dashboard as any).tanks}</span>
                <div className="flex mt-3 gap-1">
                  {tanks.map((t: any) => (
                    <div key={t.id} className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${(t.currentVolume / t.capacity) * 100}%` }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                  {(dict.Dashboard as any).zakat_estimate}
                  <Activity className="w-4 h-4 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">SAR {zakatData.zakatOwed > 0 ? zakatData.zakatOwed.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}</span>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">{(dict.Dashboard as any).zakat_footer}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lower Content */}
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
                      <th className="p-4">{(dict.Dashboard as any).time}</th>
                      <th className="p-4">{(dict.Dashboard as any).invoice_no}</th>
                      <th className="p-4 text-center">{(dict.Dashboard as any).payment}</th>
                      <th className="p-4 text-center">{(dict.General as any).status}</th>
                      <th className="p-4 text-right">{(dict.Dashboard as any).total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {sales.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4 text-slate-500 font-mono text-xs">{new Date(s.createdAt).toLocaleTimeString()}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{s.invoiceNumber}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest ${s.paymentMethod === 'CASH'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-900'
                            }`}>
                            {s.paymentMethod === 'CASH' ? (dict.POS as any).cash : (dict.POS as any).card}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900 rounded-md text-[10px] uppercase font-bold tracking-widest">
                            {(dict.Dashboard as any).paid}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 dark:text-white">SAR {s.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {sales.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">{(dict.Dashboard as any).no_sales}</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle>{(dict.Dashboard as any).hardware_status}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {tanks.map((tank: any) => {
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
