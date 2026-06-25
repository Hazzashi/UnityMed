'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Timer, CalendarDays,
  BookOpen, BookMarked, GraduationCap, LogOut,
  ChevronLeft, ChevronRight, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { TimerBadge } from './TimerBadge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLayoutStore } from '@/store/layoutStore'

const navItems = [
  { href: '/dashboard',  label: 'Início',       icon: LayoutDashboard },
  { href: '/timer',      label: 'Foco',         icon: Timer },
  { href: '/calculator', label: 'Planejamento', icon: ClipboardList },
  { href: '/calendar',   label: 'Agenda',       icon: CalendarDays },
  { href: '/notes',      label: 'Cadernos',     icon: BookOpen },
  { href: '/glossary',   label: 'Glossário',    icon: BookMarked },
]

interface SidebarProps {
  userName?: string | null
  userCourse?: string | null
  userSemester?: string | null
}

export function Sidebar({ userName, userCourse, userSemester }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pdfMode = useLayoutStore(s => s.pdfMode)
  // Em modo PDF colapsa automaticamente para ganhar espaço
  const isCollapsed = collapsed || pdfMode
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'flex h-full flex-col',
          'rounded-[22px] bg-white dark:bg-[#181816]',
          'border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm',
          'transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed ? 'w-[64px]' : 'w-[240px]'
        )}
      >
        {/* ── Header: logo + título ── */}
        <div className={cn(
          'flex h-[60px] shrink-0 items-center border-b border-zinc-200/40 dark:border-zinc-800/40',
          isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black dark:bg-[#F4F3EF]">
            <GraduationCap className="h-4 w-4 text-white dark:text-black" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-black dark:text-[#F4F3EF]">UnityMed</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Sua plataforma médica</span>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            const item = (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                  isCollapsed
                    ? 'justify-center h-10 w-10 mx-auto'
                    : 'gap-3 px-3 py-2.5 w-full',
                  isActive
                    ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27] hover:text-black dark:hover:text-[#F4F3EF]'
                )}
              >
                <Icon className={cn('shrink-0', isCollapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')} />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            )

            if (isCollapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              )
            }
            return <div key={href}>{item}</div>
          })}
        </nav>

        {/* ── Timer Badge ── */}
        <TimerBadge collapsed={isCollapsed} />

        {/* ── Divisor ── */}
        <div className="mx-3 h-px bg-zinc-200/40 dark:bg-zinc-800/40" />

        {/* ── User info (somente expandido) ── */}
        {!isCollapsed && (
          <div className="px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-black dark:text-[#F4F3EF] leading-tight">
              {userName ?? 'Estudante'}
            </p>
            {(userCourse || userSemester) && (
              <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {[userCourse, userSemester].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* ── Footer: tema + sair ── */}
        <div className={cn('p-2 space-y-0.5', isCollapsed && 'flex flex-col items-center')}>
          <ThemeToggle collapsed={isCollapsed} />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  'flex items-center rounded-xl text-sm font-medium transition-colors',
                  isCollapsed
                    ? 'justify-center h-10 w-10'
                    : 'gap-3 px-3 py-2 w-full',
                  'text-zinc-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400'
                )}
              >
                <LogOut className={cn('shrink-0', isCollapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')} />
                {!isCollapsed && <span>Sair</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right" className="text-xs">Sair</TooltipContent>}
          </Tooltip>

          {/* ── Toggle colapso — rodapé da sidebar ── */}
          <div className="mx-1 h-px bg-zinc-200/40 dark:bg-zinc-800/40" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  'flex items-center rounded-xl text-sm font-medium transition-colors',
                  isCollapsed
                    ? 'justify-center h-10 w-10'
                    : 'gap-3 px-3 py-2 w-full',
                  'text-zinc-400 dark:text-zinc-500 hover:bg-[#F4F3EF] dark:hover:bg-[#2C2C27] hover:text-black dark:hover:text-[#F4F3EF]'
                )}
              >
                {isCollapsed
                  ? <ChevronRight className="h-[18px] w-[18px]" />
                  : <>
                      <ChevronLeft className="h-4 w-4" />
                      <span>Fechar menu</span>
                    </>
                }
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right" className="text-xs">Expandir menu</TooltipContent>}
          </Tooltip>
        </div>

      </aside>
    </TooltipProvider>
  )
}
