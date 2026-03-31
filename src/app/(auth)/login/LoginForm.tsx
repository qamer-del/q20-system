"use client"

import { loginAction } from "@/features/auth/actions"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const initialState = { error: "" }

export default function LoginForm({ locale }: { locale: string }) {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => await loginAction(formData), initialState)

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state?.error])

  return (
    <form className="space-y-6" action={formAction}>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-4 px-5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium transition-all"
            placeholder={locale === "ar" ? "البريد الإلكتروني" : "Email address"}
            defaultValue="admin@station.com"
            disabled={isPending}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-4 px-5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium transition-all"
            placeholder={locale === "ar" ? "كلمة المرور" : "Password"}
            defaultValue="password123"
            disabled={isPending}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-4 text-sm font-black text-slate-900 transition-all hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white uppercase tracking-widest disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (locale === "ar" ? "تسجيل الدخول" : "Secure Login")}
      </button>
    </form>
  )
}
