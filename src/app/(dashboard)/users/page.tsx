import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { Users, ShieldBan, ShieldAlert, UserPlus } from "lucide-react"
import { deleteUser } from "@/features/users/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import UserForm from "@/components/forms/UserForm"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function UsersPage() {
  const session = await protectRoute(["ADMIN"])
  const dict = await getTranslation()

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Users className="w-8 h-8" />
            </div>
            {(dict.Users as any).title}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                <CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> {(dict.Users as any).active_team}</CardTitle>
                <CardDescription>{(dict.Users as any).active_description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((user: any) => (
                    <div key={user.id} className="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white capitalize">{user.name || "Station User"}</h3>
                        <p className="text-sm text-slate-500 mt-1">{user.email}</p>
                        <span className={`inline-block mt-4 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${user.role === 'ADMIN' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900 dark:text-amber-500' :
                          user.role === 'CASHIER' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900 dark:text-emerald-500' :
                            'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900 dark:text-blue-400'
                          }`}>
                          {(dict.General as any).role}: {user.role}
                        </span>
                      </div>

                      {user.id !== session.user.id && (
                        <ActionForm action={deleteUser} successMessage="User removed from system">
                          <input type="hidden" name="userId" value={user.id} />
                          <SubmitButton variant="destructive" className="rounded-xl shadow-none hover:shadow-md bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-transparent dark:border-rose-900/50 dark:border w-10 h-10 p-0 flex items-center justify-center">
                            <ShieldBan className="w-5 h-5" />
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-8 border-t-4 border-t-blue-500 shadow-xl shadow-blue-900/5 dark:shadow-blue-900/10">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 rounded-t-3xl">
                <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-500" /> {(dict.Users as any).add_user}</CardTitle>
                <CardDescription>{(dict.Users as any).grant_description}</CardDescription>
              </CardHeader>
              <CardContent>
                <UserForm />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
