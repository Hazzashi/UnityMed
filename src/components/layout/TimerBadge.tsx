'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Timer } from 'lucide-react'
import { useTimerStore } from '@/store/timerStore'
import { formatSeconds } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TimerBadgeProps {
  collapsed?: boolean
}

export function TimerBadge({ collapsed }: TimerBadgeProps) {
  const { isRunning, getElapsed, subjectName } = useTimerStore()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  if (!isRunning) return null

  const elapsed = getElapsed()

  return (
    <Link href="/timer" className="mx-2 mb-2 block">
      <div className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
        'bg-[#EAE8DF] dark:bg-[#2C2C27]',
        'border border-zinc-200/40 dark:border-zinc-800/40',
        'hover:bg-zinc-200/60 dark:hover:bg-[#333330]',
        collapsed && 'justify-center'
      )}>
        {/* Pulse dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/40 dark:bg-[#F4F3EF]/40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-black dark:bg-[#F4F3EF]" />
        </span>

        {!collapsed ? (
          <>
            <Timer className="h-3.5 w-3.5 shrink-0 text-black dark:text-[#F4F3EF]" />
            <span className="truncate flex-1 text-black dark:text-[#F4F3EF]">{subjectName}</span>
            <span className="font-mono tabular-nums shrink-0 text-black dark:text-[#F4F3EF]">
              {formatSeconds(elapsed)}
            </span>
          </>
        ) : (
          <span className="font-mono tabular-nums text-[10px] text-black dark:text-[#F4F3EF]">
            {formatSeconds(elapsed)}
          </span>
        )}
      </div>
    </Link>
  )
}
