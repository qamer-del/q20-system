import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PlayCircle, StopCircle, Fuel, Clock, AlertTriangle, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { OpenShiftForms, CloseShiftForm } from "./ShiftForms"

export default async function ShiftsPage() {
  const session = await protectRoute(["ADMIN", "MANAGER", "CASHIER"])

  // Explicitly casting and extracting to avoid session attribute mismatches
  const role = (session?.user as any)?.role
  const userId = (session?.user as any)?.id

  if (!userId || !role) {
    redirect("/login")
  }

  const pumps = await prisma.pump.findMany({
    include: { tank: { include: { fuelType: true } } }
  })

  // Get active shifts based on role
  // CASHIER: only their own
  // MANAGER/ADMIN: all open shifts in the system
  const activeShifts = await prisma.shift.findMany({
    where: {
      status: "OPEN",
      ...(role === "CASHIER" ? { userId } : {})
    },
    include: {
      user: true,
      pump: { include: { tank: { include: { fuelType: true } } } }
    }
  })

  // Check if current user has an active shift (for disabling open button later if needed)
  const myActiveShift = activeShifts.find(s => s.userId === userId)

  // View historical shifts (Standard history view)
  const historyQuery: any = { status: "CLOSED" }
  if (role === "CASHIER") historyQuery.userId = userId

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

          {/* TEMP DIAGNOSTIC - Remove after fix */}
          <div className="bg-amber-100 p-4 rounded-xl text-[10px] font-mono border border-amber-300">
            DEBUG | UserID: {userId} | Role: {role} | MyActiveCount: {activeShifts.length}
            <br />
            Global Open Shifts (User[ID]): {(await prisma.shift.findMany({ where: { status: 'OPEN' }, include: { user: true } })).map(s => `${s.user.name}[${s.userId}]`).join(', ')}
          </div>

          {role !== "CASHIER" && (
            <span className="bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-900/50 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-sm">
              Global Supervision Mode
            </span>
          )}
        </div>

        {/* ACTIVE SHIFTS SECTION */}
        <div className="space-y-6">
          {activeShifts.length > 0 ? (
            <div className="space-y-6">
              {role === "CASHIER" && (
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <StopCircle className="w-4 h-4" /> Your Active Shift
                </h2>
              )}
              <div className="grid grid-cols-1 gap-8">
                {activeShifts.map((s) => (
                  <CloseShiftForm key={s.id} activeShift={s} currentUserRole={role} currentUserId={userId} />
                ))}
              </div>
            </div>
          ) : role === "CASHIER" ? (
            <OpenShiftForms pumps={pumps} />
          ) : (
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 rounded-[2rem] text-center">
              <p className="text-slate-400 font-bold uppercase tracking-widest">No active shifts in the station.</p>
              <p className="text-xs text-slate-500 mt-2">All employees have finalized their reconciliations or haven't started yet.</p>
            </div>
          )}

          {/* If Manager wants to open their own shift */}
          {role !== "CASHIER" && !myActiveShift && (
            <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <PlayCircle className="w-4 h-4" /> Your Personal Shift Session
              </h2>
              <OpenShiftForms pumps={pumps} />
            </div>
          )}
        </div>

        {/* Shift History */}
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-8">
            <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-widest font-black text-slate-500">
              <Clock className="w-5 h-5" /> Audit History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                    <th className="p-6">Date & Cashier</th>
                    <th className="p-6">Pump & Meter</th>
                    <th className="p-6">Quantity Analysis</th>
                    <th className="p-6">Financial Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {closedShifts.map((s: any) => {
                    const discrepancy = (s.actualLiters || 0) - s.expectedLiters
                    const isPerfect = Math.abs(discrepancy) < 0.5

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-6">
                          <p className="font-black text-slate-900 dark:text-white capitalize text-base">{s.user.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-1">
                            {s.openedAt.toLocaleDateString()} {s.openedAt.toLocaleTimeString()} &rarr; {s.closedAt?.toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-600 dark:text-slate-400">{s.pump.name}</p>
                          <p className="text-xs font-mono mt-1 text-slate-400">{s.openingMeter}L &rarr; {s.closingMeter}L</p>
                        </td>
                        <td className="p-6">
                          <p className="font-black text-blue-600 dark:text-blue-400 text-lg">{s.actualLiters?.toLocaleString()}L</p>
                          {isPerfect ? (
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">✓ Match</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Discrepancy: {discrepancy > 0 ? '+' : ''}{roundLiters(discrepancy)}L
                            </span>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-700 dark:text-slate-300">Cash: <span className="font-mono">SAR {(s.actualCash || 0).toLocaleString()}</span></p>
                            <p className="font-bold text-slate-700 dark:text-slate-300">Bank: <span className="font-mono">SAR {(s.actualBank || 0).toLocaleString()}</span></p>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {closedShifts.length === 0 && (
                <div className="py-20 text-center text-slate-400 italic">No shift history found.</div>
              )}
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
