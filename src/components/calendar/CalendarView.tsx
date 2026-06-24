'use client'
import { useState, useRef, Fragment } from 'react'
import { format, addDays, startOfWeek, isSameDay, parseISO, setHours, setMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Event, Subject } from '@/types'
import { Button } from '@/components/ui/button'
import { EventDialog } from './EventDialog'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 07–22h
const CELL_HEIGHT = 56 // px — h-14

interface CalendarViewProps {
  initialEvents: Event[]
  subjects: Subject[]
  userId: string
  initialWeekOffset?: number
}

// Todos os eventos usam navy corporativo — fundo sólido, texto branco
function getEventStyle(): React.CSSProperties {
  return {
    background: '#1E3A5F',
    color:      '#FFFFFF',
    border:     'none',
  }
}

export function CalendarView({
  initialEvents,
  subjects,
  userId,
  initialWeekOffset = 0,
}: CalendarViewProps) {
  const [events, setEvents]             = useState<Event[]>(initialEvents)
  const [weekOffset, setWeekOffset]     = useState(initialWeekOffset)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  const draggingRef = useRef<{ event: Event; durationMs: number } | null>(null)
  const dragMovedRef = useRef(false)
  const [dropTarget, setDropTarget] = useState<{ day: Date; hour: number } | null>(null)

  function onEventMouseDown(e: React.MouseEvent, event: Event) {
    e.preventDefault()
    e.stopPropagation()
    const start = new Date(event.start_time)
    const end   = new Date(event.end_time)
    draggingRef.current = { event, durationMs: end.getTime() - start.getTime() }
    dragMovedRef.current = false
  }

  function onCellMouseEnter(day: Date, hour: number) {
    if (!draggingRef.current) return
    dragMovedRef.current = true
    setDropTarget({ day, hour })
  }

  async function onMouseUp() {
    const drag   = draggingRef.current
    const target = dropTarget
    draggingRef.current = null
    setDropTarget(null)

    if (!drag || !target || !dragMovedRef.current) return

    const newStart = setMinutes(setHours(new Date(target.day), target.hour), 0)
    const newEnd   = new Date(newStart.getTime() + drag.durationMs)
    const updated: Event = {
      ...drag.event,
      start_time: newStart.toISOString(),
      end_time:   newEnd.toISOString(),
    }

    // Optimistic update
    setEvents((prev) => prev.map((e) => e.id === drag.event.id ? updated : e))

    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('events')
        .update({ start_time: updated.start_time, end_time: updated.end_time })
        .eq('id', drag.event.id)
      if (error) throw error
    } catch (err) {
      console.error('[Calendar] Erro ao mover evento:', err)
      setEvents((prev) => prev.map((e) => e.id === drag.event.id ? drag.event : e))
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  const today    = new Date()
  const weekStart = addDays(startOfWeek(today, { locale: ptBR }), weekOffset * 7)
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getEventsForSlot(day: Date, hour: number) {
    return events.filter((e) => {
      const start = parseISO(e.start_time)
      return isSameDay(start, day) && start.getHours() === hour
    })
  }

  function openSlot(date: Date, hour: number) {
    if (dragMovedRef.current) return
    setSelectedSlot({ date, hour })
    setEditingEvent(null)
    setDialogOpen(true)
  }

  function onEventSaved(event: Event) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = event; return next
      }
      return [...prev, event]
    })
  }

  function onEventDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  // Calcula altura proporcional para eventos multi-hora
  function getEventHeight(event: Event): number {
    const durationMs = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
    const durationH  = durationMs / (1000 * 60 * 60)
    return Math.max(CELL_HEIGHT * durationH - 4, 20)
  }

  return (
    <div
      className="select-none"
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <Card className="overflow-hidden">
        {/* Barra de navegação */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/40 dark:border-zinc-800/40">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="text-xs h-8 px-3"
            >
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-black dark:text-[#F4F3EF] ml-1">
              {format(weekStart, "d 'de' MMMM", { locale: ptBR })} —{' '}
              {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              Arraste para mover eventos
            </span>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => { setSelectedSlot(null); setEditingEvent(null); setDialogOpen(true) }}
            >
              <Plus className="h-4 w-4" />
              Novo evento
            </Button>
          </div>
        </div>

      {/* Grade */}
      <div
        className={cn(
          'overflow-auto',
          draggingRef.current && 'cursor-grabbing'
        )}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: '52px repeat(7, 1fr)', minWidth: '700px' }}
        >
          {/* Cabeçalho */}
          <div className="sticky top-0 z-20 bg-white dark:bg-[#181816] border-b border-zinc-200/40 dark:border-zinc-800/40 h-12" />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'sticky top-0 z-20 flex flex-col items-center justify-center border-b border-l border-zinc-200/40 dark:border-zinc-800/40 h-12 bg-white dark:bg-[#181816]',
                  isToday && 'bg-[#EAE8DF] dark:bg-[#2C2C27]'
                )}
              >
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn(
                  'text-sm font-bold leading-none mt-0.5 text-black dark:text-[#F4F3EF]',
                  isToday && 'text-black dark:text-[#F4F3EF]'
                )}>
                  {format(day, 'd')}
                </span>
              </div>
            )
          })}

          {/* Linhas de hora */}
          {HOURS.map((hour) => (
            <Fragment key={hour}>
              <div
                className="flex items-start justify-end pr-2 pt-1 text-[11px] text-muted-foreground border-b border-zinc-200/40 dark:border-zinc-800/40"
                style={{ height: CELL_HEIGHT }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
              {weekDays.map((day) => {
                const slotEvents = getEventsForSlot(day, hour)
                const isToday    = isSameDay(day, today)
                const isTarget   = dropTarget && isSameDay(day, dropTarget.day) && dropTarget.hour === hour
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    onMouseDown={() => { dragMovedRef.current = false }}
                    onMouseEnter={() => onCellMouseEnter(day, hour)}
                    onClick={() => openSlot(day, hour)}
                    className={cn(
                      'relative border-b border-l border-zinc-200/40 dark:border-zinc-800/40 cursor-pointer transition-colors bg-white dark:bg-[#181816]',
                      isToday
                        ? 'bg-[#F4F3EF] dark:bg-[#1E1E1C] hover:bg-[#EAE8DF] dark:hover:bg-[#2C2C27]'
                        : 'hover:bg-[#F4F3EF] dark:hover:bg-[#2A2A27]',
                      isTarget && 'bg-[#EAE8DF] dark:bg-[#2C2C27]'
                    )}
                    style={{ height: CELL_HEIGHT }}
                  >
                    {/* Indicador de drop */}
                    {isTarget && (
                      <div className="absolute inset-1 rounded-lg border-2 border-dashed border-zinc-400 dark:border-zinc-500 pointer-events-none z-10" />
                    )}

                    {slotEvents.map((event) => {
                      const style    = getEventStyle()
                      const height   = getEventHeight(event)
                      const isDragged = draggingRef.current?.event.id === event.id
                      return (
                        <div
                          key={event.id}
                          onMouseDown={(e) => onEventMouseDown(e, event)}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (dragMovedRef.current) return
                            setEditingEvent(event)
                            setDialogOpen(true)
                          }}
                          className={cn(
                            'absolute inset-x-0.5 top-0.5 rounded-lg px-2 py-1 text-[11px] font-semibold z-10 overflow-hidden cursor-grab active:cursor-grabbing transition-opacity',
                            isDragged && 'opacity-40'
                          )}
                          style={{ ...style, height: Math.min(height, CELL_HEIGHT - 4) }}
                        >
                          <div className="truncate leading-tight">{event.title}</div>
                          <div className="opacity-60 text-[10px] leading-tight">
                            {format(parseISO(event.start_time), 'HH:mm')}–
                            {format(parseISO(event.end_time), 'HH:mm')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
      </Card>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialSlot={selectedSlot}
        editingEvent={editingEvent}
        subjects={subjects}
        userId={userId}
        onSaved={onEventSaved}
        onDeleted={onEventDeleted}
      />
    </div>
  )
}
