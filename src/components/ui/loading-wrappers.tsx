import { Skeleton } from "@/components/ui/skeleton";

// Skeleton for Statistics Cards
export function SkeletonStatisticsCards() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border/60 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm"
          >
            <div className="flex flex-col items-center space-y-1 sm:space-y-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        ))}

        <div className="col-span-2 sm:col-span-2 lg:col-span-2 bg-card border border-border/60 rounded-lg sm:rounded-xl shadow-sm">
          <div className="flex h-full min-h-[120px] sm:min-h-[132px] overflow-hidden rounded-t-lg sm:rounded-t-xl">
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 px-4 py-5 sm:px-5 sm:py-6">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-rose-100 px-4 py-5 sm:px-5 sm:py-6 border-l border-rose-100/60">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="flex items-center justify-center px-4 sm:px-6 bg-muted">
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
          <div className="px-4 sm:px-6 py-2.5 border-t border-border/60 rounded-b-lg sm:rounded-b-xl bg-muted/30">
            <Skeleton className="h-3 w-32 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for Supplies Table
export function SkeletonSuppliesTable() {
  return (
    <div className="flex-1 rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="flex items-center gap-4 py-3 border-b">
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton for Records Table
export function SkeletonRecordsTable() {
  return (
    <div className="space-y-3 rounded-xl border bg-card/60 p-4 shadow-sm">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center gap-4 py-3 border-b">
          <Skeleton className="h-4 w-4" />
          <div className="flex-1">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for Data List
export function SkeletonDataList() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic Loading Wrapper with Skeleton
export function LoadingWrapper({
  isLoading,
  skeleton,
  children,
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}
