"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/I18nProvider"
import { createUser } from "@/features/users/actions"
import { UserPlus, Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"])
})

type UserFormValues = z.infer<typeof userSchema>

export default function UserForm() {
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "CASHIER" }
  })

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("name", data.name)
    formData.append("email", data.email)
    formData.append("password", data.password)
    formData.append("role", data.role)

    const promise = createUser(formData)
    toast.promise(promise, {
      loading: "Creating user account...",
      success: "User account created successfully.",
      error: (err: any) => err?.message || "Failed to create user account."
    })

    try {
      await promise
      reset()
    } catch {
      // toast handles error display
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("name")}</label>
        <Input
          {...register("name")}
          placeholder={t("name")}
          disabled={isSubmitting}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("email")}</label>
        <Input
          {...register("email")}
          type="email"
          placeholder={t("email")}
          disabled={isSubmitting}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
        <Input
          {...register("password")}
          type="password"
          placeholder="••••••"
          disabled={isSubmitting}
          className={errors.password ? "border-red-500" : ""}
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("role")}</label>
        <select
          {...register("role")}
          disabled={isSubmitting}
          className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        >
          <option value="CASHIER">CASHIER — POS & Shift Management</option>
          <option value="MANAGER">MANAGER — Operations & Reports</option>
          <option value="ADMIN">ADMIN — Full System Access</option>
        </select>
        {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-4 h-12 font-bold"
      >
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
          : <><UserPlus className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" /> {t("add_user")}</>
        }
      </Button>

    </form>
  )
}
