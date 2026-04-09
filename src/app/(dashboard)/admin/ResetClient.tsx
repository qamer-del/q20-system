"use client"

import { useState } from "react"
import { resetInvoicesOnly, resetFinancialData, resetFullSystem } from "@/features/admin/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldAlert, Trash2, AlertTriangle, Loader2, Lock, CheckCircle2, XCircle } from "lucide-react"

type ResetLevel = "invoices" | "financial" | "full" | null

export default function ResetClient() {
  const [step, setStep] = useState<number>(0) // 0=choose, 1=warning, 2=confirm
  const [level, setLevel] = useState<ResetLevel>(null)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [reason, setReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const config = {
    invoices: {
      title: "Reset Invoices Only",
      description: "Deletes all sales invoices and their linked journal entries. Keeps accounts, tanks, suppliers.",
      confirmText: "RESET INVOICES",
      action: resetInvoicesOnly,
      color: "amber",
    },
    financial: {
      title: "Reset Financial Data",
      description: "Deletes ALL financial records: sales, purchases, journal entries. Resets tank volumes to 0. Keeps chart of accounts and users.",
      confirmText: "RESET FINANCIAL",
      action: resetFinancialData,
      color: "orange",
    },
    full: {
      title: "Full System Reset",
      description: "⚠️ NUCLEAR OPTION — Deletes ALL data except your admin account and audit logs. This cannot be undone.",
      confirmText: "FULL SYSTEM RESET",
      action: resetFullSystem,
      color: "rose",
    },
  }

  const currentConfig = level ? config[level] : null

  const handleReset = async () => {
    if (!currentConfig || !level) return
    setIsProcessing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.set("password", password)
      formData.set("confirmation", confirmation)
      formData.set("reason", reason)

      await currentConfig.action(formData)
      setResult({ success: true, message: `${currentConfig.title} completed successfully.` })
      setStep(0)
      setLevel(null)
      setPassword("")
      setConfirmation("")
      setReason("")
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const cancel = () => {
    setStep(0)
    setLevel(null)
    setPassword("")
    setConfirmation("")
    setReason("")
    setResult(null)
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
                <Trash2 className="w-5 h-5 text-amber-500" /> Reset Invoices
              </CardTitle>
              <CardDescription>
                Delete all sales invoices and linked journal entries only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                <strong>Deletes:</strong> Sales, SaleItems, linked JEs<br />
                <strong>Keeps:</strong> Accounts, Tanks, Suppliers, Purchases, Users
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => { setLevel("financial"); setStep(1) }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Reset Financial
              </CardTitle>
              <CardDescription>
                Delete all financial records and reset tank volumes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                <strong>Deletes:</strong> All sales, purchases, journal entries<br />
                <strong>Resets:</strong> Tank volumes to 0<br />
                <strong>Keeps:</strong> Chart of Accounts, Suppliers, Users
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-rose-500 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => { setLevel("full"); setStep(1) }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> Full System Reset
              </CardTitle>
              <CardDescription>
                Delete EVERYTHING. Only your admin account survives.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-rose-500 font-bold">
                ⚠️ This action is irreversible. All data will be permanently deleted.
              </p>
            </CardContent>
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
            <p dir="ltr" className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-center md:text-left">
              {currentConfig.description}
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
              <p dir="ltr" className="text-rose-600 dark:text-rose-400 font-bold text-sm text-center">
                This action CANNOT be undone.<br/>All affected data will be permanently removed from the database.
              </p>
            </div>
            <div className="flex flex-col-reverse md:flex-row gap-3">
              <Button variant="outline" onClick={cancel} className="flex-1 whitespace-nowrap">Cancel</Button>
              <Button onClick={() => setStep(2)} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white whitespace-nowrap overflow-hidden text-ellipsis">
                I Understand, Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Password + Confirmation */}
      {step === 2 && currentConfig && (
        <Card className="border-2 border-rose-500 shadow-2xl max-w-xl mx-auto">
          <CardHeader className="bg-slate-900 text-white border-b border-slate-700">
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" /> Security Verification
            </CardTitle>
            <CardDescription className="text-slate-400">
              Complete all fields to authorize: <strong className="text-rose-400">{currentConfig.title}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Reason for Reset</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., End of fiscal year, data correction..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Admin Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Type <span className="text-rose-600 font-black">{currentConfig.confirmText}</span> to confirm
              </label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={currentConfig.confirmText}
                className="font-mono text-center text-lg"
                required
              />
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
              <Button variant="outline" onClick={cancel} className="flex-1">Cancel</Button>
              <Button
                onClick={handleReset}
                disabled={isProcessing || !password || confirmation !== currentConfig.confirmText}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Execute ${currentConfig.title}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
