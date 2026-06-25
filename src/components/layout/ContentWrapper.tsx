'use client'
import { useLayoutStore } from '@/store/layoutStore'
import { cn } from '@/lib/utils'

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pdfMode = useLayoutStore(s => s.pdfMode)
  return (
    <div className={cn(
      'flex-1 min-w-0',
      pdfMode ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin'
    )}>
      <div className={cn('flex min-h-full justify-center', pdfMode && 'h-full')}>
        <main className={cn('w-full', !pdfMode && 'max-w-[1060px]')}>
          {children}
        </main>
      </div>
    </div>
  )
}
