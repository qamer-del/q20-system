"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MonitorPlay,
  Droplets,
  Truck,
  Landmark,
  ShieldCheck,
  FileSpreadsheet,
  History,
  Users,
  LogOut,
  Settings,
  Clock
} from "lucide-react"
import SettingsToggle from "@/components/SettingsToggle"
import { useI18n } from "@/components/I18nProvider"
import { logoutAction } from "@/features/auth/actions"

export default function Sidebar({ mobile, role = "CASHIER" }: { mobile?: boolean; role?: string } = {}) {
  const pathname = usePathname()
  const { t } = useI18n()

  const allLinks = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Shift Control", href: "/shifts", icon: Clock },
    { name: "Point of Sale", href: "/pos", icon: MonitorPlay },
    { name: "Fuel Inventory", href: "/inventory", icon: Droplets },
    { name: "Supplier Refills", href: "/purchases", icon: Truck },
    { name: "General Ledger", href: "/accounting", icon: Landmark },
    { name: "ZATCA Invoices", href: "/invoices", icon: ShieldCheck },
    { name: "Financial Reports", href: "/reporting", icon: FileSpreadsheet },
    { name: "Security Audit", href: "/audit", icon: History },
    { name: "Staff & Users", href: "/users", icon: Users },
    { name: "Admin Settings", href: "/admin", icon: Settings },
  ]

  const links = allLinks.filter(link => {
    if (role === "ADMIN") return true;
    if (role === "CASHIER") return ["/dashboard", "/pos"].includes(link.href);
    if (role === "MANAGER") return ["/dashboard", "/inventory", "/accounting", "/reporting", "/purchases"].includes(link.href);
    return ["/dashboard"].includes(link.href); // Viewer defaults
  })

  return (
    <aside className={`w-64 bg-slate-900 border-r border-slate-800 text-white min-h-screen flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto ${mobile ? "flex" : "hidden lg:flex"}`}>
      <div className="p-6 flex items-center gap-4 border-b border-slate-800 backdrop-blur-md bg-slate-900/50 sticky top-0 z-10">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 relative overflow-hidden">
          {/* Minimal Q20 Vector Graphic */}
          <svg className="w-6 h-6 text-white absolute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 0-8 0v4a6 6 0 1 0 11.2 3" />
            <line x1="14" y1="14" x2="19" y2="19" />
          </svg>
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
        </div>
        <div>
          <span className="block text-2xl font-black tracking-tighter leading-none text-white">Q20</span>
          <span className="block text-[8px] text-indigo-400 font-bold uppercase tracking-widest mt-1">{t("Management Engine")}</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{t("Core Modules")}</p>
        {links.map(link => {
          const isActive = pathname === link.href

          if (link.name === "General Ledger") {
            return (
              <div key="divider">
                <div className="h-px bg-slate-800 my-6"></div>
                <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{t("Finance & Audit")}</p>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border border-transparent ${isActive ? "bg-slate-800 text-white border-slate-700 shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
                >
                  <link.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  {t(link.name)}
                </Link>
              </div>
            )
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border border-transparent ${isActive ? "bg-slate-800 text-white border-slate-700 shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <link.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
              {t(link.name)}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 bg-slate-900/80 backdrop-blur-md p-4">
        <SettingsToggle />
        <form action={logoutAction} className="w-full mt-2">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 border border-transparent hover:border-rose-900/50"
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </button>
        </form>
      </div>
    </aside>
  )
}
