'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { useTimerStore } from '@/store/timerStore'
import { formatSeconds } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import type { Subject } from '@/types'
import { cn } from '@/lib/utils'

interface TimerDisplayProps {
  subjects: Subject[]
  userId: string  // CORRIGIDO: necessário para o INSERT em study_sessions
}

export function TimerDisplay({ subjects, userId }: TimerDisplayProps) {
  const {
    isRunning, mode, pomodoroLength, getElapsed,
    subjectId, start, pause, stop, setMode, setPomodoroLength,
  } = useTimerStore()

  const [, forceUpdate] = useState(0)
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Ref para evitar múltiplos auto-stops no Pomodoro
  const isStoppingRef = useRef(false)

  // Tick de 1 segundo enquanto timer corre
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // CORRIGIDO: handleStop declarado antes do useEffect que o usa
  const handleStop = useCallback(async () => {
    // Captura tudo ANTES de chamar stop() que zera o store
    const finalElapsed    = getElapsed()
    const currentSubjectId = useTimerStore.getState().subjectId
    const currentMode      = useTimerStore.getState().mode

    stop()
    isStoppingRef.current = false

    if (finalElapsed < 5) return  // Sessão muito curta, não salva

    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createClient()
      const { error } = await (supabase as any).from('study_sessions').insert({
        user_id: userId,
        subject_id: currentSubjectId,
        duration_seconds: finalElapsed,
        mode: currentMode,
      })
      if (error) throw error
    } catch (err) {
      console.error('[Timer] Erro ao salvar sessão:', err)
      setSaveError('Não foi possível salvar a sessão.')
    } finally {
      setSaving(false)
    }
  }, [getElapsed, stop, userId])

  // Auto-stop do Pomodoro quando countdown chega a 0
  const elapsed = getElapsed()
  useEffect(() => {
    if (isRunning && mode === 'pomodoro' && elapsed >= pomodoroLength && !isStoppingRef.current) {
      isStoppingRef.current = true
      handleStop()
    }
  }, [elapsed, isRunning, mode, pomodoroLength, handleStop])

  const handleStart = () => {
    const subject = subjects.find((s) => s.id === selectedSubjectId)
    if (!subject) return
    setSaveError(null)
    start(subject.id, subject.name, subject.color)
  }

  const displaySeconds = mode === 'pomodoro'
    ? Math.max(0, pomodoroLength - elapsed)
    : elapsed

  const progressPercent = mode === 'pomodoro'
    ? Math.min((elapsed / pomodoroLength) * 100, 100)
    : null

  const radius       = 120
  const circumference = 2 * Math.PI * radius
  const dashOffset    = progressPercent !== null
    ? circumference * (1 - progressPercent / 100)
    : 0

  const activeSubject = subjects.find((s) => s.id === (subjectId ?? selectedSubjectId))

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">

      {/* Modo Stopwatch / Pomodoro */}
      <Tabs
        value={mode}
        onValueChange={(v) => { if (!isRunning) setMode(v as 'stopwatch' | 'pomodoro') }}
      >
        <TabsList className="bg-[#EAE8DF] dark:bg-[#2C2C27]">
          <TabsTrigger
            value="stopwatch"
            disabled={isRunning}
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#181816] data-[state=active]:text-black dark:data-[state=active]:text-[#F4F3EF]"
          >
            Stopwatch
          </TabsTrigger>
          <TabsTrigger
            value="pomodoro"
            disabled={isRunning}
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#181816] data-[state=active]:text-black dark:data-[state=active]:text-[#F4F3EF]"
          >
            Pomodoro
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Seletor de duração do Pomodoro */}
      {mode === 'pomodoro' && !isRunning && (
        <div className="flex gap-2 flex-wrap justify-center">
          {[15, 25, 30, 45, 60].map((min) => (
            <button
              key={min}
              onClick={() => setPomodoroLength(min)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                pomodoroLength === min * 60
                  ? 'bg-black dark:bg-[#F4F3EF] text-white dark:text-black shadow-sm'
                  : 'bg-[#EAE8DF] dark:bg-[#2C2C27] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF]'
              )}
            >
              {min}min
            </button>
          ))}
        </div>
      )}

      {/* Seletor de matéria */}
      {!isRunning && (
        <div className="w-full">
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-full rounded-xl border-zinc-200/60 dark:border-zinc-700/60 bg-[#F4F3EF] dark:bg-[#181816] text-black dark:text-[#F4F3EF]">
              <SelectValue placeholder="Selecione uma matéria para iniciar…" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subjects.length === 0 && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 text-center">
              Cadastre matérias no módulo Planejamento primeiro
            </p>
          )}
        </div>
      )}

      {/* Círculo do timer */}
      <div className="relative flex items-center justify-center">
        <svg width="280" height="280" className="-rotate-90">
          {/* Trilha */}
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="6"
          />
          {/* Progresso Pomodoro */}
          {mode === 'pomodoro' && (
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke="#1E3A5F"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
          )}
        </svg>

        <div className="absolute flex flex-col items-center gap-2">
          {activeSubject && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] dark:bg-[#4A72A8]/20 dark:text-[#4A72A8]">
              {activeSubject.name}
            </span>
          )}
          <span className="text-5xl font-bold tabular-nums tracking-tighter text-black dark:text-[#F4F3EF]">
            {formatSeconds(displaySeconds)}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {isRunning
              ? mode === 'pomodoro' ? 'Pomodoro ativo' : 'Cronômetro ativo'
              : elapsed > 0 ? 'Pausado' : 'Pronto para começar'
            }
          </span>
        </div>
      </div>

      {/* Botões de controle */}
      <div className="flex items-center gap-3">
        {!isRunning ? (
          <>
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!selectedSubjectId || subjects.length === 0}
              className="gap-2 px-8"
            >
              <Play className="h-5 w-5" />
              {elapsed > 0 ? 'Retomar' : 'Iniciar'}
            </Button>
            {elapsed > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => { stop(); setSaveError(null) }}
                title="Resetar"
                className="h-11 w-11"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" size="lg" onClick={pause} className="gap-2 px-6">
              <Pause className="h-5 w-5" />
              Pausar
            </Button>
            <Button
              size="lg"
              onClick={handleStop}
              disabled={saving}
              className="gap-2 px-6 bg-zinc-900 hover:bg-black dark:bg-[#F4F3EF] dark:hover:bg-[#E8E7E3] text-white dark:text-black"
            >
              <Square className="h-5 w-5" />
              {saving ? 'Salvando…' : 'Finalizar'}
            </Button>
          </>
        )}
      </div>

      {/* Feedback de status */}
      {saving && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 animate-pulse">Salvando sessão…</p>
      )}
      {saveError && (
        <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2">
          {saveError}
        </p>
      )}

    </div>
  )
}
