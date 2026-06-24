'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100/80 dark:hover:bg-[#2C2C27]/60',
        'hover:text-black dark:hover:text-[#F4F3EF]',
        collapsed && 'justify-center px-0'
      )}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark'
        ? <Sun className="h-4 w-4 shrink-0" />
        : <Moon className="h-4 w-4 shrink-0" />
      }
      {!collapsed && (
        <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
      )}
    </button>
  )
}
