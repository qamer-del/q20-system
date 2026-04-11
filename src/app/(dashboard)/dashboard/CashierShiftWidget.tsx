"use client"

import { openShift, closeShift } from "@/features/shifts/actions"
import { PlayCircle, StopCircle, Clock, Fuel, Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"

// ─── Open Shift Panel ────────────────────────────────────────────────────────
export function CashierOpenShift({ pumps, dict }: { pumps: any[], dict: any }) {
    const t = dict.Shifts
    const [pending, setPending] = useState<string | null>(null) // pumpId being opened

    const handleOpen = async (e: React.FormEvent<HTMLFormElement>, pumpId: string) => {
        e.preventDefault()
        if (pending) return
        setPending(pumpId)

        const formData = new FormData(e.currentTarget)
        formData.append("pumpId", pumpId)

        const promise = openShift(formData) as Promise<any>
        toast.promise(promise, {
            loading: t.open_shift + "...",
            success: t.open_shift + " ✓",
            error: (err: any) => err?.message || "Failed to open shift."
        })

        try {
            await promise
                ; (e.target as HTMLFormElement).reset()
        } catch {
            // toast handles display
        } finally {
            setPending(null)
        }
    }

    return (
        <Card className="shadow-xl border-t-4 border-t-emerald-500">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <PlayCircle className="text-emerald-500 w-5 h-5" /> {t.open_shift}
                </CardTitle>
                <CardDescription>{t.select_pump_desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {pumps.map((pump: any) => {
                        const isLoading = pending === pump.id
                        const isDisabled = pump.status !== "ACTIVE" || (!!pending && !isLoading)

                        return (
                            <form key={pump.id} onSubmit={(e) => handleOpen(e, pump.id)}>
                                <div className={`relative bg-white dark:bg-slate-950 border-2 rounded-2xl p-5 transition-all ${pump.status === "ACTIVE"
                                        ? "border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-lg"
                                        : "border-slate-100 dark:border-slate-900 opacity-50"
                                    }`}>
                                    {pump.status !== "ACTIVE" && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-900/10 backdrop-blur-[1px]">
                                            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">{pump.status}</span>
                                        </div>
                                    )}

                                    <Fuel className="w-7 h-7 text-slate-300 mb-3" />
                                    <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">{pump.name}</h3>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1 mb-5">{pump.tank.fuelType.name}</p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">{t.opening_meter}</label>
                                            <Input
                                                type="number" name="openingMeter" step="0.01" required
                                                defaultValue={pump.meterReading.toString()}
                                                placeholder={pump.meterReading.toString()}
                                                className="font-mono font-bold" disabled={isDisabled}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">{t.opening_meter_hint}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">{t.opening_cash}</label>
                                            <Input
                                                type="number" name="openingCash" step="0.01" required
                                                defaultValue="0.00" placeholder="0.00"
                                                className="font-mono font-bold" disabled={isDisabled}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">{t.opening_cash_hint}</p>
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isDisabled || isLoading}
                                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-widest rounded-xl"
                                        >
                                            {isLoading
                                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</>
                                                : <><PlayCircle className="w-4 h-4 mr-2" /> {t.open_shift}</>
                                            }
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )
                    })}
                </div>
                {pumps.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-slate-500 font-bold text-sm">{t.no_pumps}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Close Shift Panel ───────────────────────────────────────────────────────
export function CashierCloseShift({ activeShift, dict }: { activeShift: any, dict: any }) {
    const t = dict.Shifts
    const [pending, setPending] = useState(false)

    const handleClose = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const confirmed = window.confirm("Are you sure you want to close this shift? Please ensure you have entered all correct readings.")
        if (!confirmed) return

        setPending(true)
        const formData = new FormData(e.currentTarget)
        formData.append("shiftId", activeShift.id)

        const promise = closeShift(formData) as Promise<any>
        toast.promise(promise, {
            loading: "Closing shift and reconciling...",
            success: "Shift closed and reconciled successfully! ✓",
            error: (err: any) => err?.message || "Failed to close shift."
        })

        try {
            await promise
        } catch {
            // toast handles display
        } finally {
            setPending(false)
        }
    }

    const duration = Math.round((Date.now() - new Date(activeShift.openedAt).getTime()) / 60000)
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60

    const cashSales = activeShift.sales
        ?.filter((s: any) => s.paymentMethod === "CASH")
        .reduce((sum: number, s: any) => sum + s.totalAmount, 0) || 0
    const bankSales = activeShift.sales
        ?.filter((s: any) => s.paymentMethod === "BANK")
        .reduce((sum: number, s: any) => sum + s.totalAmount, 0) || 0
    const totalSales = cashSales + bankSales

    return (
        <div className="space-y-5">
            {/* Active Shift Status Card */}
            <Card className="border-t-4 border-t-blue-500 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {t.your_active_shift}
                </div>

                <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-slate-800 pt-8">
                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                        <Clock className="w-6 h-6 text-blue-500" />
                        {activeShift.pump?.name || "N/A"}
                    </CardTitle>
                    <CardDescription className="font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        {t.dispensing}: {activeShift.pump?.tank?.fuelType?.name}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Duration</p>
                            <p className="font-black text-lg text-slate-800 dark:text-white">
                                {hours > 0 ? `${hours}h ` : ""}{minutes}m
                            </p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">{t.cash_payment}</p>
                            <p className="font-black text-lg text-emerald-700 dark:text-emerald-400">SAR {cashSales.toLocaleString()}</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">{t.bank_transfer}</p>
                            <p className="font-black text-lg text-indigo-700 dark:text-indigo-400">SAR {bankSales.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Total Sales This Shift</span>
                        <span className="font-black text-xl text-slate-900 dark:text-white">SAR {totalSales.toLocaleString()}</span>
                    </div>

                    {/* Close Shift Form */}
                    <form onSubmit={handleClose} className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-6 space-y-5">
                        <h3 className="font-black text-rose-700 dark:text-rose-400 flex items-center gap-2">
                            <StopCircle className="w-5 h-5" /> {t.close_reconcile}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t.closing_meter}</label>
                                <Input
                                    type="number" name="closingMeter" step="0.01" required
                                    placeholder={(activeShift.openingMeter + activeShift.expectedLiters).toString()}
                                    className="h-12 font-mono font-bold text-base" disabled={pending}
                                />
                                <p className="text-[10px] text-slate-400">{t.closing_meter_hint}</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t.actual_cash}</label>
                                <Input
                                    type="number" name="actualCash" step="0.01" required
                                    placeholder="0.00" className="h-12 font-mono font-bold text-base" disabled={pending}
                                />
                                <p className="text-[10px] text-slate-400">{t.actual_cash_hint}</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t.actual_bank}</label>
                                <Input
                                    type="number" name="actualBank" step="0.01" required
                                    placeholder="0.00" className="h-12 font-mono font-bold text-base" disabled={pending}
                                />
                                <p className="text-[10px] text-slate-400">{t.actual_bank_hint}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                Closing the shift is final. Ensure all meter readings and cash counts are accurate before proceeding.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={pending}
                            className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                        >
                            {pending
                                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Closing Shift...</>
                                : <><StopCircle className="w-5 h-5 mr-2" /> {t.submit_close}</>
                            }
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
