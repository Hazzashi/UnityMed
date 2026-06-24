'use client'
import Link from 'next/link'
import { Timer, ArrowRight } from 'lucide-react'
import type { Event } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TodayWidgetProps {
  events: Event[]
}

const TYPE_LABEL: Record<string, string> = {
  study: 'Estudo', exam: 'Prova', assignment: 'Trabalho', other: 'Outro',
}

export function TodayWidget({ events }: TodayWidgetProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-zinc-200/60 dark:border-zinc-800/60 py-10 text-center">
        <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Dia livre!</p>
        <p className="text-xs text-zinc-400/70 dark:text-zinc-500/70 mt-1">
          Nenhum bloco agendado para hoje.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const startTime = format(parseISO(event.start_time), 'HH:mm', { locale: ptBR })
        const endTime   = format(parseISO(event.end_time),   'HH:mm', { locale: ptBR })

        return (
          <div
            key={event.id}
            className={cn(
              'flex items-center gap-4 rounded-[16px] px-4 py-3 transition-colors',
              'bg-[#F4F3EF] dark:bg-[#181816]',
              'border border-zinc-200/40 dark:border-zinc-800/40',
              'hover:bg-[#EAE8DF] dark:hover:bg-[#2C2C27]'
            )}
          >
            {/* Horário */}
            <div className="text-center min-w-[44px]">
              <p className="text-xs font-bold text-black dark:text-[#F4F3EF]">{startTime}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{endTime}</p>
            </div>

            {/* Divisor vertical */}
            <div className="w-px h-8 bg-zinc-200/60 dark:bg-zinc-700/60 shrink-0" />

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black dark:text-[#F4F3EF] truncate">
                {event.title}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {TYPE_LABEL[event.type] ?? 'Evento'}
              </p>
            </div>

            {event.type === 'study' && (
              <Link href={`/timer?subject=${event.subject_id ?? ''}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs h-8 px-3 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF]"
                >
                  <Timer className="h-3.5 w-3.5" />
                  Iniciar
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
