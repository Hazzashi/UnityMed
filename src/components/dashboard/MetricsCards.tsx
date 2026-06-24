'use client'
import { Flame, CalendarCheck, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Event } from '@/types'
import { formatHours } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MetricsCardsProps {
  weeklyStudied: number
  weeklyGoal: number
  streak: number
  nextEvent: Event | null
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  exam: 'Prova',
  assignment: 'Trabalho',
  study: 'Estudo',
  other: 'Outro',
}

export function MetricsCards({ weeklyStudied, weeklyGoal, streak, nextEvent }: MetricsCardsProps) {
  const progress = weeklyGoal > 0 ? Math.min((weeklyStudied / weeklyGoal) * 100, 100) : 0

  return (
    <div className="grid gap-4 sm:grid-cols-3">

      {/* ── Foco Semanal ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
                Foco Semanal
              </p>
              <p className="text-3xl font-bold text-black dark:text-[#F4F3EF] leading-none">
                {formatHours(weeklyStudied)}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                meta {formatHours(weeklyGoal)}
              </p>
            </div>
            {/* Ícone sem fundo colorido */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F3EF] dark:bg-[#181816]">
              <Clock className="h-5 w-5 text-black dark:text-[#F4F3EF]" />
            </div>
          </div>
          <Progress value={progress} />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 text-right">
            {progress.toFixed(0)}%
          </p>
        </CardContent>
      </Card>

      {/* ── Constância ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
                Constância
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-black dark:text-[#F4F3EF] leading-none">
                  {streak}
                </span>
                <span className="text-sm text-zinc-400 dark:text-zinc-500">dias</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">em sequência</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F3EF] dark:bg-[#181816]">
              <Flame className="h-5 w-5 text-black dark:text-[#F4F3EF]" />
            </div>
          </div>
          {/* Mini barra de streak */}
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < streak
                    ? 'bg-black dark:bg-[#F4F3EF]'
                    : 'bg-zinc-200/60 dark:bg-zinc-800/60'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Próximo Compromisso ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Próximo Evento
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F3EF] dark:bg-[#181816]">
              <CalendarCheck className="h-5 w-5 text-black dark:text-[#F4F3EF]" />
            </div>
          </div>
          {nextEvent ? (
            <div>
              <p className="font-semibold text-sm text-black dark:text-[#F4F3EF] leading-tight">
                {nextEvent.title}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {formatDistanceToNow(new Date(nextEvent.start_time), { addSuffix: true, locale: ptBR })}
              </p>
              <span className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-[#EAE8DF] dark:bg-[#2C2C27] text-black dark:text-[#F4F3EF]">
                {EVENT_TYPE_LABEL[nextEvent.type] ?? 'Evento'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhum compromisso próximo</p>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
