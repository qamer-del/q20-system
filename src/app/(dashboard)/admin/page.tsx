import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Settings, ShieldAlert, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import ResetClient from "./ResetClient"

export default async function AdminPage() {
  const session = await auth()
  // @ts-ignore
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch recent system resets for audit display
  let recentResets: any[] = []
  try {
    recentResets = await (prisma as any).systemReset.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    })
  } catch {
    // SystemReset table may not exist yet — run: npx prisma generate && npx prisma db push
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <Settings className="w-8 h-8" />
            </div>
            Admin Settings
          </h1>
        </div>

        {/* System Reset Section */}
        <Card className="border-t-4 border-t-rose-500 shadow-xl">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <ShieldAlert className="text-rose-500 w-6 h-6" /> System Reset
            </CardTitle>
            <CardDescription>
              Use these controls carefully. All reset actions are permanently logged in the audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetClient />
          </CardContent>
        </Card>

        {/* Reset History */}
        {recentResets.length > 0 && (
          <Card>
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="text-slate-400 w-5 h-5" /> Reset History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                      <th className="p-4">Date</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {recentResets.map((reset: any) => (
                      <tr key={reset.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="p-4 font-mono text-xs text-slate-500">{new Date(reset.createdAt).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            reset.type === "FULL_SYSTEM" ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" :
                            reset.type === "FINANCIAL_DATA" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {reset.type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{reset.reason || "—"}</td>
                        <td className="p-4 text-slate-500 text-xs max-w-xs truncate">{reset.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
