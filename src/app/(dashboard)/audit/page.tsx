import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ShieldAlert, Fingerprint, Search, History } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function AuditPage() {
  const session = await auth()
  
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const dict = await getTranslation()
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true },
    take: 50
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <Card className="bg-slate-900 border-none shadow-2xl text-white overflow-hidden relative border-t-4 border-t-rose-500">
          <div className="absolute right-0 top-0 opacity-10 p-8 transform translate-x-12 -translate-y-12">
             <Fingerprint className="w-64 h-64 text-white" />
          </div>
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-3xl md:text-5xl font-black flex items-center gap-4 glass-title">
              <ShieldAlert className="text-rose-500 w-10 h-10" />
              {(dict.Audit as any).title}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-slate-400 mt-2 max-w-xl font-medium tracking-wide leading-relaxed">
              This is a highly restricted area. All sensitive actions taken by cashiers, accountants, and administrators are permanently logged here to prevent fraud and maintain accounting integrity.
            </p>
          </CardContent>
        </Card>

        {/* Filters/Search */}
        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 relative">
             <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 z-10" />
             <Input 
               type="text" 
               placeholder={(dict.General as any).search} 
               className="pl-12 lg:h-14 font-medium" 
             />
           </div>
           <select className="h-12 lg:h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold dark:text-white transition-all focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 uppercase tracking-widest text-slate-500">
              <option>{(dict.Audit as any).all_events}</option>
              <option>{(dict.Audit as any).login}</option>
              <option>{(dict.Audit as any).sales}</option>
              <option>{(dict.Audit as any).system}</option>
           </select>
        </div>

        {/* LOGS TABLE */}
        <Card className="shadow-xl">
           <CardContent className="p-0">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] uppercase font-black tracking-widest">
                     <th className="p-6 whitespace-nowrap"><div className="flex items-center gap-2"><History className="w-4 h-4" /> {(dict.Audit as any).timestamp}</div></th>
                     <th className="p-6">{(dict.Audit as any).event}</th>
                     <th className="p-6">{(dict.Audit as any).user}</th>
                     <th className="p-6">{(dict.Audit as any).details}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium">
                   {logs.map((log: any) => (
                     <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                       <td className="p-6 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">
                         {new Date(log.createdAt).toLocaleString()}
                       </td>
                       <td className="p-6">
                         <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                           log.action.includes("RECONCILE") ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900' :
                           log.action.includes("DELETE") ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-900 dark:text-rose-400' :
                           'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                         }`}>
                           {log.action.replace(/_/g, " ")}
                         </span>
                       </td>
                       <td className="p-6">
                         <span className="font-bold text-slate-900 dark:text-white block">{log.user.name || "-"}</span>
                         <span className="text-xs text-slate-500 font-mono mt-1 block">{log.user.email}</span>
                       </td>
                       <td className="p-6 text-slate-600 dark:text-slate-400 max-w-sm">
                         <p className="truncate hover:text-clip hover:whitespace-normal transition-all leading-relaxed">{log.details}</p>
                       </td>
                     </tr>
                   ))}

                   {logs.length === 0 && (
                     <tr>
                       <td colSpan={4} className="p-16 text-center">
                          <ShieldAlert className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
                          <p className="text-slate-500 font-bold text-lg">System Secure. No abnormal activity detected yet.</p>
                          <p className="text-slate-400 text-sm mt-2">Try reconciling a tank with a different volume to generate an audit log.</p>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </CardContent>
        </Card>

      </div>
    </div>
  )
}
