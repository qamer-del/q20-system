"use client"

import { updateLiabilityStatus } from "@/features/liabilities/actions"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Clock, Ban, Wallet, ArrowRightLeft, ShieldAlert } from "lucide-react"
import { useState } from "react"

export default function LiabilityItem({ liability }: { liability: any }) {
  const isPending = liability.status === "PENDING" || liability.status === "DISPUTED"
  const [selectedStatus, setSelectedStatus] = useState<string>("SETTLED")

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    PENDING: { label: "معلّق", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
    DISPUTED: { label: "قيد المراجعة / نزاع", color: "bg-orange-100 text-orange-700 border-orange-200", icon: ShieldAlert },
    SETTLED: { label: "تم السداد نقداً", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    SALARY_DEDUCTION: { label: "خصم من الراتب", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Wallet },
    WAIVED: { label: "إعفاء / شطب", color: "bg-slate-100 text-slate-500 border-slate-200", icon: Ban },
    TRANSFERRED: { label: "تم التحويل للمشرف", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: ArrowRightLeft },
  }

  const currentStatus = statusMap[liability.status] || statusMap.PENDING

  return (
    <div dir="rtl" className={`p-6 border-2 rounded-2xl flex flex-col gap-6 transition-all ${
      isPending 
        ? "bg-white border-slate-200 shadow-sm" 
        : "bg-slate-50 border-slate-100 opacity-80"
    }`}>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="font-black text-xl text-slate-900 dark:text-slate-100">{liability.user.name}</p>
            <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full border flex items-center gap-1.5 ${currentStatus.color}`}>
              <currentStatus.icon className="w-3 h-3" />
              {currentStatus.label}
            </span>
          </div>
          
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
            البند: {liability.reason}
          </p>
          
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>تاريخ النشؤ: {new Date(liability.createdAt).toLocaleDateString("ar-SA")}</span>
            {liability.settledAt && (
              <span>تاريخ الإغلاق: {new Date(liability.settledAt).toLocaleDateString("ar-SA")}</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className={`font-mono text-3xl font-black ${isPending ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            SAR {liability.amount.toLocaleString()}
          </p>
        </div>
      </div>

      {liability.notes && (
        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-sm italic text-slate-600 border-r-4 border-slate-400">
           ملاحظات إدارية: {liability.notes}
        </div>
      )}

      {isPending && (
        <div className="pt-4 border-t border-slate-100 mt-2">
          <ActionForm
            action={async (d) => {
              d.append("liabilityId", liability.id)
              d.append("status", selectedStatus)
              const res: any = await updateLiabilityStatus(d)
              if (res?.error) throw new Error(res.error)
              return res
            }}
            successMessage="تم تحديث حالة الالتزام بنجاح ✓"
            loadingMessage="جارٍ المعالجة..."
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">الإجراء المطلوب</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "SETTLED", label: "سداد نقدي", icon: Wallet },
                    { val: "SALARY_DEDUCTION", label: "خصم راتب", icon: Clock },
                    { val: "DISPUTED", label: "نزاع / مراجعة", icon: ShieldAlert },
                    { val: "WAIVED", label: "إعفاء", icon: Ban },
                    { val: "TRANSFERRED", label: "تحويل للمشرف", icon: ArrowRightLeft },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSelectedStatus(opt.val)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                        selectedStatus === opt.val 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                        : "bg-white text-slate-600 border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">ملاحظات القرار / التفاصيل</label>
                <Textarea 
                  name="notes"
                  placeholder="أدخل مبررات القرار أو تفاصيل السداد هنا..."
                  className="min-h-[85px] text-sm font-medium"
                />
              </div>
            </div>

            <SubmitButton className="w-full h-11 rounded-xl font-black tracking-widest bg-slate-900 hover:bg-black text-white shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.99]">
              حفظ وتأكيد الإجراء
            </SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  )
}

