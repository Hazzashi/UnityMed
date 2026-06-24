import { Skeleton } from '@/components/ui/skeleton'

export default function NotesLoading() {
  return (
    <div className="flex h-[calc(100vh-24px)] overflow-hidden rounded-[22px] bg-white dark:bg-[#181816] border border-zinc-200/40 dark:border-zinc-800/40">
      <aside className="w-[240px] shrink-0 border-r border-zinc-200/40 dark:border-zinc-800/40 p-3 space-y-2">
        <Skeleton className="h-8 w-full rounded-xl" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-7 w-full rounded-xl" />
        ))}
      </aside>
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  )
}
