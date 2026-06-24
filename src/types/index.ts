import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type StudySession = Database['public']['Tables']['study_sessions']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type NoteFolder = Database['public']['Tables']['note_folders']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type GlossaryEntry = Database['public']['Tables']['glossary']['Row']

export type TimerMode = 'stopwatch' | 'pomodoro'

export interface SubjectWithStats extends Subject {
  studied_hours: number
  sessions_count: number
}

export interface WeeklyStats {
  dayLabel: string
  minutes: number
}
