"use client"

import { openShift, closeShift } from "@/features/shifts/actions"
import { PlayCircle, StopCircle, Fuel, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

export function OpenShiftForms({ pumps }: { pumps: any[] }) {
  const handleOpenPromise = async (formData: FormData, pumpId: string) => {
    formData.append("pumpId", pumpId)
    const res: any = await openShift(formData)
    if (res?.error) throw new Error(res.error)
    return res
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-xl font-black">
          <PlayCircle className="text-emerald-500 w-5 h-5" /> Start New Shift
        </CardTitle>
        <CardDescription>Select a pump and enter starting reading to begin.</CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pumps.map((pump: any) => (
            <ActionForm action={(d) => handleOpenPromise(d, pump.id)} successMessage="Shift Opened Successfully!" key={pump.id} className="relative group cursor-default">
              <div className={`w-full text-left bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-6 rounded-3xl transition-all relative overflow-hidden ${pump.status === 'ACTIVE' ? 'hover:border-emerald-500 hover:shadow-lg' : 'opacity-50'}`}>
                {pump.status !== "ACTIVE" && (
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">{pump.status}</span>
                  </div>
                )}
                <Fuel className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-4 group-hover:text-emerald-500 transition-colors" />
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">{pump.name}</h3>
                <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-2">{pump.tank.fuelType.name}</p>

                {/* Input for Mobile-friendly / Manual Start */}
                <div className="mt-6 space-y-4 relative z-20">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Starting Meter (Liters)</label>
                    <Input
                      type="number"
                      name="openingMeter"
                      required
                      step="0.01"
                      placeholder={pump.meterReading.toString()}
                      defaultValue={pump.meterReading.toString()}
                      className="font-mono font-bold text-base bg-slate-50"
                      disabled={pump.status !== "ACTIVE"}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Opening Cash (SAR)</label>
                    <Input
                      type="number"
                      name="openingCash"
                      required
                      step="0.01"
                      placeholder="500.00"
                      defaultValue="0.00"
                      className="font-mono font-bold text-base bg-slate-50"
                      disabled={pump.status !== "ACTIVE"}
                    />
                  </div>

                  <SubmitButton
                    className="w-full mt-2 font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl"
                    disabled={pump.status !== "ACTIVE"}
                  >
                    Start Shift
                  </SubmitButton>
                </div>
              </div>
            </ActionForm>
          ))}
          {pumps.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No pumps configured in inventory.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CloseShiftForm({
  activeShift,
  currentUserRole,
  currentUserId
}: {
  activeShift: any,
  currentUserRole?: string,
  currentUserId?: string
}) {
  const isOwner = String(activeShift.userId) === String(currentUserId)
  const isAuthorizedFull = currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER'
  const canClose = (currentUserRole === 'CASHIER' && isOwner) || isAuthorizedFull

  if (!canClose) return null

  const isOverride = !isOwner && isAuthorizedFull

  return (
    <Card className={`border-t-4 shadow-xl overflow-hidden relative ${isOverride ? 'border-t-amber-500' : 'border-t-blue-500'}`}>
      <div className={`absolute top-0 right-0 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-2 ${isOverride ? 'bg-amber-500' : 'bg-blue-500'}`}>
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        {isOverride ? `Supervising: ${activeShift.user.name}` : 'Your Active Shift'}
      </div>

      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-3xl font-black">{activeShift.pump.name}</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">
              Dispensing: <span className="text-blue-600 dark:text-blue-400">{activeShift.pump.tank.fuelType.name}</span>
            </CardDescription>
          </div>
          {isOverride && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Operator</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">{activeShift.user.name}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">Opening Status</span>
            <div className="space-y-1">
              <p className="font-mono text-xl font-black text-slate-700 dark:text-slate-300">
                {activeShift.openingMeter.toLocaleString()} L
              </p>
              <p className="text-xs font-bold text-slate-400 tracking-tight">Starting Cash: SAR {activeShift.openingCash?.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 mb-2 flex items-center gap-2">
              <Fuel className="w-3 h-3" /> System Expected Closure
            </span>
            <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400 block tracking-tight">
              {(activeShift.openingMeter + activeShift.expectedLiters).toLocaleString()} L
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-2 block uppercase">
              Throughput: {activeShift.expectedLiters.toLocaleString()}L
            </span>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 mb-2 block">Expected Collections</span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                Cash: <span>SAR {activeShift.sales.filter((s: any) => s.paymentMethod === 'CASH').reduce((sum: number, s: any) => sum + s.totalAmount, 0).toLocaleString()}</span>
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                Bank: <span>SAR {activeShift.sales.filter((s: any) => s.paymentMethod === 'BANK').reduce((sum: number, s: any) => sum + s.totalAmount, 0).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>

        <ActionForm
          action={async (d) => {
            d.append("shiftId", activeShift.id)
            const res: any = await closeShift(d)
            if (res?.error) throw new Error(res.error)
            return res
          }}
          successMessage={isOverride ? `Shift for ${activeShift.user.name} finalized via override.` : "Shift Closed Successfully!"}
          className={`${isOverride ? 'bg-amber-50/50 border-amber-100' : 'bg-rose-50/50 border-rose-100'} p-8 rounded-[2rem] border dark:bg-slate-900/40 dark:border-slate-800`}
        >
          <h3 className={`font-black mb-6 flex items-center gap-2 ${isOverride ? 'text-amber-700 dark:text-amber-400' : 'text-rose-900 dark:text-rose-400'}`}>
            <StopCircle className="w-5 h-5" /> {isOverride ? 'Supervisor Reconciliation' : 'End Shift & Reconcile'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Physical Final Meter</label>
              <Input
                type="number"
                name="closingMeter"
                step="0.01"
                required
                placeholder={((activeShift.openingMeter + activeShift.expectedLiters)).toString()}
                className="h-14 font-mono font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Actual Cash Counted</label>
              <Input
                type="number"
                name="actualCash"
                step="0.01"
                required
                placeholder="0.00"
                className="h-14 font-mono font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Actual Bank/Card POS</label>
              <Input
                type="number"
                name="actualBank"
                step="0.01"
                required
                placeholder="0.00"
                className="h-14 font-mono font-bold text-lg"
              />
            </div>
          </div>

          <SubmitButton variant={isOverride ? 'secondary' : 'default'} className={`w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-lg ${!isOverride && 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {isOverride ? 'Finalize External Shift' : 'Submit & Close My Shift'}
          </SubmitButton>
        </ActionForm>

      </CardContent>
    </Card>
  )
}
