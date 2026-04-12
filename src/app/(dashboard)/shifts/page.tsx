import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PlayCircle, StopCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OpenShiftForms, CloseShiftForm, PendingApprovalCard, AdminApprovalCard, ApprovedShiftCard, AssignLiabilityStandaloneBtn } from "./ShiftForms"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function ShiftsPage() {
  const session = await protectRoute(["ADMIN", "MANAGER", "CASHIER"])
  const dict = await getTranslation()
  const t = (dict as any).Shifts

  const role = (session?.user as any)?.role
  const userId = (session?.user as any)?.id

  if (!userId || !role) {
    redirect("/login")
  }

  const pumps = await prisma.pump.findMany({
    include: { tank: { include: { fuelType: true } } }
  })

  // Active (OPEN) shifts
  const activeShifts = await prisma.shift.findMany({
    where: {
      status: "OPEN",
      ...(role === "CASHIER" ? { userId } : {})
    },
    include: {
      user: true,
      sales: true,
      pump: { include: { tank: { include: { fuelType: true } } } }
    }
  })

  const myActiveShift = activeShifts.find(s => s.userId === userId)

  // CLOSED_PENDING shifts: for cashier — their own; for admin/manager — all
  const pendingShifts = await prisma.shift.findMany({
    where: {
      status: "CLOSED_PENDING",
      ...(role === "CASHIER" ? { userId } : {})
    },
    include: {
      user: true,
      sales: true,
      pump: { include: { tank: { include: { fuelType: true } } } },
      approvedBy: true
    },
    orderBy: { closedAt: "desc" }
  })

  // History: CLOSED or APPROVED
  const historyStatuses = ["CLOSED", "APPROVED"] as const
  const historyShifts = await prisma.shift.findMany({
    where: {
      status: { in: historyStatuses as any },
      ...(role === "CASHIER" ? { userId } : {})
    },
    include: {
      pump: true,
      user: true,
      sales: true,
      approvedBy: true,
      liabilities: true
    },
    orderBy: { closedAt: "desc" },
    take: 20
  })

  const isAdminOrManager = role === "ADMIN" || role === "MANAGER"

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
          <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-3 md:gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
              <Clock className="w-8 h-8" />
            </div>
            {t.title}
          </h1>

          {isAdminOrManager && (
            <div className="flex items-center gap-3">
              {pendingShifts.length > 0 && (
                <span className="bg-amber-500 text-white font-black text-[11px] tracking-widest uppercase px-4 py-2 rounded-full shadow-md animate-pulse">
                  ⏳ {pendingShifts.length} وردية بانتظار الاعتماد
                </span>
              )}
              <span className="bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-900/50 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-sm">
                {t.supervision_mode}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================
            SECTION 1: ACTIVE (OPEN) SHIFTS
        ============================================================ */}
        <div className="space-y-6">
          {activeShifts.length > 0 ? (
            <div className="space-y-6">
              {role === "CASHIER" && (
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <StopCircle className="w-4 h-4" /> {t.your_active_shift}
                </h2>
              )}
              {isAdminOrManager && (
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <StopCircle className="w-4 h-4" /> الورديات المفتوحة الحالية
                </h2>
              )}
              <div className="grid grid-cols-1 gap-8">
                {activeShifts.map((s) => (
                  <CloseShiftForm key={s.id} activeShift={s} currentUserRole={role} currentUserId={userId} dict={dict} />
                ))}
              </div>
            </div>
          ) : role === "CASHIER" && pendingShifts.length === 0 ? (
            <OpenShiftForms pumps={pumps} dict={dict} />
          ) : role !== "CASHIER" ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 rounded-[2rem] text-center">
              <p className="text-slate-400 font-bold uppercase tracking-widest">{t.no_active}</p>
              <p className="text-xs text-slate-500 mt-2">{t.no_active_desc}</p>
            </div>
          ) : null}

          {/* If Admin/Manager wants to open their own shift */}
          {isAdminOrManager && !myActiveShift && (
            <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <PlayCircle className="w-4 h-4" /> {t.personal_session}
              </h2>
              <OpenShiftForms pumps={pumps} dict={dict} />
            </div>
          )}
        </div>

        {/* ============================================================
            SECTION 2: PENDING APPROVAL — Cashier sees own, Admin sees all
        ============================================================ */}
        {pendingShifts.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-amber-500">
              <Clock className="w-4 h-4" />
              {isAdminOrManager ? "الورديات المنتظرة للاعتماد" : "الوردية المغلقة — بانتظار الاعتماد"}
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {pendingShifts.map((s: any) =>
                isAdminOrManager ? (
                  <AdminApprovalCard key={s.id} shift={s} dict={dict} />
                ) : (
                  <PendingApprovalCard key={s.id} shift={s} dict={dict} />
                )
              )}
            </div>
            {/* Cashier who just closed — prompt them to start a new shift or wait */}
            {role === "CASHIER" && (
              <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-amber-200 dark:border-amber-900 p-8 rounded-[2rem] text-center" dir="rtl">
                <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-bold">وردية سابقة بانتظار اعتماد المشرف. لا يمكنك فتح وردية جديدة حتى يتم الاعتماد.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            SECTION 3: SHIFT AUDIT HISTORY (CLOSED + APPROVED)
        ============================================================ */}
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-8">
            <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-widest font-black text-slate-500">
              <Clock className="w-5 h-5" /> {t.audit_history}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                    <th className="p-6">{t.date_cashier}</th>
                    <th className="p-6">{t.pump_meter}</th>
                    <th className="p-6">{t.quantity_analysis}</th>
                    <th className="p-6">{t.financial_summary}</th>
                    <th className="p-6">الحالة / الملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {historyShifts.map((s: any) => {
                    const discrepancy = roundLiters((s.actualLiters || 0) - s.expectedLiters)
                    const isPerfect = Math.abs(discrepancy) < 0.1
                    const totalSales = s.sales?.reduce((sum: number, sale: any) => sum + sale.totalAmount, 0) || 0
                    const cVar = s.cashVariance || 0

                    return (
                      <tr key={s.id} className="border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-6">
                          <p className="font-black text-slate-900 dark:text-white capitalize text-base">{s.user.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-1">
                            {s.openedAt.toLocaleDateString()} {s.openedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {s.closedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-600 dark:text-slate-400">{s.pump.name}</p>
                          <p className="text-xs font-mono mt-1 text-slate-400">{s.openingMeter}L &rarr; {s.closingMeter}L</p>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-slate-800 dark:text-slate-200">{s.actualLiters?.toLocaleString()} L</span>
                            {isPerfect ? (
                              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                ✓ {t.variance_exact}
                              </span>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ${discrepancy > 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
                                <AlertTriangle className="w-3 h-3" /> {discrepancy > 0 ? '+' : ''}{discrepancy} L {t.variance_label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.financial_summary}</span>
                              <span className="font-mono font-black text-slate-700 dark:text-slate-300">SAR {totalSales.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.cash_variance}</span>
                              <span className={`font-mono font-bold text-xs ${cVar === 0 ? 'text-slate-400' : cVar > 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
                                {cVar === 0 ? t.balanced : `${cVar > 0 ? '+' : ''}${cVar.toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 min-w-[160px]">
                          <div className="space-y-2">
                            {/* Status badge */}
                            <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider
                              ${s.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.status === "APPROVED" ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {s.status === "APPROVED" ? "معتمدة" : "مغلقة"}
                            </span>
                            {/* Approval info */}
                            {s.status === "APPROVED" && s.approvedBy && (
                              <p className="text-[10px] text-slate-400 font-bold">
                                <CheckCircle2 className="w-3 h-3 inline-block text-emerald-500 mr-1" />
                                {s.approvedBy.name}
                              </p>
                            )}
                            {/* Smart note snippet */}
                            {s.systemGeneratedNote && (
                              <p dir="rtl" className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                                {s.systemGeneratedNote}
                              </p>
                            )}
                            
                            {/* Assign Liability if shortage and none exists and is admin/manager */}
                            {isAdminOrManager && s.status === "APPROVED" && cVar < 0 && s.liabilities?.length === 0 && (
                              <div className="mt-2 text-right">
                                <AssignLiabilityStandaloneBtn shiftId={s.id} />
                              </div>
                            )}

                            {/* Indicate if liability exists */}
                            {s.liabilities?.length > 0 && (
                              <div className="mt-2 text-right">
                                <span className="inline-block bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[9px] font-black uppercase px-2 py-1 rounded">
                                  ⚠️ تم تسجيل التزام
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {historyShifts.length === 0 && (
                <div className="py-20 text-center text-slate-400 italic">{t.no_history}</div>
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
