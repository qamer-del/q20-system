import { HardwareSkeleton } from "@/components/ui/Skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function InventoryLoading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-12 space-y-10">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex justify-between items-center mb-10">
                    <Skeleton className="h-14 w-64 rounded-2xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <HardwareSkeleton />
                    <HardwareSkeleton />
                    <HardwareSkeleton />
                </div>
            </div>
        </div>
    )
}
