import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded-md" />
        <div className="h-4 w-96 bg-muted/60 rounded-md" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-lg" />
            </div>
            <div className="h-7 w-16 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted/60 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        <div className="divide-y divide-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted/60 rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
