"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/I18nProvider"
import { createUser } from "@/features/users/actions"
import { UserPlus, Loader2 } from "lucide-react"
import { useState } from "react"

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "CASHIER", "ACCOUNTANT"])
})

type UserFormValues = z.infer<typeof userSchema>

export default function UserForm() {
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "CASHIER" }
  })

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("name", data.name)
      formData.append("email", data.email)
      formData.append("password", data.password)
      formData.append("role", data.role)
      
      await createUser(formData)
      reset()
    } catch (err: any) {
      setError(err.message || "Failed to create user")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">{error}</div>}

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("name")}</label>
        <Input {...register("name")} placeholder={t("name")} className={errors.name ? "border-red-500" : ""} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("email")}</label>
        <Input {...register("email")} type="email" placeholder={t("email")} className={errors.email ? "border-red-500" : ""} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
        <Input {...register("password")} type="password" placeholder="••••••" className={errors.password ? "border-red-500" : ""} />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("role")}</label>
        <select {...register("role")} className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <option value="CASHIER">CASHIER (POS Only)</option>
          <option value="ACCOUNTANT">ACCOUNTANT (Financials)</option>
          <option value="ADMIN">ADMIN (Full Access)</option>
        </select>
        {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
      </div>
      
      <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0"/> {t("add_user")}</>}
      </Button>

    </form>
  )
}
