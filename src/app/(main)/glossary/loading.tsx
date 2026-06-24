import { Skeleton } from '@/components/ui/skeleton'

export default function GlossaryLoading() {
  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
