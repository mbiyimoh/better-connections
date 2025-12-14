import { Skeleton } from "@/components/ui/skeleton";

export default function ContactDetailLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-24 bg-white/10" />

      {/* Header */}
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full bg-white/10" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-64 bg-white/10" />
          <Skeleton className="h-5 w-48 bg-white/5" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
            <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
            <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 bg-white/10" />
          <Skeleton className="h-10 w-10 bg-white/10" />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-4 space-y-3">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="h-5 w-full bg-white/10" />
            <Skeleton className="h-5 w-3/4 bg-white/5" />
          </div>
        ))}
      </div>

      {/* Notes section */}
      <div className="bg-white/5 rounded-lg p-4 space-y-3">
        <Skeleton className="h-5 w-32 bg-white/10" />
        <Skeleton className="h-20 w-full bg-white/10" />
      </div>
    </div>
  );
}
