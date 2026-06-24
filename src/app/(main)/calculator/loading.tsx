import { Skeleton } from '@/components/ui/skeleton'

export default function CalculatorLoading() {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
