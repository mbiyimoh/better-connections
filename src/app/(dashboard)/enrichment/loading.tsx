import { Skeleton } from "@/components/ui/skeleton";

export default function EnrichmentLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/5" />
        </div>
        <Skeleton className="h-10 w-40 bg-[#C9A227]/20" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-20 bg-white/10" />
            <Skeleton className="h-8 w-16 bg-white/10" />
          </div>
        ))}
      </div>

      {/* Queue list */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-white/10" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/5 rounded-lg p-4 flex items-center gap-4"
          >
            <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40 bg-white/10" />
              <Skeleton className="h-4 w-32 bg-white/5" />
            </div>
            <Skeleton className="h-2 w-24 rounded-full bg-white/10" />
            <Skeleton className="h-8 w-20 bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
