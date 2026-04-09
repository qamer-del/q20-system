import Sidebar from "@/components/dashboard/Sidebar"
import MobileHeader from "@/components/dashboard/MobileHeader"
import { auth } from "@/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role || "CASHIER" // Default fallback string

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      <div className="hidden lg:block">
        {/* @ts-ignore */}
        <Sidebar role={role} />
      </div>

      <main className="flex-1 w-full flex flex-col relative z-0 h-screen overflow-hidden">
        {/* @ts-ignore */}
        <MobileHeader role={role} />
        <div className="flex-1 overflow-y-auto w-full relative">
          {children}
        </div>
      </main>

    </div>
  )
}
