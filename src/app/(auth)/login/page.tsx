import LanguageToggle from "./LanguageToggle"
import LoginForm from "./LoginForm"
import { cookies } from "next/headers"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950">
      
      {/* Decorative Elite Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      {/* Language Switcher */}
      <LanguageToggle current={locale} />

      {/* Glassmorphic Login Container */}
      <div className="relative z-10 w-full max-w-md p-10 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        
        {/* Q20 Identity */}
        <div className="flex flex-col items-center text-center pb-8 border-b border-white/10 mb-8">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
              <svg className="w-8 h-8 text-white relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 0-8 0v4a6 6 0 1 0 11.2 3" />
                <line x1="14" y1="14" x2="19" y2="19" />
              </svg>
           </div>
           <h2 className="text-4xl font-black tracking-tighter text-white">
             Q20
           </h2>
           <p className="mt-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
             {locale === "ar" ? "نظام إدارة المحطات المركزي" : "Central Management Engine"}
           </p>
        </div>
        
        <LoginForm locale={locale} />
        
        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          Protected by Q20 Authentication
        </p>
      </div>
    </div>
  )
}
