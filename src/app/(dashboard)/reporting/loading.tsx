import { TableSkeleton, CardSkeleton } from "@/components/ui/Skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReportingLoading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12 space-y-10">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex justify-between items-center mb-8">
                    <Skeleton className="h-14 w-72 rounded-2xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-48 rounded-lg" />
                        <TableSkeleton rows={5} cols={4} />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-48 rounded-lg" />
                        <TableSkeleton rows={5} cols={2} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        </div>
    )
}
