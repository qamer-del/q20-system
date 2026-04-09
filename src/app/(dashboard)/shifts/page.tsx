import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PlayCircle, StopCircle, Fuel, Clock, AlertTriangle, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { OpenShiftForms, CloseShiftForm } from "./ShiftForms"

export default async function ShiftsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  
  // @ts-ignore
  const role = session.user.role

  const pumps = await prisma.pump.findMany({
    include: { tank: { include: { fuelType: true } } }
  })

  // Get active shift for current cashier
  const activeShift = await prisma.shift.findFirst({
    where: { userId: (session as any).user.id, status: "OPEN" },
    include: { pump: { include: { tank: { include: { fuelType: true } } } } }
  })

  // View historical shifts (Cashier sees own, Admin/Accountant sees all)
  const historyQuery: any = { status: "CLOSED" }
  if (role === "CASHIER") historyQuery.userId = (session as any).user.id

  const closedShifts = await prisma.shift.findMany({
    where: historyQuery,
    include: { pump: true, user: true },
    orderBy: { closedAt: "desc" },
    take: 20
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
          <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-3 md:gap-4 tracking-tight glass-title shadow-sm">
             <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
               <Clock className="w-8 h-8" />
             </div>
             Shift Control
          </h1>
        </div>

        {activeShift ? (
          <CloseShiftForm activeShift={activeShift} />
        ) : (
          <OpenShiftForms pumps={pumps} />
        )}

        {/* Shift History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shift History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                    <th className="p-4">Date</th>
                    <th className="p-4">Cashier</th>
                    <th className="p-4">Pump</th>
                    <th className="p-4">Meter Range</th>
                    <th className="p-4">Dispensary Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {closedShifts.map((s: any) => {
                    const discrepancy = (s.actualLiters || 0) - s.expectedLiters
                    const isPerfect = Math.abs(discrepancy) < 0.5 // small rounding buffer

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="p-4 text-xs font-mono text-slate-500">
                          {s.openedAt.toLocaleDateString()} {s.openedAt.toLocaleTimeString()}<br/>
                          <span className="text-[10px]">&rarr; {s.closedAt?.toLocaleTimeString()}</span>
                        </td>
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300 capitalize">{s.user.name}</td>
                        <td className="p-4 font-medium text-slate-600 dark:text-slate-400">{s.pump.name}</td>
                        <td className="p-4 font-mono text-xs">
                          <span className="text-slate-400">{s.openingMeter}L</span> &rarr;
                          <span className="text-slate-700 dark:text-slate-300"> {s.closingMeter}L</span><br/>
                          <span className="font-bold text-blue-600 dark:text-blue-400">Total: {s.actualLiters}L</span>
                        </td>
                        <td className="p-4">
                          {isPerfect ? (
                            <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 px-2 py-1 rounded text-xs font-bold">✓ Perfect Match ({s.expectedLiters}L logged)</span>
                          ) : (
                            <span className={`bg-rose-50 text-rose-600 dark:bg-rose-900/20 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-max`}>
                               <AlertTriangle className="w-3 h-3" /> Discrepancy: {discrepancy > 0 ? '+' : ''}{roundLiters(discrepancy)}L
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function roundLiters(val: number) {
  return Math.round(val * 100) / 100
}
