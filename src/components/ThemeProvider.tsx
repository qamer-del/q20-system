"use client"

import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext<{ theme: string; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  
  // Hydration safety: Check storage after mount
  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored) setTheme(stored)
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark")
  }, [])

  // Sync with Tailwind's root HTML class
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
