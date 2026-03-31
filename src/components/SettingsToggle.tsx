"use client"

import { useTheme } from "./ThemeProvider"
import { useI18n } from "./I18nProvider"
import { Moon, Sun, Languages } from "lucide-react"

export default function SettingsToggle() {
  const { theme, toggleTheme } = useTheme()
  const { locale, toggleLocale } = useI18n()

  return (
    <div className="flex items-center gap-2 mt-auto p-4 border-t border-slate-800">
       <button 
         onClick={toggleTheme}
         className="flex-1 flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 transition-colors"
         title="Toggle Dark Mode"
       >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-300" />}
       </button>
       
       <button 
         onClick={toggleLocale}
         className="flex-1 flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 transition-colors font-bold"
         title="Switch Language"
       >
          <Languages className="w-4 h-4 text-emerald-400" />
          {locale === 'en' ? 'عربي' : 'EN'}
       </button>
    </div>
  )
}
