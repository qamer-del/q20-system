import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { redirect } from "next/navigation"
import { ShieldAlert, TrendingDown, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LiabilityItem from "./LiabilityItem"

export default async function LiabilitiesPage() {
  const session = await protectRoute(["ADMIN", "MANAGER"])

  const role = (session?.user as any)?.role
  const userId = (session?.user as any)?.id

  if (!userId || !role) {
    redirect("/login")
  }

  // Cashiers CANNOT view liabilities page
  if (role === "CASHIER") {
    redirect("/dashboard")
  }

  const liabilities = await prisma.employeeLiability.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  })

  // Basic stats
  const pendingCount = liabilities.filter(l => l.status === "PENDING").length
  const totalPendingVal = liabilities.filter(l => l.status === "PENDING").reduce((acc, curr) => acc + curr.amount, 0)
  const totalSettledVal = liabilities.filter(l => l.status === "SETTLED").reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
          <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-3 md:gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            التزامات الموظفين
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div dir="rtl" className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border-2 border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">الالتزامات المعلقة</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-200">{pendingCount}</p>
            </div>
          </div>

          <div dir="rtl" className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border-2 border-rose-100 dark:border-rose-900 shadow-sm flex items-center gap-6">
            <div className="p-4 bg-rose-100 dark:bg-rose-900/30 rounded-2xl text-rose-500">
              <TrendingDown className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">إجمالي المستحقات</p>
              <p className="text-3xl font-black text-rose-600 dark:text-rose-400">SAR {totalPendingVal.toLocaleString()}</p>
            </div>
          </div>

          <div dir="rtl" className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border-2 border-emerald-100 dark:border-emerald-900 shadow-sm flex items-center gap-6">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">إجمالي المسدد</p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">SAR {totalSettledVal.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* List of Liabilities */}
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-8">
            <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-widest font-black text-slate-500 justify-end" dir="rtl">
              <ShieldAlert className="w-5 h-5" /> سجل الالتزامات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {liabilities.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">لا توجد أي التزامات مسجلة.</div>
              ) : (
                liabilities.map(item => (
                  <LiabilityItem key={item.id} liability={item} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
