'use client'
import { useLayoutStore } from '@/store/layoutStore'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pdfMode = useLayoutStore(s => s.pdfMode)
  return (
    <div className={cn(
      'bg-app flex h-screen overflow-hidden transition-all duration-300',
      pdfMode ? 'gap-0 p-0' : 'gap-3 p-3'
    )}>
      {children}
    </div>
  )
}
