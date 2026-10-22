import { Skeleton } from "@/components/ui/Skeleton";

export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-lg lg:rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      <div className="p-3 sm:p-4 lg:p-5 flex flex-col justify-between gap-2.5 lg:gap-3">
        <div className="space-y-1.5 lg:space-y-2">
          <Skeleton className="h-4 lg:h-6 w-full" />
          <Skeleton className="h-4 lg:h-6 w-3/4" />
        </div>

        <div className="pt-1.5 lg:pt-2 border-t border-slate-100 space-y-1.5 lg:space-y-2">
          <Skeleton className="h-3 lg:h-4.5 w-1/2" />
          <Skeleton className="h-3 lg:h-4.5 w-2/5" />
        </div>
      </div>
    </div>
  );
}
