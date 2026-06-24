import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'
import type { Database } from '@/types/database'

type EventRow   = Database['public']['Tables']['events']['Row']
type SubjectRow = Database['public']['Tables']['subjects']['Row']

export const dynamic = 'force-dynamic'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { semana?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const initialWeekOffset = Math.max(0, parseInt(searchParams.semana ?? '0', 10) || 0)

  // Janela ampla: 2 semanas atrás → 8 semanas à frente
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay() - 14)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeStart.getDate() + 77) // ~11 semanas

  const [eventsRes, subjectsRes] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', rangeStart.toISOString())
      .lte('start_time', rangeEnd.toISOString())
      .order('start_time'),
    supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
  ])

  return (
    <div className="p-5 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-black dark:text-[#F4F3EF]">Agenda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monte seu cronograma semanal com blocos de estudo e compromissos.
        </p>
      </div>
      <CalendarView
        initialEvents={(eventsRes.data ?? []) as EventRow[]}
        subjects={(subjectsRes.data ?? []) as SubjectRow[]}
        userId={user.id}
        initialWeekOffset={initialWeekOffset}
      />
    </div>
  )
}
