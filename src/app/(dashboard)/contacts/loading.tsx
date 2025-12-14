import { Skeleton } from "@/components/ui/skeleton";

export default function ContactsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 bg-white/10" />
          <Skeleton className="h-4 w-48 bg-white/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 bg-white/10" />
          <Skeleton className="h-10 w-32 bg-white/10" />
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 bg-white/10" />
        <Skeleton className="h-10 w-32 bg-white/10" />
      </div>

      {/* Table header */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="bg-white/5 p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-8 bg-white/10" />
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-4 w-48 bg-white/10" />
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="h-4 w-20 bg-white/10" />
          </div>
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 bg-white/10" />
              <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-white/10" />
                <Skeleton className="h-3 w-32 bg-white/5" />
              </div>
              <Skeleton className="h-4 w-48 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
