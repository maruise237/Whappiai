import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 sm:space-y-12 pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded opacity-40" />
        </div>
        <Skeleton className="h-8 w-32 rounded bg-muted" />
      </div>

      {/* Stats Quick View Skeleton */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col p-4 rounded border border-border bg-muted/20">
            <Skeleton className="h-3 w-16 mb-2 opacity-30" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Selection Bar Skeleton */}
      <div className="flex items-center justify-between p-4 rounded border border-border bg-muted/20">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-40 rounded" />
          <Skeleton className="hidden sm:block h-5 w-24 rounded-full opacity-30" />
        </div>
        <Skeleton className="h-9 w-28 rounded" />
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          <section className="space-y-4">
            <Skeleton className="h-4 w-32 opacity-30" />
            <Card className="border border-border bg-muted/10 h-[280px]">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48 opacity-40" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded" />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <Skeleton className="h-4 w-32 opacity-30" />
            <Card className="border border-border bg-muted/10 h-[400px]">
              <div className="p-4 border-b border-border flex gap-3">
                <Skeleton className="h-9 w-24 rounded" />
                <Skeleton className="h-9 w-24 rounded" />
                <Skeleton className="h-9 w-24 rounded" />
              </div>
            </Card>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <section className="space-y-4">
            <Skeleton className="h-4 w-32 opacity-30" />
            <div className="rounded border border-border bg-muted/10 h-[300px]" />
          </section>

          <section className="space-y-4">
            <Skeleton className="h-4 w-32 opacity-30" />
            <div className="p-4 rounded border border-border bg-muted/20 space-y-4">
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded mx-auto opacity-20" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col p-4 rounded border border-border bg-muted/20">
          <Skeleton className="h-3 w-16 mb-2 opacity-30" />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
  return (
    <div className="rounded border border-border overflow-hidden bg-card shadow-sm">
      <div className="h-12 border-b border-border bg-muted/30 flex items-center px-6 gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded opacity-30" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 flex items-center px-6 gap-6">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-3 flex-1 rounded opacity-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActivitySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded border border-border bg-card shadow-sm overflow-hidden">
      <div className="divide-y divide-border">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-3 flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded shrink-0 opacity-20" />
            <div className="flex-1 space-y-2 py-1">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-24 rounded opacity-30" />
                <Skeleton className="h-2 w-8 rounded opacity-10" />
              </div>
              <Skeleton className="h-2 w-32 rounded opacity-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
