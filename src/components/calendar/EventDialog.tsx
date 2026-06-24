'use client'
import { useState, useEffect } from 'react'
import { format, addHours } from 'date-fns'
import { Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Event, Subject } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSlot: { date: Date; hour: number } | null
  editingEvent: Event | null
  subjects: Subject[]
  userId: string
  onSaved: (event: Event) => void
  onDeleted: (id: string) => void
}

const TYPE_OPTIONS = [
  { value: 'study',      label: 'Estudo' },
  { value: 'exam',       label: 'Prova' },
  { value: 'assignment', label: 'Trabalho' },
  { value: 'other',      label: 'Outro' },
]

function toInputDatetime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function EventDialog({
  open, onOpenChange, initialSlot, editingEvent, subjects, userId, onSaved, onDeleted,
}: EventDialogProps) {
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [type, setType]             = useState<Event['type']>('study')
  const [subjectId, setSubjectId]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    if (editingEvent) {
      setTitle(editingEvent.title)
      setDescription(editingEvent.description ?? '')
      setStartTime(toInputDatetime(new Date(editingEvent.start_time)))
      setEndTime(toInputDatetime(new Date(editingEvent.end_time)))
      setType(editingEvent.type)
      setSubjectId(editingEvent.subject_id ?? '')
    } else if (initialSlot) {
      const start = new Date(initialSlot.date)
      start.setHours(initialSlot.hour, 0, 0, 0)
      setStartTime(toInputDatetime(start))
      setEndTime(toInputDatetime(addHours(start, 1)))
      setTitle('')
      setDescription('')
      setType('study')
      setSubjectId('')
    } else {
      // "Novo evento" sem slot — padrão: próxima hora cheia
      const now = new Date()
      now.setMinutes(0, 0, 0)
      now.setHours(now.getHours() + 1)
      setStartTime(toInputDatetime(now))
      setEndTime(toInputDatetime(addHours(now, 1)))
      setTitle('')
      setDescription('')
      setType('study')
      setSubjectId('')
    }
  }, [editingEvent, initialSlot, open])

  async function handleSave() {
    if (!title.trim() || !startTime || !endTime) return
    setLoading(true)
    setError(null)

    const payload = {
      user_id: userId,
      title: title.trim(),
      description: description || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      type,
      subject_id: subjectId || null,
      all_day: false,
    }

    try {
      const supabase = createClient()
      let savedData: Event | null = null

      if (editingEvent) {
        const { data, error: dbError } = await (supabase as any)
          .from('events').update(payload).eq('id', editingEvent.id).select().single()
        if (dbError) throw dbError
        savedData = data
      } else {
        const { data, error: dbError } = await (supabase as any)
          .from('events').insert(payload).select().single()
        if (dbError) throw dbError
        savedData = data
      }

      if (savedData) onSaved(savedData)
      onOpenChange(false)
    } catch (err: unknown) {
      const pg = err as { message?: string; code?: string; details?: string }
      console.error('[Calendar] Erro ao salvar evento — message:', pg.message, '| code:', pg.code, '| details:', pg.details, '| raw:', err)
      setError(`Não foi possível salvar o evento. ${pg.message ?? 'Verifique se o horário de fim é posterior ao início.'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editingEvent) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: dbError } = await (supabase as any)
        .from('events').delete().eq('id', editingEvent.id)
      if (dbError) throw dbError
      onDeleted(editingEvent.id)
      onOpenChange(false)
    } catch (err: unknown) {
      const pg = err as { message?: string; code?: string }
      console.error('[Calendar] Erro ao excluir evento — message:', pg.message, '| code:', pg.code, '| raw:', err)
      setError(`Não foi possível excluir o evento. ${pg.message ?? 'Tente novamente.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingEvent ? 'Editar evento' : 'Novo evento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              placeholder="Título do evento…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as Event['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Matéria (opcional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Detalhes do evento…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-row justify-between">
          {editingEvent && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || !title.trim()} className="gap-1.5">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
