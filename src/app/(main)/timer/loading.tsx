import { Skeleton } from '@/components/ui/skeleton'

export default function TimerLoading() {
  return (
    <div className="p-6 flex flex-col items-center gap-8 max-w-md mx-auto">
      <Skeleton className="h-9 w-48 rounded-full" />
      <Skeleton className="h-[280px] w-[280px] rounded-full" />
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>
    </div>
  )
}
