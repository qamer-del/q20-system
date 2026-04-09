"use client"

import { useState } from "react"
import { processSale } from "@/features/sales/actions"
import { useI18n } from "@/components/I18nProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { roundSAR } from "@/lib/financial"

export default function PosClient({ activeShift }: { activeShift: any }) {
  const { t } = useI18n()
  const [inputMode, setInputMode] = useState<"AMOUNT" | "LITERS">("AMOUNT")
  const [liters, setLiters] = useState("")
  const [sarAmount, setSarAmount] = useState("")

  const [selectedPayment, setSelectedPayment] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState("")

  const activeTank = activeShift.pump.tank
  const pricePerLiter = activeTank?.fuelType.pricePerLiter || 0

  // Live conversion logic
  const handleAmountChange = (val: string) => {
    setSarAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      setLiters((num / pricePerLiter).toFixed(2))
    } else {
      setLiters("")
    }
  }

  const handleLitersChange = (val: string) => {
    setLiters(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      setSarAmount((num * pricePerLiter).toFixed(2))
    } else {
      setSarAmount("")
    }
  }

  const quantity = parseFloat(liters) || 0
  const totalAmount = roundSAR(quantity * pricePerLiter)
  const netAmount = roundSAR(totalAmount / 1.15)
  const vatAmount = roundSAR(totalAmount - netAmount)

  const handleSale = async (formData: FormData) => {
    setIsProcessing(true)
    setMessage("")
    try {
      if (!selectedPayment) throw new Error(t("err_no_payment"))
      if (quantity <= 0) throw new Error(t("err_invalid_qty"))
      if (quantity > activeTank.currentVolume) throw new Error(`${t("err_volume_exceeded")} (${roundSAR(activeTank.currentVolume)}L).`)

      // Inject shift context
      formData.append("shiftId", activeShift.id)
      formData.append("pumpId", activeShift.pumpId)
      formData.append("tankId", activeTank.id)
      formData.set("quantity", liters) // Ensure we send the final calculated liters

      await processSale(formData)
      setLiters("")
      setSarAmount("")
      setSelectedPayment("")
      setMessage(t("success_msg"))
    } catch (e: any) {
      setMessage(t("error") + ": " + e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">

      {/* PUMP CONTROL AND KEYPAD */}
      <Card className="flex-1 shadow-xl border-t-8 border-t-emerald-500">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-black flex items-center gap-3">
                {t("terminal")}: {activeShift.pump.name}
              </CardTitle>
              <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                {t("status")}: <span className="text-emerald-500 uppercase tracking-widest text-[10px]">{t("active_shift")}</span>
              </p>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setInputMode("AMOUNT")}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'AMOUNT' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-400 opacity-60'}`}
              >
                By Amount
              </button>
              <button
                onClick={() => setInputMode("LITERS")}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'LITERS' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-400 opacity-60'}`}
              >
                By Liters
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleSale} className="space-y-8">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 dark:text-emerald-400/60 mb-1">{t("dispensing")}</p>
                <p className="text-xl font-black text-emerald-800 dark:text-emerald-400">{activeTank.name}</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">{activeTank.fuelType.code} — SAR {activeTank.fuelType.pricePerLiter}/L</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 dark:text-emerald-400/60 mb-1">{t("system_available")}</p>
                <p className="text-2xl font-mono font-black text-emerald-800 dark:text-emerald-500">{activeTank.currentVolume.toLocaleString()} <span className="text-sm">{t("liters")}</span></p>
              </div>
            </div>

            {/* DUAL INPUT SYSTEM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <div className={`space-y-3 transition-all duration-300 ${inputMode === 'LITERS' && 'opacity-60 scale-95 pointer-events-none'}`}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Enter Amount (SAR)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={sarAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    disabled={inputMode === 'LITERS'}
                    className="h-24 text-4xl font-mono text-center font-black !rounded-3xl dark:text-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-600/20 border-2"
                  />
                  {inputMode === 'AMOUNT' && (
                    <div className="absolute top-2 right-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Primary Input</div>
                  )}
                </div>
              </div>

              <div className={`space-y-3 transition-all duration-300 ${inputMode === 'AMOUNT' && 'opacity-60 scale-95 pointer-events-none'}`}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Enter Liters (L)</label>
                <div className="relative">
                  <Input
                    type="number"
                    name="quantity"
                    value={liters}
                    onChange={(e) => handleLitersChange(e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    disabled={inputMode === 'AMOUNT'}
                    className="h-24 text-4xl font-mono text-center font-black !rounded-3xl dark:text-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-600/20 border-2"
                  />
                  {inputMode === 'LITERS' && (
                    <div className="absolute top-2 right-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Primary Input</div>
                  )}
                </div>
              </div>

              {/* Helper badge */}
              <div className="col-span-full text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800">
                  Auto-calculating at SAR {pricePerLiter.toFixed(3)} per liter
                </span>
              </div>
            </div>

            {/* PAYMENT METHOD — Required Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                {t("payment_method")}
                {!selectedPayment && quantity > 0 && (
                  <span className="text-rose-500 text-[10px] font-bold animate-pulse">← Required</span>
                )}
              </label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    className="peer hidden"
                    checked={selectedPayment === "CASH"}
                    onChange={() => setSelectedPayment("CASH")}
                  />
                  <div className="peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600 peer-checked:shadow-lg peer-checked:shadow-emerald-900/20 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center font-bold transition-all uppercase tracking-widest text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{t("cash")}</div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANK"
                    className="peer hidden"
                    checked={selectedPayment === "BANK"}
                    onChange={() => setSelectedPayment("BANK")}
                  />
                  <div className="peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 peer-checked:shadow-lg peer-checked:shadow-indigo-900/20 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center font-bold transition-all uppercase tracking-widest text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {t("bank") || "Bank"}
                  </div>
                </label>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${message.includes(t("success_msg")) ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-900 dark:text-rose-400"}`}>
                {message.includes(t("success_msg")) ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={isProcessing || quantity <= 0 || !selectedPayment}
              className="w-full h-16 text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest font-black"
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : !selectedPayment && quantity > 0 ? t("select_payment") : t("authorize_pump")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* LIVE RECEIPT PREVIEW */}
      <Card className="w-full lg:w-96 flex flex-col shrink-0 shadow-lg relative overflow-hidden h-fit">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full blur-3xl -mx-4 -mt-4 pointer-events-none" />
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-dashed border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <CardTitle className="text-center font-bold tracking-widest uppercase text-slate-500 text-sm">{t("station_receipt")}</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 font-mono text-sm space-y-5 px-6 pb-8">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="uppercase tracking-widest text-[10px]">{t("fuel_type")}</span>
            <span className="text-slate-900 dark:text-white text-base">{activeTank?.fuelType.name || "-"}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="uppercase tracking-widest text-[10px]">{t("price_per_l")}</span>
            <span className="text-slate-900 dark:text-white text-base">SAR {pricePerLiter.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-bold border-b border-dashed border-slate-200 dark:border-slate-700 pb-4">
            <span className="uppercase tracking-widest text-[10px]">{t("quantity")}</span>
            <span className="text-slate-900 dark:text-white text-base">{quantity.toFixed(2)} L</span>
          </div>

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="uppercase tracking-widest text-[10px]">{t("payment_method")}</span>
            <span className={`text-base font-black ${selectedPayment === "CASH" ? "text-emerald-600" : selectedPayment === "BANK" ? "text-indigo-600" : "text-slate-300 dark:text-slate-700"}`}>
              {selectedPayment || "—"}
            </span>
          </div>

          <div className="pt-2 space-y-3 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
            <div className="flex justify-between">
              <span>{t("net_amount")}</span>
              <span className="text-slate-900 dark:text-white text-sm">SAR {netAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("vat")}</span>
              <span className="text-slate-900 dark:text-white text-sm">SAR {vatAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl mt-8 border border-emerald-100 dark:border-emerald-900/50">
            <span className="font-bold uppercase tracking-widest text-[10px] text-emerald-600 dark:text-emerald-400">{t("grand_total")}</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-500">SAR {totalAmount.toFixed(2)}</span>
          </div>

          <div className="mt-8 text-center bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-dotted border-slate-200 dark:border-slate-800">
            <div className="w-24 h-24 mx-auto bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow flex items-center justify-center rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10 text-center leading-tight">{t("sync_zatca")}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">{t("encrypted_payload")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
