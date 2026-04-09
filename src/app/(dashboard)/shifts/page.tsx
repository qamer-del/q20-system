import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PlayCircle, StopCircle, Fuel, Clock, AlertTriangle, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { openShift, closeShift } from "@/features/shifts/actions"

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
          <Card className="border-t-4 border-t-blue-500 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Active Shift
            </div>
            
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-8">
              <CardTitle className="text-3xl font-black">{activeShift.pump.name}</CardTitle>
              <CardDescription className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Dispensing: <span className="text-blue-600 dark:text-blue-400">{activeShift.pump.tank.fuelType.name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">Opening Meter</span>
                  <span className="font-mono text-3xl font-black text-slate-700 dark:text-slate-300">
                    {activeShift.openingMeter.toLocaleString()} L
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 mb-2 flex items-center gap-2">
                    <TrendingDown className="w-3 h-3" /> System Expected Closing Meter
                  </span>
                  <span className="font-mono text-3xl font-black text-blue-600 dark:text-blue-400 block">
                    {(activeShift.openingMeter + activeShift.expectedLiters).toLocaleString()} L
                  </span>
                  <span className="text-xs font-bold text-slate-400 mt-2 block">
                    Based on {activeShift.expectedLiters.toLocaleString()}L tracked recorded sales.
                  </span>
                </div>
              </div>

              <form action={closeShift} className="bg-rose-50/50 dark:bg-rose-900/10 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/50">
                <h3 className="font-black text-rose-900 dark:text-rose-400 mb-4 flex items-center gap-2">
                  <StopCircle className="w-5 h-5" /> End Shift & Reconcile
                </h3>
                <input type="hidden" name="shiftId" value={activeShift.id} />
                <div className="flex flex-col md:flex-row gap-4 items-end">
                   <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Physical Final Meter Reading (Liters)</label>
                      <Input 
                        type="number" 
                        name="closingMeter" 
                        step="0.01"
                        required 
                        placeholder={((activeShift.openingMeter + activeShift.expectedLiters)).toString()}
                        className="h-16 text-2xl font-mono border-rose-200 focus-visible:ring-rose-500 dark:bg-slate-950 dark:border-rose-900"
                      />
                   </div>
                   <Button type="submit" variant="destructive" className="h-16 px-8 rounded-xl font-bold uppercase tracking-widest w-full md:w-auto shrink-0 shadow-lg shadow-rose-900/20">
                      Submit & Close Shift
                   </Button>
                </div>
              </form>

            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
             <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
               <CardTitle className="flex items-center gap-2 text-xl font-black">
                 <PlayCircle className="text-emerald-500 w-5 h-5" /> Start New Shift
               </CardTitle>
               <CardDescription>Select a pump to begin dispensing fuel securely.</CardDescription>
             </CardHeader>
             <CardContent className="pt-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {pumps.map((pump: any) => (
                   <form action={openShift} key={pump.id}>
                     <input type="hidden" name="pumpId" value={pump.id} />
                     <button 
                       type="submit" 
                       disabled={pump.status !== "ACTIVE"}
                       className="w-full text-left bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-6 rounded-3xl hover:border-emerald-500 hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                     >
                       {pump.status !== "ACTIVE" && (
                         <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                           <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">{pump.status}</span>
                         </div>
                       )}
                       <Fuel className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-4 group-hover:text-emerald-500 transition-colors" />
                       <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">{pump.name}</h3>
                       <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-2">{pump.tank.fuelType.name}</p>
                       <p className="font-mono text-xs text-slate-500 mt-4 bg-slate-50 dark:bg-slate-900 inline-block px-2 py-1 rounded-md">
                         Meter: {pump.meterReading.toLocaleString()}L
                       </p>
                     </button>
                   </form>
                 ))}
                 {pumps.length === 0 && (
                   <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                     <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No pumps configured in inventory.</p>
                   </div>
                 )}
               </div>
             </CardContent>
          </Card>
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
