export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          course: string | null
          semester: string | null
          avatar_url: string | null
          weekly_goal_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          course?: string | null
          semester?: string | null
          avatar_url?: string | null
          weekly_goal_hours?: number
        }
        Update: {
          id?: string
          full_name?: string | null
          course?: string | null
          semester?: string | null
          avatar_url?: string | null
          weekly_goal_hours?: number
        }
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          weight: number
          color: string
          allocated_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          weight?: number
          color: string
          allocated_hours?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          weight?: number
          color?: string
          allocated_hours?: number
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          duration_seconds: number
          mode: 'pomodoro' | 'stopwatch'
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          duration_seconds: number
          mode: 'pomodoro' | 'stopwatch'
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          duration_seconds?: number
          mode?: 'pomodoro' | 'stopwatch'
          completed_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          type: 'study' | 'exam' | 'assignment' | 'other'
          all_day: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          type: 'study' | 'exam' | 'assignment' | 'other'
          all_day?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          type?: 'study' | 'exam' | 'assignment' | 'other'
          all_day?: boolean
        }
      }
      note_folders: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          parent_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          parent_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          parent_id?: string | null
          name?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          folder_id: string | null
          title: string
          content: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          folder_id?: string | null
          title: string
          content?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          folder_id?: string | null
          title?: string
          content?: Json
        }
      }
      glossary: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          term: string
          definition: string
          language: string
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          term: string
          definition: string
          language?: string
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          term?: string
          definition?: string
          language?: string
          tags?: string[]
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
