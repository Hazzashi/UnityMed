import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="p-5 space-y-4 max-w-7xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-[600px] rounded-2xl" />
    </div>
  )
}
