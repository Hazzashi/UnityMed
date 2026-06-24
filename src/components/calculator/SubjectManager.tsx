'use client'
import { useState } from 'react'
import { Plus, Trash2, Save, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Subject } from '@/types'
import { formatHours, SUBJECT_COLOR, SUBJECT_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ScheduleGeneratorDialog } from './ScheduleGeneratorDialog'

interface SubjectManagerProps {
  initialSubjects: Subject[]
  initialWeeklyGoal: number
  userId: string
}

const WEIGHT_LABELS = ['', 'Fácil', 'Leve', 'Médio', 'Difícil', 'Crítico']

export function SubjectManager({ initialSubjects, initialWeeklyGoal, userId }: SubjectManagerProps) {
  const [subjects, setSubjects]     = useState<Subject[]>(initialSubjects)
  const [weeklyGoal, setWeeklyGoal] = useState(initialWeeklyGoal)
  const [newName, setNewName]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [generatorOpen, setGeneratorOpen] = useState(false)

  const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0)
  const allocations = subjects.map((s) => ({
    ...s,
    allocated_hours: totalWeight > 0
      ? parseFloat(((s.weight / totalWeight) * weeklyGoal).toFixed(1))
      : 0,
  }))

  async function addSubject() {
    if (!newName.trim()) return
    setError(null)
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]

    try {
      const supabase = createClient()
      const { data, error: dbError } = await (supabase as any)
        .from('subjects')
        .insert({ user_id: userId, name: newName.trim(), weight: 3, color })
        .select()
        .single()
      if (dbError) throw dbError
      if (data) {
        setSubjects((prev) => [...prev, data])
        setNewName('')
      }
    } catch (err: unknown) {
      const pg = err as { message?: string; code?: string; details?: string }
      console.error('[Calculator] Erro ao adicionar matéria — message:', pg.message, '| code:', pg.code, '| details:', pg.details, '| raw:', err)
      setError(`Não foi possível adicionar a matéria. ${pg.message ?? 'Tente novamente.'}`)
    }
  }

  async function updateWeight(id: string, weight: number) {
    const previous = subjects.find((s) => s.id === id)?.weight ?? 3
    setSubjects((prev) => prev.map((s) => s.id === id ? { ...s, weight } : s))
    setError(null)

    try {
      const supabase = createClient()
      const { error: dbError } = await (supabase as any)
        .from('subjects').update({ weight }).eq('id', id)
      if (dbError) throw dbError
    } catch (err: unknown) {
      const pg = err as { message?: string; code?: string }
      console.error('[Calculator] Erro ao atualizar peso — message:', pg.message, '| code:', pg.code, '| raw:', err)
      setSubjects((prev) => prev.map((s) => s.id === id ? { ...s, weight: previous } : s))
      setError(`Não foi possível atualizar o peso. ${pg.message ?? 'Tente novamente.'}`)
    }
  }

  async function removeSubject(id: string) {
    const snapshot = subjects
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setError(null)

    try {
      const supabase = createClient()
      const { error: dbError } = await (supabase as any)
        .from('subjects').delete().eq('id', id)
      if (dbError) throw dbError
    } catch (err: unknown) {
      const pg = err as { message?: string; code?: string }
      console.error('[Calculator] Erro ao remover matéria — message:', pg.message, '| code:', pg.code, '| raw:', err)
      setSubjects(snapshot)
      setError(`Não foi possível remover a matéria. ${pg.message ?? 'Tente novamente.'}`)
    }
  }

  async function saveAllocations() {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const results = await Promise.all([
        ...allocations.map((s) =>
          (supabase as any).from('subjects').update({ allocated_hours: s.allocated_hours }).eq('id', s.id)
        ),
        (supabase as any).from('profiles').update({ weekly_goal_hours: weeklyGoal }).eq('id', userId),
      ])

      const firstError = results.find((r) => r.error)?.error
      if (firstError) throw firstError

      setSubjects(allocations)
    } catch (err: unknown) {
      const pg = err as { message?: string; code?: string }
      console.error('[Calculator] Erro ao salvar planejamento — message:', pg.message, '| code:', pg.code, '| raw:', err)
      setError(`Não foi possível salvar o planejamento. ${pg.message ?? 'Tente novamente.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Weekly goal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Disponibilidade Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={1}
              max={168}
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(Number(e.target.value))}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">horas por semana disponíveis</span>
          </div>
        </CardContent>
      </Card>

      {/* Add subject */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da matéria (ex: Anatomia, Cálculo…)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              className="flex-1"
            />
            <Button onClick={addSubject} disabled={!newName.trim()} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error banner */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Subjects list */}
      {allocations.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-3">
            {allocations.map((s) => {
              const percent = weeklyGoal > 0 ? (s.allocated_hours / weeklyGoal) * 100 : 0
              return (
                <Card key={s.id}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 h-3 w-3 rounded-full shrink-0 bg-[#1E3A5F] dark:bg-[#4A72A8]" />

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium truncate">{s.name}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-foreground">
                              {formatHours(s.allocated_hours)}
                            </span>
                            <span className="text-xs text-muted-foreground">/ semana</span>
                            <button
                              onClick={() => removeSubject(s.id)}
                              className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <Progress value={percent} className="h-1.5" />

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24">Peso/Dificuldade</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((w) => (
                              <button
                                key={w}
                                onClick={() => updateWeight(s.id, w)}
                                title={WEIGHT_LABELS[w]}
                                className={cn(
                                  'h-7 w-7 rounded text-xs font-medium transition-all',
                                  s.weight === w
                                    ? 'text-white shadow-sm'
                                    : 'bg-[#EAE8DF] dark:bg-[#2C2C27] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF]'
                                )}
                                style={s.weight === w ? { background: SUBJECT_COLOR } : {}}
                              >
                                {w}
                              </button>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {WEIGHT_LABELS[s.weight]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Total alocado:{' '}
              <span className="font-semibold text-foreground">{formatHours(weeklyGoal)}</span>
              {' '}em {subjects.length} {subjects.length === 1 ? 'matéria' : 'matérias'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setGeneratorOpen(true)}
                disabled={allocations.every((s) => s.allocated_hours === 0)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Montar Semana
              </Button>
              <Button onClick={saveAllocations} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">Adicione sua primeira matéria acima</p>
        </div>
      )}

      <ScheduleGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        subjects={allocations}
        userId={userId}
      />
    </div>
  )
}
