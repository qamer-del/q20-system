"use client"

import { submitInvoiceToZatca } from "@/features/zatca/actions"
import { QrCode, FileCheck2, ShieldCheck } from "lucide-react"
import PrintButton from "./PrintButton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

export default function InvoiceCard({ sale }: { sale: any }) {
    const isCleared = sale.zatcaHash?.startsWith("ZATCA-CLEARED")
    const fuelItem = sale.items[0]

    return (
        <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mx-4 -mt-4 pointer-events-none" />

            <CardHeader className="border-b border-dashed border-slate-200 dark:border-slate-800 pb-6 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                            Tax Invoice
                        </CardTitle>
                        <CardDescription className="font-mono mt-1">{sale.invoiceNumber}</CardDescription>
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Fuel Station LLC</h3>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">VAT: 300000000000003</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-6">
                        <div className="text-sm">
                            <span className="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Date & Time</span>
                            <span className="font-mono dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">{new Date(sale.createdAt).toLocaleString()}</span>
                        </div>

                        <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <span className="block text-slate-400 uppercase tracking-wider text-[10px] font-bold">Items Sold</span>
                            <div className="flex justify-between font-medium dark:text-white text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span>{fuelItem.quantity.toFixed(2)}L <span className="text-slate-500 mx-2">x</span> {fuelItem.fuelType.name}</span>
                                <span>SAR {sale.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="pt-2 text-sm space-y-2 font-mono">
                            <div className="flex justify-between text-slate-500">
                                <span>Net Amount</span>
                                <span>SAR {sale.netAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>VAT (15%)</span>
                                <span>SAR {sale.vatAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-black text-emerald-600 dark:text-emerald-400 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                                <span>TOTAL</span>
                                <span>SAR {sale.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center border-l-2 border-dashed border-slate-100 dark:border-slate-800 pl-6 w-32 shrink-0 relative">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(sale.zatcaQrCode || "")}`}
                            alt="ZATCA Official QR"
                            className="w-24 h-24 rounded-bl-xl rounded-tr-xl border-4 border-white dark:border-slate-900 shadow-xl"
                        />
                        <span className="text-[9px] text-slate-400 mt-4 uppercase tracking-widest font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Fatoora Standard</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 pt-6 flex justify-between">
                {isCleared ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                        <ShieldCheck className="w-4 h-4" /> Cleared
                    </div>
                ) : (
                    <ActionForm
                        action={async () => {
                            const res: any = await submitInvoiceToZatca(sale.id)
                            if (res?.error) throw new Error(res.error)
                            return res
                        }}
                        successMessage="Invoice officially reported to ZATCA!"
                    >
                        <SubmitButton variant="default">
                            <FileCheck2 className="w-4 h-4 mr-2" /> Report to Portal
                        </SubmitButton>
                    </ActionForm>
                )}

                <PrintButton />
            </CardFooter>
        </Card>
    )
}
