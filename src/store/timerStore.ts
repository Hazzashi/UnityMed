import { create } from 'zustand'
import type { TimerMode } from '@/types'

interface TimerStore {
  isRunning: boolean
  mode: TimerMode
  pomodoroLength: number  // segundos (padrão 25min)
  startedAt: number | null  // Date.now() quando iniciou
  pausedElapsed: number   // segundos acumulados em pausas anteriores
  subjectId: string | null
  subjectName: string | null
  subjectColor: string | null

  // Computed
  getElapsed: () => number

  // Actions
  start: (subjectId: string, subjectName: string, subjectColor: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  setMode: (mode: TimerMode) => void
  setPomodoroLength: (minutes: number) => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  mode: 'stopwatch',
  pomodoroLength: 25 * 60,
  startedAt: null,
  pausedElapsed: 0,
  subjectId: null,
  subjectName: null,
  subjectColor: null,

  getElapsed: () => {
    const { isRunning, startedAt, pausedElapsed } = get()
    if (!isRunning || startedAt === null) return pausedElapsed
    return pausedElapsed + Math.floor((Date.now() - startedAt) / 1000)
  },

  start: (subjectId, subjectName, subjectColor) =>
    set({
      isRunning: true,
      startedAt: Date.now(),
      pausedElapsed: 0,
      subjectId,
      subjectName,
      subjectColor,
    }),

  pause: () =>
    set((state) => ({
      isRunning: false,
      pausedElapsed: state.pausedElapsed + (
        state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0
      ),
      startedAt: null,
    })),

  resume: () =>
    set({ isRunning: true, startedAt: Date.now() }),

  stop: () =>
    set({
      isRunning: false,
      startedAt: null,
      pausedElapsed: 0,
      subjectId: null,
      subjectName: null,
      subjectColor: null,
    }),

  setMode: (mode) => set({ mode }),
  setPomodoroLength: (minutes) => set({ pomodoroLength: minutes * 60 }),
}))
