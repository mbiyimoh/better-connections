import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div className="flex h-screen">
      {/* Chat Panel */}
      <div className="w-[45%] flex flex-col border-r border-white/10">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <Skeleton className="h-6 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/5 mt-2" />
        </div>

        {/* Messages area */}
        <div className="flex-1 p-4 space-y-4">
          <div className="text-center py-12 space-y-4">
            <Skeleton className="h-4 w-64 mx-auto bg-white/10" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/5" />
              ))}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <Skeleton className="h-12 w-full bg-white/10" />
        </div>
      </div>

      {/* Contacts Panel */}
      <div className="flex-1 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <Skeleton className="h-10 w-full bg-white/10" />
        </div>

        {/* Contact cards */}
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 bg-white/10" />
                  <Skeleton className="h-4 w-32 bg-white/5" />
                </div>
                <Skeleton className="h-5 w-5 bg-white/10" />
              </div>
              <Skeleton className="h-16 w-full bg-[#C9A227]/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
