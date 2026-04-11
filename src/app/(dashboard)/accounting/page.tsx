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

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function AccountingPage() {
  await protectRoute(["ADMIN", "MANAGER"])
  const dict = await getTranslation()
  const accountsData = await prisma.account.findMany({
    include: { transactions: true, childAccounts: { include: { transactions: true } } },
    orderBy: { code: 'asc' }
  })

  const chartOfAccounts = accountsData.map((account: any) => {
    let totalDebit = account.transactions.reduce((sum: number, t: any) => sum + t.debit, 0)
    let totalCredit = account.transactions.reduce((sum: number, t: any) => sum + t.credit, 0)

    if (account.childAccounts && account.childAccounts.length > 0) {
      for (const child of account.childAccounts) {
        totalDebit += child.transactions.reduce((sum: number, t: any) => sum + t.debit, 0)
        totalCredit += child.transactions.reduce((sum: number, t: any) => sum + t.credit, 0)
      }
    }

    totalDebit = roundSAR(totalDebit)
    totalCredit = roundSAR(totalCredit)
    const balance = calculateBalance(account.type, totalDebit, totalCredit)
    return { ...account, totalDebit, totalCredit, balance }
  })

  const recentJournals = await prisma.journalEntry.findMany({
    take: 15,
    orderBy: { date: 'desc' },
    include: { transactions: { include: { account: true } } }
  })

  // Calculate trial balance totals
  const trialDebit = roundSAR(chartOfAccounts.reduce((s: number, a: any) => s + a.totalDebit, 0))
  const trialCredit = roundSAR(chartOfAccounts.reduce((s: number, a: any) => s + a.totalCredit, 0))
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
                    {chartOfAccounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-5 font-bold dark:text-slate-200 flex items-center gap-3">
                          <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 px-2 py-1 rounded font-mono text-xs">{acc.code}</span>
                          {acc.name}
                          {acc.parentAccountId && <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">Sub-Account</span>}
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
                    ))}
                    {chartOfAccounts.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">{(dict.Accounting as any).no_accounts}</td></tr>
                    )}
                    {/* Trial Balance Footer */}
                    {chartOfAccounts.length > 0 && (
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
                      {chartOfAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{(dict.Accounting as any).credit} Account</label>
                    <select name="creditAccountId" required className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all">
                      <option value="">{(dict.Accounting as any).select_account}</option>
                      {chartOfAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
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
              {recentJournals.map((journal: any) => {
                // Verify each JE balances
                const jeDebit = roundSAR(journal.transactions.reduce((s: number, t: any) => s + t.debit, 0))
                const jeCredit = roundSAR(journal.transactions.reduce((s: number, t: any) => s + t.credit, 0))
                const jeBalanced = jeDebit === jeCredit

                return (
                  <div key={journal.id} className={`border rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors shadow-sm ${jeBalanced ? 'border-slate-200 dark:border-slate-800' : 'border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/10'}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-dashed border-slate-200 dark:border-slate-700 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-wider">{journal.description}</span>
                        {!jeBalanced && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded font-bold uppercase">{(dict.Accounting as any).unbalanced}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono tracking-widest font-bold bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-md">{new Date(journal.date).toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      {journal.transactions.map((t: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm font-mono tracking-wider items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900">
                          <span className={`${t.credit > 0 ? "ml-12 text-rose-600 dark:text-rose-400" : "font-bold text-emerald-600 dark:text-emerald-400"} flex items-center gap-2`}>
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 rounded">{t.account.code}</span>
                            {t.account.name}
                          </span>
                          <div className="w-64 flex justify-between bg-white dark:bg-slate-950 px-4 py-2 rounded-md border border-slate-100 dark:border-slate-800 shadow-inner">
                            <span className={t.debit > 0 ? "text-slate-900 dark:text-white font-black" : "text-slate-300 dark:text-slate-700"}>
                              {t.debit > 0 ? t.debit.toFixed(2) : ""}
                            </span>
                            <span className={t.credit > 0 ? "text-slate-900 dark:text-white font-black" : "text-slate-300 dark:text-slate-700"}>
                              {t.credit > 0 ? t.credit.toFixed(2) : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {recentJournals.length === 0 && <p className="text-center text-slate-400 py-12">{(dict.Accounting as any).no_ledgers}</p>}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
