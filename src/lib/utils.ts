import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`
  return `${hours.toFixed(1)}h`
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function getDayOfWeekLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' })
    .replace('.', '')
    .toUpperCase()
}

// Cor única de todas as matérias — navy corporativo
export const SUBJECT_COLOR = '#1E3A5F'
export const SUBJECT_COLORS = Array(10).fill(SUBJECT_COLOR)
