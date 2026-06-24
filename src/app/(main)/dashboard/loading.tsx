import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-5 space-y-4 max-w-7xl">
      <div className="pt-1 pb-2 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}
