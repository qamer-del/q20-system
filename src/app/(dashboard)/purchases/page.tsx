import { prisma } from "@/lib/prisma"
import { addSupplier, processRefillPurchase } from "@/features/purchases/actions"
import { Truck, Receipt, Building2, Plus, ArrowRightLeft, Users } from "lucide-react"
import { cookies } from "next/headers"
import enDict from "../../../../messages/en.json"
import arDict from "../../../../messages/ar.json"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import VendorRow from "./VendorRow"

async function getTranslation() {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  return locale === "ar" ? arDict : enDict
}

export default async function PurchasesPage() {
  const dict = await getTranslation()
  const suppliers = await prisma.supplier.findMany()
  const tanks = await prisma.tank.findMany({ include: { fuelType: true } })
  const recentPurchases = await prisma.purchase.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { supplier: true, fuelType: true }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight glass-title shadow-sm">
             <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl">
               <Truck className="w-8 h-8" />
             </div>
             {(dict.Purchases as any).title}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* LEFT: Receive Delivery Form */}
          <div className="lg:col-span-3">
             <Card className="border-t-4 border-t-blue-600 shadow-xl">
               <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                 <CardTitle className="text-2xl font-black flex items-center gap-3">
                   {(dict.Purchases as any).log_delivery}
                 </CardTitle>
               </CardHeader>
               
               <CardContent>
                 <form action={processRefillPurchase} className="space-y-6">
                   
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{(dict.Purchases as any).supplier}</label>
                     <select name="supplierId" required className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus:ring-2 focus:ring-blue-500">
                       <option value="">Select an Approved Vendor...</option>
                       {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name} (VAT: {s.vatNumber})</option>)}
                     </select>
                   </div>

                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{(dict.Purchases as any).select_tank}</label>
                     <select name="tankId" required className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus:ring-2 focus:ring-blue-500">
                       <option value="">Choose Storage Destination...</option>
                       {tanks.map((t: any) => (
                         <option key={t.id} value={t.id}>
                           {t.name} - {t.fuelType.name} | Space Limit: {(t.capacity - t.currentVolume).toLocaleString()}L
                         </option>
                       ))}
                     </select>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-3">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{(dict.Purchases as any).invoice_number}</label>
                       <Input type="text" name="invoiceNumber" placeholder="ARAMCO-001" required className="font-mono text-sm uppercase" />
                     </div>
                     <div className="space-y-3">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{(dict.Purchases as any).cost_per_l}</label>
                       <Input type="number" step="0.001" name="unitPrice" placeholder="0.00" required className="font-mono" />
                     </div>
                   </div>

                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{(dict.Purchases as any).received_quantity}</label>
                     <Input type="number" step="0.1" name="quantity" placeholder="10000" required className="h-20 text-4xl border-2 font-mono text-center font-black !rounded-2xl text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 focus-visible:ring-4 focus-visible:ring-blue-600/20 md:tracking-widest" />
                   </div>

                   {/* Payment Method — Required */}
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Method</label>
                     <div className="flex gap-4">
                       <label className="flex-1 cursor-pointer">
                         <input type="radio" name="paymentMethod" value="CASH" className="peer hidden" required />
                         <div className="peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600 peer-checked:shadow-lg bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center font-bold transition-all uppercase tracking-widest text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cash</div>
                       </label>
                       <label className="flex-1 cursor-pointer">
                         <input type="radio" name="paymentMethod" value="BANK" className="peer hidden" />
                         <div className="peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 peer-checked:shadow-lg bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center font-bold transition-all uppercase tracking-widest text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Bank</div>
                       </label>
                     </div>
                   </div>

                   <Button type="submit" variant="primary" className="w-full h-16 text-lg mt-4 shadow-xl">
                     <ArrowRightLeft className="w-6 h-6 mr-3" /> {(dict.Purchases as any).log_delivery}
                   </Button>

                 </form>
               </CardContent>
             </Card>
          </div>

          {/* RIGHT: Add Supplier & History */}
          <div className="lg:col-span-2 space-y-8">
            
            <Card className="shadow-xl">
               <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                 <CardTitle className="text-lg flex items-center gap-2"><Users className="text-emerald-500 w-5 h-5" /> Active Vendors</CardTitle>
                 <CardDescription>Register or edit active institutional suppliers to seamlessly process incoming deliveries.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 <form action={addSupplier} className="space-y-4">
                   <div className="flex gap-2">
                     <div className="flex-1 space-y-1">
                       <Input type="text" name="name" placeholder="Saudi Aramco" required />
                     </div>
                     <div className="flex-1 space-y-1">
                       <Input type="text" name="vatNumber" placeholder="VAT 300..." required className="font-mono text-sm" />
                     </div>
                   </div>
                   <Button type="submit" variant="secondary" className="w-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4 mr-2" /> Add Vendor</Button>
                 </form>

                 {suppliers.length > 0 && (
                   <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-6">
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Vendor Directory</h3>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                       {suppliers.map((s: any) => <VendorRow key={s.id} supplier={s} />)}
                     </div>
                   </div>
                 )}
               </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col h-full">
               <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                 <CardTitle className="text-lg flex items-center gap-2"><Receipt className="text-amber-500 w-5 h-5" /> {(dict.Purchases as any).recent_deliveries}</CardTitle>
                 <CardDescription>Audit trail of all registered fuel injections into the station's underground framework.</CardDescription>
               </CardHeader>
               <CardContent className="flex-1">
                 <div className="space-y-3">
                   {recentPurchases.length === 0 && (
                     <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                       <span className="italic block mb-2">No deliveries recorded yet.</span>
                       <span className="text-[10px] uppercase font-bold tracking-widest">Awaiting First Shipment</span>
                     </div>
                   )}
                   
                   {recentPurchases.map((p: any) => (
                     <div key={p.id} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div>
                          <p className="font-bold dark:text-white flex items-center gap-2">
                             {p.supplier.name} 
                             <span className="bg-indigo-50 border border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-900/50 dark:text-indigo-400 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-black max-w-[80px] truncate block">{p.invoiceNumber}</span>
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-1 font-bold">{p.quantity.toLocaleString()} L <span className="font-sans font-normal mx-1">of</span> {p.fuelType.code}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">SAR {p.totalAmount.toLocaleString()}</p>
                          <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  )
}
