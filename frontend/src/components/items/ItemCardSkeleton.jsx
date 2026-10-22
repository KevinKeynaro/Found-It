import { Skeleton } from "@/components/ui/Skeleton";

export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      <div className="p-3 sm:p-3.5 flex flex-col justify-between gap-2">
        <div className="space-y-1">
          <Skeleton className="h-3.5 sm:h-4 w-full" />
          <Skeleton className="h-3.5 sm:h-4 w-3/4" />
        </div>

        <div className="pt-1.5 border-t border-slate-100 space-y-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    </div>
  );
}
