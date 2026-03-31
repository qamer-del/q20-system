import { Loader2 } from "lucide-react"

export default function GlobalLoading() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 flex items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-3xl border border-white/10">
          <svg className="w-10 h-10 text-indigo-500 animate-pulse relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 0-8 0v4a6 6 0 1 0 11.2 3" />
            <line x1="14" y1="14" x2="19" y2="19" />
          </svg>
          <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-spin-slow" />
        </div>
        
        <div className="space-y-2 text-center">
           <h3 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 animate-pulse">
             SYNCHRONIZING
           </h3>
           <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">
             Q20 Secure Endpoint
           </p>
        </div>
        
        <Loader2 className="w-5 h-5 text-slate-300 dark:text-slate-600 animate-spin" />
      </div>
    </div>
  )
}
