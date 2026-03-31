"use client"

import { useRouter } from "next/navigation"

export default function LanguageToggle({ current }: { current: string }) {
  const router = useRouter()

  const switchLanguage = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
    router.refresh()
  }

  return (
    <div className="absolute top-6 right-6 z-50 flex gap-2 p-1.5 bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-full border border-white/20 dark:border-white/5 shadow-xl">
      <button 
        type="button"
        onClick={() => switchLanguage("en")} 
        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${current === "en" ? "bg-white text-slate-900 shadow-md" : "text-white/60 hover:text-white"}`}
      >
        EN
      </button>
      <button 
        type="button"
        onClick={() => switchLanguage("ar")} 
        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${current === "ar" ? "bg-white text-slate-900 shadow-md" : "text-white/60 hover:text-white"}`}
      >
        عربي
      </button>
    </div>
  )
}
