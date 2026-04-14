import React from "react"
import { prisma } from "@/lib/prisma"
import { protectRoute } from "@/lib/protect"
import { addAccount, postJournalEntry } from "@/features/accounting/actions"
import { BookOpen, FileText, PlusCircle, Landmark } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"
import { calculateBalance, roundSAR } from "@/lib/financial"
import JournalEntryCard from "./JournalEntryCard"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function AccountingPage() {
  await protectRoute(["ADMIN"])
  const dict = await getTranslation()
  const accountsData = await prisma.account.findMany({
    include: { transactions: true, childAccounts: { include: { transactions: true } } },
    orderBy: { code: 'asc' }
  })

  const topLevelAccounts = accountsData.filter((a: any) => !a.parentAccountId).map((account: any) => {
    let totalDebit = account.transactions.reduce((sum: number, t: any) => sum + Number(t.debit), 0)
    let totalCredit = account.transactions.reduce((sum: number, t: any) => sum + Number(t.credit), 0)

    let children = []
    if (account.childAccounts && account.childAccounts.length > 0) {
      children = account.childAccounts.map((child: any) => {
        const cDebit = child.transactions.reduce((sum: number, t: any) => sum + Number(t.debit), 0)
        const cCredit = child.transactions.reduce((sum: number, t: any) => sum + Number(t.credit), 0)
        totalDebit += cDebit
        totalCredit += cCredit
        return { ...child, totalDebit: roundSAR(cDebit), totalCredit: roundSAR(cCredit), balance: calculateBalance(child.type, roundSAR(cDebit), roundSAR(cCredit)) }
      })
    }

    totalDebit = roundSAR(totalDebit)
    totalCredit = roundSAR(totalCredit)
    const balance = calculateBalance(account.type, totalDebit, totalCredit)
    return { ...account, totalDebit, totalCredit, balance, children }
  })

  const recentJournalsRaw = await prisma.journalEntry.findMany({
    take: 15,
    orderBy: { date: 'desc' },
    include: { transactions: { include: { account: true } } }
  })

  // Sanitize Decimal objects to plain numbers for the Client Component
  const recentJournals = recentJournalsRaw.map((j: any) => ({
    ...j,
    transactions: j.transactions.map((t: any) => ({
      ...t,
      debit: Number(t.debit),
      credit: Number(t.credit)
    }))
  }))

  // Calculate trial balance totals using only top-level aggregated amounts
  const trialDebit = roundSAR(topLevelAccounts.reduce((s: number, a: any) => s + a.totalDebit, 0))
  const trialCredit = roundSAR(topLevelAccounts.reduce((s: number, a: any) => s + a.totalCredit, 0))
  const isBalanced = trialDebit === trialCredit

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
            <div className="p-3 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-2xl">
              <Landmark className="w-8 h-8" />
            </div>
            {(dict.Accounting as any).title}
          </h1>
          {/* Trial Balance Indicator */}
          <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${isBalanced ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-900 dark:text-rose-400'}`}>
            {isBalanced ? '✓ Trial Balance OK' : '⚠ Out of Balance'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Chart of Accounts */}
          <Card className="lg:col-span-2 shadow-xl border-t-8 border-t-violet-600 overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6">
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                {(dict.Accounting as any).accounts}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                      <th className="p-5">{(dict.Accounting as any).code_name}</th>
                      <th className="p-5">{(dict.Accounting as any).type_col}</th>
                      <th className="p-5 text-right font-mono">{(dict.Accounting as any).debit}</th>
                      <th className="p-5 text-right font-mono">{(dict.Accounting as any).credit}</th>
                      <th className="p-5 text-right text-slate-900 dark:text-white">{(dict.Accounting as any).balance}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {topLevelAccounts.map((acc: any) => (
                      <React.Fragment key={acc.id}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-5 font-bold dark:text-slate-200 flex items-center gap-3">
                            <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 px-2 py-1 rounded font-mono text-xs">{acc.code}</span>
                            {acc.name}
                            {acc.children.length > 0 && <span className="ml-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-700">Aggregate</span>}
                          </td>
                          <td className="p-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                            {(dict.Accounting as any)[acc.type.toLowerCase()] || acc.type}
                          </td>
                          <td className="p-5 text-right font-mono text-slate-400">{acc.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-5 text-right font-mono text-slate-400">{acc.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className={`p-5 text-right font-black ${acc.balance < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            SAR {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {/* Nested Sub-Accounts */}
                        {acc.children.map((child: any) => (
                          <tr key={child.id} className="bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="p-5 pl-14 font-medium text-slate-600 dark:text-slate-300 flex items-center gap-3">
                              <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded font-mono text-xs">↳ {child.code}</span>
                              {child.name}
                            </td>
                            <td className="p-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                              {(dict.Accounting as any)[child.type.toLowerCase()] || child.type}
                            </td>
                            <td className="p-5 text-right font-mono text-slate-400">{child.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-5 text-right font-mono text-slate-400">{child.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className={`p-5 text-right font-black ${child.balance < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-500'}`}>
                              SAR {child.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {topLevelAccounts.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">{(dict.Accounting as any).no_accounts}</td></tr>
                    )}
                    {/* Trial Balance Footer */}
                    {topLevelAccounts.length > 0 && (
                      <tr className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700">
                        <td colSpan={2} className="p-5 font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">{(dict.Accounting as any).trial_balance_total}</td>
                        <td className="p-5 text-right font-mono font-black text-slate-900 dark:text-white">{trialDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-5 text-right font-mono font-black text-slate-900 dark:text-white">{trialCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-5 text-right">
                          <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${isBalanced ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {isBalanced ? (dict.Accounting as any).balanced : `Δ ${roundSAR(Math.abs(trialDebit - trialCredit)).toFixed(2)}`}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Forms */}
          <div className="space-y-8">
            <Card>
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <CardTitle className="text-lg flex items-center gap-2"><PlusCircle className="text-emerald-500 w-5 h-5" /> {(dict.Accounting as any).add_account}</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={addAccount} successMessage="New account added to Ledger!" className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).account_code}</label>
                    <Input type="text" name="code" placeholder="6001" required className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).account_name}</label>
                    <Input type="text" name="name" placeholder="Utilities Expense" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).account_type}</label>
                    <select name="type" required className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 transition-all">
                      <option value="BANK_ACCOUNT">Bank Account (Linked to Main Bank)</option>
                      <option value="ASSET">{(dict.Accounting as any).asset} (Cash, Inventory)</option>
                      <option value="LIABILITY">{(dict.Accounting as any).liability} (Debts, VAT)</option>
                      <option value="EQUITY">{(dict.Accounting as any).equity} (Capital)</option>
                      <option value="REVENUE">{(dict.Accounting as any).revenue} (Sales)</option>
                      <option value="EXPENSE">{(dict.Accounting as any).expense} (Salaries, Rent)</option>
                    </select>
                  </div>
                  <SubmitButton variant="outline" className="w-full mt-2 tracking-widest text-xs uppercase"><PlusCircle className="w-4 h-4 mr-2" /> {(dict.Accounting as any).add_account}</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="text-amber-500 w-5 h-5" /> {(dict.Accounting as any).create_entry}</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={postJournalEntry} successMessage="Transaction finalized and posted!" className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).entry_description}</label>
                    <Input type="text" name="description" placeholder="..." required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).debit} Account</label>
                    <select name="debitAccountId" required className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all">
                      <option value="">{(dict.Accounting as any).select_account}</option>
                      {accountsData.filter((a: any) => a.childAccounts?.length === 0).map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).credit} Account</label>
                    <select name="creditAccountId" required className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all">
                      <option value="">{(dict.Accounting as any).select_account}</option>
                      {accountsData.filter((a: any) => a.childAccounts?.length === 0).map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.General as any).amount}</label>
                    <Input type="number" step="0.01" min="0.01" name="amount" placeholder="0.00" required className="font-mono text-xl text-center font-black" />
                  </div>
                  <SubmitButton variant="secondary" className="w-full mt-2">{(dict.Accounting as any).create_entry}</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* BOTTOM: Journal Entries Audit Trail */}
        <Card className="border-t-4 border-t-indigo-500">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <FileText className="text-indigo-600 w-6 h-6" /> {(dict.Accounting as any).journal}
            </CardTitle>
            <CardDescription>{(dict.Accounting as any).journal_desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJournals.map((journal: any) => (
                <JournalEntryCard key={journal.id} journal={journal} dict={dict} />
              ))}
              {recentJournals.length === 0 && <p className="text-center text-slate-400 py-12">{(dict.Accounting as any).no_ledgers}</p>}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
