"use client"

import { useState } from "react"
import { resetInvoicesOnly, resetFinancialData, resetFullSystem } from "@/features/admin/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldAlert, Trash2, AlertTriangle, Loader2, Lock, CheckCircle2, XCircle } from "lucide-react"
import { useI18n } from "@/components/I18nProvider"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

type ResetLevel = "invoices" | "financial" | "full" | null

export default function ResetClient() {
  const { t } = useI18n()
  const [step, setStep] = useState<number>(0) // 0=choose, 1=warning, 2=confirm
  const [level, setLevel] = useState<ResetLevel>(null)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [reason, setReason] = useState("")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const config = {
    invoices: {
      title: t("reset_invoices"),
      description: t("reset_invoices_desc"),
      confirmText: "RESET INVOICES",
      action: resetInvoicesOnly,
      color: "amber",
    },
    financial: {
      title: t("reset_financial"),
      description: t("reset_financial_desc"),
      confirmText: "RESET FINANCIAL",
      action: resetFinancialData,
      color: "orange",
    },
    full: {
      title: t("reset_full"),
      description: t("reset_full_desc"),
      confirmText: "FULL SYSTEM RESET",
      action: resetFullSystem,
      color: "rose",
    },
  }

  const currentConfig = level ? config[level] : null

  const cancel = () => {
    setStep(0)
    setLevel(null)
    setPassword("")
    setConfirmation("")
    setReason("")
    setResult(null)
  }

  const handleResetAction = async (formData: FormData) => {
    if (!currentConfig || !level) return
    try {
      await currentConfig.action(formData)
      setResult({ success: true, message: `${currentConfig.title} completed successfully.` })
      setStep(0)
      setLevel(null)
      setPassword("")
      setConfirmation("")
      setReason("")
    } catch (e: any) {
      setResult({ success: false, message: e.message })
      throw e
    }
  }

  return (
    <div className="space-y-8">
      {/* Result Message */}
      {result && (
        <div className={`p-5 rounded-2xl flex items-center gap-3 font-bold text-sm ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-900 dark:text-rose-400"}`}>
          {result.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          {result.message}
        </div>
      )}

      {/* Step 0: Choose Reset Level */}
      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-amber-500 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => { setLevel("invoices"); setStep(1) }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-amber-500" /> {t("reset_invoices")}
              </CardTitle>
              <CardDescription>
                {t("reset_invoices_desc")}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-orange-500 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => { setLevel("financial"); setStep(1) }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> {t("reset_financial")}
              </CardTitle>
              <CardDescription>
                {t("reset_financial_desc")}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-t-4 border-t-rose-500 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => { setLevel("full"); setStep(1) }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> {t("reset_full")}
              </CardTitle>
              <CardDescription>
                {t("reset_full_desc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Step 1: Warning */}
      {step === 1 && currentConfig && (
        <Card className="border-2 border-rose-200 dark:border-rose-900 shadow-xl max-w-xl mx-auto">
          <CardHeader className="bg-rose-50 dark:bg-rose-900/20 border-b border-rose-200 dark:border-rose-800">
            <CardTitle className="text-xl flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" /> Warning: {currentConfig.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-center md:text-left">
              {currentConfig.description}
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
              <p className="text-rose-600 dark:text-rose-400 font-bold text-sm text-center">
                This action CANNOT be undone.<br />All affected data will be permanently removed from the database.
              </p>
            </div>
            <div className="flex flex-col-reverse md:flex-row gap-3">
              <Button variant="outline" onClick={cancel} className="flex-1 whitespace-nowrap">{t("cancel")}</Button>
              <Button onClick={() => setStep(2)} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white whitespace-nowrap overflow-hidden text-ellipsis">
                {t("understand_continue")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Password + Confirmation */}
      {step === 2 && currentConfig && (
        <ActionForm action={handleResetAction} className="max-w-xl mx-auto">
          <Card className="border-2 border-rose-500 shadow-2xl">
            <CardHeader className="bg-slate-900 text-white border-b border-slate-700">
              <CardTitle className="text-xl flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" /> {t("security_verif")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Complete all fields to authorize: <strong className="text-rose-400">{currentConfig.title}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("reset_reason_label")}</label>
                <Input
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., End of fiscal year..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {t("admin_password")}
                </label>
                <Input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {t("confirm_text_label").replace("{text}", currentConfig.confirmText)}
                </label>
                <Input
                  name="confirmation"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={currentConfig.confirmText}
                  className="font-mono text-center text-lg"
                  required
                />
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" onClick={cancel} className="flex-1">{t("cancel")}</Button>
                <SubmitButton
                  disabled={!password || confirmation !== currentConfig.confirmText}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  {`Execute ${currentConfig.title}`}
                </SubmitButton>
              </div>
            </CardContent>
          </Card>
        </ActionForm>
      )}
    </div>
  )
}
