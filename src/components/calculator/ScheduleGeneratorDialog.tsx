'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Loader2, Sparkles } from 'lucide-react'
import { addDays, startOfWeek, setHours, setMinutes, addHours } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Subject } from '@/types'
import type { Database } from '@/types/database'

type EventInsert = Database['public']['Tables']['events']['Insert']
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Array<Subject & { allocated_hours: number }>
  userId: string
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const BLOCK_OPTIONS = [
  { value: 1,   label: '1h' },
  { value: 1.5, label: '1h30' },
  { value: 2,   label: '2h' },
]

const TIME_OPTIONS = [
  { start: 7,  end: 12, label: 'Manhã',    sub: '07–12h' },
  { start: 13, end: 18, label: 'Tarde',    sub: '13–18h' },
  { start: 19, end: 23, label: 'Noite',    sub: '19–23h' },
  { start: 8,  end: 22, label: 'Dia todo', sub: '08–22h' },
]

export function ScheduleGeneratorDialog({ open, onOpenChange, subjects, userId }: Props) {
  const router = useRouter()
  const [blockHours, setBlockHours]   = useState(1.5)
  const [activeDays, setActiveDays]   = useState<number[]>([0, 1, 2, 3, 4])
  const [timeOption, setTimeOption]   = useState(0)
  const [weekOffset, setWeekOffset]   = useState(1)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const { start: startHour, end: endHour } = TIME_OPTIONS[timeOption]
  const eligible = subjects.filter((s) => s.allocated_hours > 0)

  const preview = useMemo(() => {
    const slotsPerDay  = Math.floor((endHour - startHour) / blockHours)
    const totalSlots   = activeDays.length * slotsPerDay
    const withBlocks   = eligible.map((s) => ({
      ...s,
      blocks: Math.ceil(s.allocated_hours / blockHours),
    }))
    const totalNeeded  = withBlocks.reduce((sum, s) => sum + s.blocks, 0)
    return { slotsPerDay, totalSlots, withBlocks, totalNeeded }
  }, [eligible, blockHours, activeDays, startHour, endHour])

  function toggleDay(i: number) {
    setActiveDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()
    )
  }

  async function handleGenerate() {
    if (activeDays.length === 0 || preview.withBlocks.length === 0) return
    setLoading(true)
    setError(null)

    try {
      // Segunda-feira da semana alvo
      const baseMonday = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7)

      // Constrói slots em ordem: hora-slot primeiro, depois dias
      // Isso distribui as matérias ao longo da semana em vez de empilhar tudo num dia só
      const slots: Date[] = []
      const slotsPerDay = Math.floor((endHour - startHour) / blockHours)

      for (let slotInDay = 0; slotInDay < slotsPerDay; slotInDay++) {
        for (const dayOffset of activeDays) {
          const day      = addDays(baseMonday, dayOffset)
          const hour     = startHour + slotInDay * blockHours
          const fullHour = Math.floor(hour)
          const minutes  = Math.round((hour % 1) * 60)
          slots.push(setMinutes(setHours(day, fullHour), minutes))
        }
      }

      // Matérias mais pesadas (difíceis) recebem os slots mais cedo
      const sorted = [...preview.withBlocks].sort((a, b) => b.weight - a.weight)
      const events: EventInsert[] = []
      let slotIdx = 0

      for (const subject of sorted) {
        for (let i = 0; i < subject.blocks; i++) {
          if (slotIdx >= slots.length) break
          const start = slots[slotIdx++]
          events.push({
            user_id:     userId,
            subject_id:  subject.id,
            title:       subject.name,
            description: null,
            start_time:  start.toISOString(),
            end_time:    addHours(start, blockHours).toISOString(),
            type:        'study',
            all_day:     false,
          })
        }
      }

      if (events.length === 0) {
        setError('Nenhum bloco pôde ser gerado. Verifique a configuração.')
        return
      }

      const supabase = createClient()
      const { error: dbError } = await (supabase as any).from('events').insert(events)
      if (dbError) throw dbError

      onOpenChange(false)
      router.push(`/calendar?semana=${weekOffset}`)
      router.refresh()
    } catch (err: unknown) {
      const pg = err as { message?: string }
      console.error('[Calculator] Erro ao gerar cronograma:', err)
      setError(`Não foi possível gerar. ${pg.message ?? 'Tente novamente.'}`)
    } finally {
      setLoading(false)
    }
  }

  const fits = preview.totalNeeded <= preview.totalSlots

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black dark:text-[#F4F3EF]">
            <Sparkles className="h-4 w-4" />
            Montar Semana de Estudos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Distribui seus blocos de estudo automaticamente na agenda.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Semana alvo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quando lançar
            </Label>
            <div className="flex gap-2">
              {[
                { v: 0, label: 'Esta semana' },
                { v: 1, label: 'Próxima' },
                { v: 2, label: 'Em 2 semanas' },
              ].map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setWeekOffset(v)}
                  className={cn(
                    'flex-1 rounded-xl py-2 text-sm font-medium border transition-all',
                    weekOffset === v
                      ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black border-transparent'
                      : 'border-zinc-200/60 dark:border-zinc-700/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dias */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dias de estudo
            </Label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'flex-1 rounded-xl py-2 text-xs font-semibold transition-all',
                    activeDays.includes(i)
                      ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black'
                      : 'bg-[#EAE8DF] dark:bg-[#2C2C27] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Duração de cada bloco
            </Label>
            <div className="flex gap-2">
              {BLOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBlockHours(opt.value)}
                  className={cn(
                    'flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all',
                    blockHours === opt.value
                      ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black border-transparent'
                      : 'border-zinc-200/60 dark:border-zinc-700/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Turno */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Turno preferido
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setTimeOption(i)}
                  className={cn(
                    'rounded-xl py-2.5 text-xs font-medium border transition-all flex flex-col items-center gap-0.5',
                    timeOption === i
                      ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black border-transparent'
                      : 'border-zinc-200/60 dark:border-zinc-700/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className={cn('text-[10px]', timeOption === i ? 'opacity-60' : '')}>
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Prévia */}
          {eligible.length > 0 ? (
            <div className="rounded-xl bg-[#F4F3EF] dark:bg-[#181816] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prévia
                </p>
                <span className="text-xs text-muted-foreground">
                  {preview.totalNeeded} blocos · {preview.totalSlots} vagas
                </span>
              </div>
              <div className="space-y-2">
                {preview.withBlocks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full shrink-0 bg-[#1E3A5F] dark:bg-[#4A72A8]" />
                    <span className="text-sm flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {s.blocks}× {blockHours === 1.5 ? '1h30' : `${blockHours}h`}
                    </span>
                    <span className="text-xs font-semibold shrink-0 text-[#1E3A5F] dark:text-[#4A72A8]">
                      = {s.allocated_hours}h
                    </span>
                  </div>
                ))}
              </div>
              {!fits && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-2.5 py-1.5">
                  ⚠ Faltam vagas para {preview.totalNeeded - preview.totalSlots} bloco(s). Adicione mais dias ou reduza a duração.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-[#F4F3EF] dark:bg-[#181816] px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma matéria com horas alocadas. Salve o planejamento primeiro.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || activeDays.length === 0 || eligible.length === 0}
            className="gap-2"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <CalendarPlus className="h-4 w-4" />
            }
            {loading ? 'Gerando…' : `Lançar ${preview.totalNeeded} blocos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
