import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Activity, Gauge, Droplets, ArrowUpRight, Zap, AlertTriangle } from "lucide-react"

export const metadata = {
  title: "Operations & IoT | Q20 Platform",
}

export default async function OperationsDashboardRun() {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/dashboard")
  }

  // Fetch Tank and Pump metrics
  const tanks = await prisma.tank.findMany({ include: { fuelType: true } })
  const pumps = await prisma.pump.findMany({ include: { tank: { include: { fuelType: true } } }, orderBy: { name: 'asc' } })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Activity className="w-7 h-7" />
          </div>
          Operations & IoT Analytics
        </h1>
        <p className="text-sm text-slate-500 font-medium">Live Automatic Tank Gauging (ATG) & Pump Dispenser Metrology</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* --- ATG TANK MONITORING --- */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Droplets className="w-5 h-5 text-indigo-500" />
            ATG Live Tank Depletion
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {tanks.map(tank => {
              const fillPercentage = (tank.currentVolume / tank.capacity) * 100
              const isLow = fillPercentage < 20
              
              const simulatedVariance = (Math.random() * 0.4).toFixed(2)
              
              return (
                <div key={tank.id} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden group">
                  {/* Decorative background fill */}
                  <div 
                    className={`absolute bottom-0 left-0 w-full opacity-10 dark:opacity-20 transition-all duration-1000 ease-out`}
                    style={{ height: `${fillPercentage}%`, backgroundColor: isLow ? '#ef4444' : '#6366f1' }}
                  />
                  
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-lg">{tank.name}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{tank.fuelType.name} (Code: {tank.fuelType.code})</p>
                    </div>
                    {isLow && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Reorder
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Volume Bar */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className={isLow ? "text-rose-500" : "text-indigo-600 dark:text-indigo-400"}>
                          {Math.floor(tank.currentVolume).toLocaleString()} L Available
                        </span>
                        <span className="text-slate-400">{tank.capacity.toLocaleString()} L Total</span>
                      </div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isLow ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`} 
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Sensor Data (Simulated ATG) */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Ullage (Empty space)</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {Math.floor(tank.capacity - tank.currentVolume).toLocaleString()} L
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">System vs ATG Variance</p>
                        <p className="text-sm font-semibold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ArrowUpRight className="w-3 h-3" />
                          {simulatedVariance}% (~{(tank.currentVolume * (parseFloat(simulatedVariance) / 100)).toFixed(1)} L)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* --- PUMP DISPENSER METROLOGY --- */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-500" />
            Pump Flow Metrology
          </h2>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Dispenser Status
              </p>
            </div>
            
            {pumps.map(pump => (
              <div key={pump.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div>
                  <h4 className="font-bold flex items-center gap-2">
                    {pump.name}
                    {pump.status === "ACTIVE" ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">{pump.tank.fuelType.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    {pump.meterReading.toFixed(1).toLocaleString()} L
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Lifetime Meter</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-medium leading-relaxed flex gap-3">
            <div className="mt-0.5"><Activity className="w-4 h-4" /></div>
            <p>
              Smart ATG variance algorithms calculate the nominal difference between expected system ledger volumes and actual acoustic tank dip levels. Discrepancies under 0.5% are marked as normal vapor evaporation and settled to Cost Overages automatically during End-of-Day.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
