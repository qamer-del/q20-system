"use client"

import { openShift, closeShift, approveShift } from "@/features/shifts/actions"
import { assignLiability } from "@/features/liabilities/actions"
import { PlayCircle, StopCircle, Fuel, CheckCircle2, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

// ============================================================
// Smart Arabic Note Display Component
// ============================================================
function SmartNoteCard({ note, cashVariance, meterVariance }: {
  note: string
  cashVariance?: number | null
  meterVariance?: number | null
}) {
  const isAllGood = (cashVariance ?? 0) === 0 && (meterVariance ?? 0) === 0

  return (
    <div
      dir="rtl"
      className={`rounded-2xl border-2 p-5 mt-4 space-y-3 ${
        isAllGood
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
          : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
      }`}
    >
      <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isAllGood ? "text-emerald-600" : "text-amber-600"}`}>
        {isAllGood ? "✅ ملخص الوردية" : "⚠️ ملخص الوردية"}
      </p>
      <p className={`text-sm font-bold leading-relaxed ${isAllGood ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}>
        {note}
      </p>

      {/* Variance pills */}
      {(cashVariance !== null && cashVariance !== undefined) && (
        <div className="flex gap-2 flex-wrap mt-3">
          <VariancePill label="النقد" value={cashVariance} unit="ريال" />
          {(meterVariance !== null && meterVariance !== undefined) && (
            <VariancePill label="العداد" value={meterVariance} unit="لتر" />
          )}
        </div>
      )}
    </div>
  )
}

function VariancePill({ label, value, unit }: { label: string; value: number; unit: string }) {
  const isShortage = value < 0
  const isOverage = value > 0
  const isMatch = value === 0

  const colorClass = isMatch
    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
    : isShortage
    ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300"
    : "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"

  const Icon = isMatch ? Minus : isShortage ? TrendingDown : TrendingUp

  return (
    <span dir="rtl" className={`inline-flex items-center gap-1.5 text-[11px] font-bold border rounded-full px-3 py-1 ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {label}:{" "}
      {isMatch ? "مطابق ✓" : isShortage ? `نقص ${Math.abs(value).toFixed(2)} ${unit}` : `زيادة ${Math.abs(value).toFixed(2)} ${unit}`}
    </span>
  )
}

// ============================================================
// Status Badge
// ============================================================
function ShiftStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; dot: string }> = {
    OPEN: {
      label: "مفتوحة",
      cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
      dot: "bg-blue-500"
    },
    CLOSED_PENDING: {
      label: "بانتظار الاعتماد",
      cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
      dot: "bg-amber-500 animate-pulse"
    },
    APPROVED: {
      label: "معتمدة",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
      dot: "bg-emerald-500"
    },
    CLOSED: {
      label: "مغلقة",
      cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
      dot: "bg-slate-400"
    }
  }

  const c = config[status] ?? config.CLOSED
  return (
    <span dir="rtl" className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${c.cls}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ============================================================
// OPEN SHIFT FORMS
// ============================================================
export function OpenShiftForms({ pumps, dict }: { pumps: any[], dict: any }) {
  const t = dict.Shifts

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
          <PlayCircle className="text-emerald-500 w-5 h-5" /> {t.open_shift}
        </CardTitle>
        <CardDescription>{t.select_pump_desc}</CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pumps.map((pump: any) => (
            <ActionForm action={(d) => handleOpenPromise(d, pump.id)} successMessage={t.open_shift + " ✓"} key={pump.id} className="relative group cursor-default">
              <div className={`w-full text-left bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-6 rounded-3xl transition-all relative overflow-hidden ${pump.status === 'ACTIVE' ? 'hover:border-emerald-500 hover:shadow-lg' : 'opacity-50'}`}>
                {pump.status !== "ACTIVE" && (
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">{pump.status}</span>
                  </div>
                )}
                <Fuel className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-4 group-hover:text-emerald-500 transition-colors" />
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">{pump.name}</h3>
                <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-2">{pump.tank.fuelType.name}</p>

                <div className="mt-6 space-y-5 relative z-20">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                      {t.opening_meter}
                    </label>
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
                    <p className="text-[10px] text-slate-400 leading-snug">{t.opening_meter_hint}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                      {t.opening_cash}
                    </label>
                    <Input
                      type="number"
                      name="openingCash"
                      required
                      step="0.01"
                      placeholder="0.00"
                      defaultValue="0.00"
                      className="font-mono font-bold text-base bg-slate-50"
                      disabled={pump.status !== "ACTIVE"}
                    />
                    <p className="text-[10px] text-slate-400 leading-snug">{t.opening_cash_hint}</p>
                  </div>

                  <SubmitButton
                    className="w-full mt-2 font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl"
                    disabled={pump.status !== "ACTIVE"}
                  >
                    {t.open_shift}
                  </SubmitButton>
                </div>
              </div>
            </ActionForm>
          ))}
          {pumps.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t.no_pumps}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// CLOSE SHIFT FORM (Cashier - sets status to CLOSED_PENDING)
// ============================================================
export function CloseShiftForm({
  activeShift,
  currentUserRole,
  currentUserId,
  dict
}: {
  activeShift: any,
  currentUserRole?: string,
  currentUserId?: string,
  dict: any
}) {
  const t = dict.Shifts
  const isOwner = String(activeShift.userId) === String(currentUserId)
  const isAuthorizedFull = currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER'
  const canClose = (currentUserRole === 'CASHIER' && isOwner) || isAuthorizedFull

  if (!canClose) return null

  const isOverride = !isOwner && isAuthorizedFull

  return (
    <Card className={`border-t-4 shadow-xl overflow-hidden relative ${isOverride ? 'border-t-amber-500' : 'border-t-blue-500'}`}>
      <div className={`absolute top-0 right-0 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-2 ${isOverride ? 'bg-amber-500' : 'bg-blue-500'}`}>
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        {isOverride ? `${t.supervising}: ${activeShift.user.name}` : t.your_active_shift}
      </div>

      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-3xl font-black">{activeShift.pump.name}</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">
              {t.dispensing}: <span className="text-blue-600 dark:text-blue-400">{activeShift.pump.tank.fuelType.name}</span>
            </CardDescription>
          </div>
          {isOverride && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t.operator}</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">{activeShift.user.name}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-8">
        {/* Opening Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">{t.opening_status}</span>
            <div className="space-y-1">
              <p className="font-mono text-xl font-black text-slate-700 dark:text-slate-300">
                {activeShift.openingMeter.toLocaleString()} L
              </p>
              <p className="text-xs font-bold text-slate-400 tracking-tight">
                {t.opening_cash}: SAR {activeShift.openingCash?.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 mb-2 flex items-center gap-2">
              <Fuel className="w-3 h-3" /> {t.expected_closure}
            </span>
            <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400 block tracking-tight">
              {(activeShift.openingMeter + activeShift.expectedLiters).toLocaleString()} L
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-2 block uppercase">
              {t.throughput}: {activeShift.expectedLiters.toLocaleString()}L
            </span>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 mb-2 block">{t.expected_collections}</span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                {t.cash_payment}: <span>SAR {activeShift.sales.filter((s: any) => s.paymentMethod === 'CASH').reduce((sum: number, s: any) => sum + s.totalAmount, 0).toLocaleString()}</span>
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                {t.bank_transfer}: <span>SAR {activeShift.sales.filter((s: any) => s.paymentMethod === 'BANK').reduce((sum: number, s: any) => sum + s.totalAmount, 0).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Close Shift Form */}
        <ActionForm
          action={async (d) => {
            d.append("shiftId", activeShift.id)
            const res: any = await closeShift(d)
            if (res?.error) throw new Error(res.error)
            return res
          }}
          successMessage={isOverride ? `${activeShift.user.name} — ${t.close_shift} ✓` : "تم إغلاق الوردية – بانتظار الاعتماد ✓"}
          loadingMessage={isOverride ? "جارٍ الإغلاق والمطابقة..." : "جارٍ إغلاق الوردية..."}
          confirmMessage={isOverride
            ? `تأكيد إغلاق وردية ${activeShift.user.name}؟`
            : "هل أنت متأكد من إغلاق الوردية؟ تحقق من صحة جميع القراءات."}
          className={`${isOverride ? 'bg-amber-50/50 border-amber-100' : 'bg-rose-50/50 border-rose-100'} p-8 rounded-[2rem] border dark:bg-slate-900/40 dark:border-slate-800`}
        >
          <h3 className={`font-black mb-6 flex items-center gap-2 ${isOverride ? 'text-amber-700 dark:text-amber-400' : 'text-rose-900 dark:text-rose-400'}`}>
            <StopCircle className="w-5 h-5" /> {isOverride ? t.supervisor_recon : t.close_reconcile}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Closing Meter */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t.closing_meter}</label>
              <Input
                type="number"
                name="closingMeter"
                step="0.01"
                required
                placeholder={((activeShift.openingMeter + activeShift.expectedLiters)).toString()}
                className="h-14 font-mono font-bold text-lg"
              />
              <p className="text-[10px] text-slate-400 leading-snug">{t.closing_meter_hint}</p>
            </div>

            {/* Actual Cash */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t.actual_cash}</label>
              <Input
                type="number"
                name="actualCash"
                step="0.01"
                required
                placeholder="0.00"
                className="h-14 font-mono font-bold text-lg"
              />
              <p className="text-[10px] text-slate-400 leading-snug">{t.actual_cash_hint}</p>
            </div>

            {/* Actual Bank/Card */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{t.actual_bank}</label>
              <Input
                type="number"
                name="actualBank"
                step="0.01"
                required
                placeholder="0.00"
                className="h-14 font-mono font-bold text-lg"
              />
              <p className="text-[10px] text-slate-400 leading-snug">{t.actual_bank_hint}</p>
            </div>
          </div>

          {/* Info banner about pending approval */}
          {!isOverride && (
            <div dir="rtl" className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                بعد الإغلاق، سيتم إرسال الوردية للمشرف لمراجعتها واعتمادها.
              </p>
            </div>
          )}

          <SubmitButton variant={isOverride ? 'secondary' : 'default'} className={`w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-lg ${!isOverride && 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {isOverride ? t.finalize_external : t.submit_close}
          </SubmitButton>
        </ActionForm>

      </CardContent>
    </Card>
  )
}

// ============================================================
// PENDING APPROVAL CARD (Cashier view after closing)
// ============================================================
export function PendingApprovalCard({ shift, dict }: { shift: any, dict: any }) {
  const t = dict.Shifts
  const cashVar = shift.cashVariance ?? 0
  const meterVar = (shift.actualLiters ?? 0) - (shift.expectedLiters ?? 0)

  return (
    <Card className="border-t-4 border-t-amber-500 shadow-xl overflow-hidden">
      <div className="absolute top-0 right-0 bg-amber-500 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        بانتظار الاعتماد
      </div>

      <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 pb-6 pt-8">
        <CardTitle className="text-2xl font-black text-amber-800 dark:text-amber-200 flex items-center gap-3">
          <Clock className="w-6 h-6" />
          {shift.pump.name} — تم إغلاق الوردية
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300 font-bold">
          الوردية في انتظار مراجعة المشرف / المحاسب واعتمادها.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Summary stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="قراءة الافتتاح" value={`${shift.openingMeter?.toLocaleString()} L`} />
          <StatBox label="قراءة الإغلاق" value={`${shift.closingMeter?.toLocaleString()} L`} />
          <StatBox label="النقد المتوقع" value={`SAR ${shift.expectedCash?.toLocaleString()}`} />
          <StatBox label="النقد الفعلي" value={`SAR ${shift.actualCash?.toLocaleString()}`} />
        </div>

        {/* Smart auto-generated note */}
        {shift.systemGeneratedNote && (
          <SmartNoteCard
            note={shift.systemGeneratedNote}
            cashVariance={cashVar}
            meterVariance={meterVar}
          />
        )}

        <div dir="rtl" className="mt-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
            لا يمكن تعديل الوردية المغلقة. انتظر اعتماد المشرف.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div dir="rtl" className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="font-mono font-black text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  )
}

// ============================================================
// ADMIN APPROVAL CARD
// ============================================================
export function AdminApprovalCard({ shift, dict }: { shift: any, dict: any }) {
  const cashVar = shift.cashVariance ?? 0
  const meterVar = (shift.actualLiters ?? 0) - (shift.expectedLiters ?? 0)

  return (
    <Card className="border-t-4 border-t-violet-500 shadow-xl overflow-hidden">
      <CardHeader className="bg-violet-50/50 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-900/30 pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-black text-violet-800 dark:text-violet-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              {shift.pump.name} — {shift.user.name}
            </CardTitle>
            <CardDescription className="font-bold text-violet-600 dark:text-violet-400 mt-1">
              بانتظار الاعتماد · {shift.closedAt ? new Date(shift.closedAt).toLocaleString("ar-SA") : "—"}
            </CardDescription>
          </div>
          <ShiftStatusBadge status={shift.status} />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Full reconciliation summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="النقد المتوقع" value={`SAR ${shift.expectedCash?.toFixed(2)}`} />
          <StatBox label="النقد الفعلي" value={`SAR ${shift.actualCash?.toFixed(2)}`} />
          <StatBox label="فرق النقد" value={`${cashVar >= 0 ? "+" : ""}${cashVar.toFixed(2)} ﷼`} />
          <StatBox label="فرق العداد" value={`${meterVar >= 0 ? "+" : ""}${meterVar.toFixed(2)} L`} />
        </div>

        {/* System-generated smart note */}
        {shift.systemGeneratedNote && (
          <SmartNoteCard
            note={shift.systemGeneratedNote}
            cashVariance={cashVar}
            meterVariance={meterVar}
          />
        )}

        {/* Manual Liability Assignment (If shortage) */}
        {cashVar < 0 && shift.status === "CLOSED_PENDING" && (
          <ActionForm
            action={async (d) => {
              d.append("shiftId", shift.id)
              const res: any = await assignLiability(d)
              if (res?.error) throw new Error(res.error)
              return res
            }}
            successMessage="تم تعيين الالتزام بنجاح ✓"
            loadingMessage="جارٍ تعيين الالتزام..."
            className="mt-4"
          >
            <SubmitButton className="w-full h-12 rounded-xl font-bold tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-md">
              ⚠️ تحميل العامل مسؤولية النقص
            </SubmitButton>
          </ActionForm>
        )}

        {/* Approval action form */}
        <ActionForm
          action={async (d) => {
            d.append("shiftId", shift.id)
            const res: any = await approveShift(d)
            if (res?.error) throw new Error(res.error)
            return res
          }}
          successMessage="تم اعتماد الوردية بنجاح ✓"
          loadingMessage="جارٍ الاعتماد..."
          className="mt-6 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900 p-6 rounded-2xl"
        >
          <div className="space-y-4">
            <div dir="rtl" className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-violet-700 dark:text-violet-400 block">
                ملاحظة الاعتماد (اختياري)
              </label>
              <Textarea
                name="approvalNote"
                dir="rtl"
                rows={2}
                placeholder="مثال: تمت مراجعة النقص وقبوله"
                className="font-bold resize-none text-sm"
              />
            </div>
            <SubmitButton className="w-full h-14 rounded-xl font-black tracking-widest bg-violet-600 hover:bg-violet-700 text-white shadow-lg">
              ✅ اعتماد الوردية
            </SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  )
}

// ============================================================
// APPROVED SHIFT CARD (Read-only display)
// ============================================================
export function ApprovedShiftCard({ shift, dict }: { shift: any, dict: any }) {
  const cashVar = shift.cashVariance ?? 0
  const meterVar = (shift.actualLiters ?? 0) - (shift.expectedLiters ?? 0)

  return (
    <Card className="border-t-4 border-t-emerald-500 shadow-xl overflow-hidden">
      <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30 pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              {shift.pump.name} — {shift.user.name}
            </CardTitle>
            <CardDescription className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              تمت الموافقة بواسطة: {shift.approvedBy?.name ?? "—"} · {shift.approvedAt ? new Date(shift.approvedAt).toLocaleString("ar-SA") : "—"}
            </CardDescription>
          </div>
          <ShiftStatusBadge status={shift.status} />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="النقد المتوقع" value={`SAR ${shift.expectedCash?.toFixed(2)}`} />
          <StatBox label="النقد الفعلي" value={`SAR ${shift.actualCash?.toFixed(2)}`} />
          <StatBox label="فرق النقد" value={`${cashVar >= 0 ? "+" : ""}${cashVar.toFixed(2)} ﷼`} />
          <StatBox label="فرق العداد" value={`${meterVar >= 0 ? "+" : ""}${meterVar.toFixed(2)} L`} />
        </div>

        {shift.systemGeneratedNote && (
          <SmartNoteCard note={shift.systemGeneratedNote} cashVariance={cashVar} meterVariance={meterVar} />
        )}

        {shift.approvalNote && (
          <div dir="rtl" className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">ملاحظة المعتمد</p>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{shift.approvalNote}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// STANDALONE LIABILITY BUTTON (For History Table)
// ============================================================
export function AssignLiabilityStandaloneBtn({ shiftId }: { shiftId: string }) {
  return (
    <ActionForm
      action={async (d) => {
        d.append("shiftId", shiftId)
        const res: any = await assignLiability(d)
        if (res?.error) throw new Error(res.error)
        return res
      }}
      successMessage="تم تعيين الالتزام بنجاح ✓"
      loadingMessage="جارٍ التعيين..."
    >
      <SubmitButton className="mt-2 w-full h-8 rounded text-[10px] uppercase font-bold tracking-widest bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-300 shadow-sm border border-rose-200 dark:border-rose-800">
        تحميل العمل مسؤولية النقص
      </SubmitButton>
    </ActionForm>
  )
}
