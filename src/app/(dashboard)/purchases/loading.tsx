import { TableSkeleton, CardSkeleton } from "@/components/ui/Skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function PurchasesLoading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12 space-y-10">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex justify-between items-center mb-10">
                    <Skeleton className="h-14 w-80 rounded-2xl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-10">
                        <CardSkeleton />
                        <TableSkeleton rows={8} cols={4} />
                    </div>
                    <div className="space-y-8">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </div>
            </div>
        </div>
    )
}
