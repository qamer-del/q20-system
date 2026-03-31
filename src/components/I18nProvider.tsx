"use client"

import { createContext, useContext, useEffect, useState } from "react"

const I18nContext = createContext({ locale: 'en', toggleLocale: () => {}, t: (key: string) => key })

import enDict from "../../messages/en.json"
import arDict from "../../messages/ar.json"

// Flatten the JSON dictionary so "Navigation.Overview" or simply "Overview" can be resolved
function flattenObject(ob: any) {
    const toReturn: any = {};
    for (const i in ob) {
        if (!ob.hasOwnProperty(i)) continue;
        if ((typeof ob[i]) === 'object' && ob[i] !== null) {
            const flatObject = flattenObject(ob[i]);
            for (const x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                toReturn[x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

const translations: Record<string, Record<string, string>> = {
  en: flattenObject(enDict),
  ar: flattenObject(arDict)
}

export function I18nProvider({ children, initialLocale = 'en' }: { children: React.ReactNode, initialLocale?: string }) {
  const [locale, setLocale] = useState(initialLocale)
  
  useEffect(() => {
     // Flip the entire DOM direction for Arabic RTL support
     document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
     document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
  }, [locale])

  // Translation hook function
  const t = (key: string) => translations[locale]?.[key] || key

  return (
    <I18nContext.Provider value={{ locale, toggleLocale: () => setLocale(l => l === 'en' ? 'ar' : 'en'), t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
