import { createClient } from '@/lib/supabase/server'
import { getGreeting, getDayOfWeekLabel } from '@/lib/utils'
import { MetricsCards } from '@/components/dashboard/MetricsCards'
import { StudyBarChart } from '@/components/dashboard/StudyBarChart'
import { StudyAreaChart } from '@/components/dashboard/StudyAreaChart'
import { TodayWidget } from '@/components/dashboard/TodayWidget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SubjectWithStats, WeeklyStats } from '@/types'
import type { Database } from '@/types/database'
import { startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ProfileRow      = Database['public']['Tables']['profiles']['Row']
type SubjectRow      = Database['public']['Tables']['subjects']['Row']
type StudySessionRow = Database['public']['Tables']['study_sessions']['Row']
type EventRow        = Database['public']['Tables']['events']['Row']

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now       = new Date()
  const weekStart = startOfWeek(now, { locale: ptBR })
  const weekEnd   = endOfWeek(now,   { locale: ptBR })
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)

  const [profileRes, subjectsRes, sessionsRes, eventsRes, todayEventsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
    supabase
      .from('study_sessions').select('*').eq('user_id', user.id)
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString()),
    supabase
      .from('events').select('*').eq('user_id', user.id)
      .gte('start_time', now.toISOString())
      .order('start_time').limit(1),
    supabase
      .from('events').select('*').eq('user_id', user.id)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time'),
  ])

  const profile     = profileRes.data as ProfileRow | null
  const subjects    = (subjectsRes.data    ?? []) as SubjectRow[]
  const sessions    = (sessionsRes.data    ?? []) as StudySessionRow[]
  const nextEvent   = ((eventsRes.data     ?? []) as EventRow[])[0] ?? null
  const todayEvents = (todayEventsRes.data ?? []) as EventRow[]

  const studiedBySubject = sessions.reduce<Record<string, number>>((acc, s) => {
    if (s.subject_id) acc[s.subject_id] = (acc[s.subject_id] ?? 0) + s.duration_seconds
    return acc
  }, {})

  const subjectsWithStats: SubjectWithStats[] = subjects.map((s) => ({
    ...s,
    studied_hours:   (studiedBySubject[s.id] ?? 0) / 3600,
    sessions_count:  sessions.filter((ss) => ss.subject_id === s.id).length,
  }))

  const weeklyStudied = sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600
  const weeklyGoal    = profile?.weekly_goal_hours ?? 20

  let streak = 0
  for (let i = 0; i < 30; i++) {
    const day = subDays(now, i)
    const { count } = await supabase
      .from('study_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('completed_at', startOfDay(day).toISOString())
      .lte('completed_at', endOfDay(day).toISOString())
    if ((count ?? 0) > 0) streak++
    else if (i > 0) break
  }

  const weeklyStats: WeeklyStats[] = Array.from({ length: 7 }, (_, i) => {
    const day      = subDays(now, 6 - i)
    const dayStart = startOfDay(day)
    const dayEnd   = endOfDay(day)
    const minutes  = sessions
      .filter((s) => { const d = new Date(s.completed_at); return d >= dayStart && d <= dayEnd })
      .reduce((sum, s) => sum + Math.floor(s.duration_seconds / 60), 0)
    return { dayLabel: getDayOfWeekLabel(day), minutes }
  })

  const greeting      = getGreeting()
  const firstName     = profile?.full_name?.split(' ')[0] ?? 'Estudante'
  const todayFormatted = format(now, "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="p-5 space-y-4 max-w-7xl">

      {/* ── Cabeçalho pessoal ── */}
      <div className="pt-1 pb-2">
        <h1 className="text-2xl font-bold text-black dark:text-[#F4F3EF]">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 capitalize mt-0.5">
          {todayFormatted}
        </p>
        {/* Badges de perfil */}
        {(profile?.course || profile?.semester) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.course && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-white dark:bg-[#181816] border border-zinc-200/40 dark:border-zinc-800/40 text-black dark:text-[#F4F3EF]">
                🎓 {profile.course}
              </span>
            )}
            {profile.semester && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-white dark:bg-[#181816] border border-zinc-200/40 dark:border-zinc-800/40 text-black dark:text-[#F4F3EF]">
                📅 {profile.semester}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Métricas rápidas (3 ilhas) ── */}
      <MetricsCards
        weeklyStudied={weeklyStudied}
        weeklyGoal={weeklyGoal}
        streak={streak}
        nextEvent={nextEvent}
      />

      {/* ── Gráficos (2 ilhas lado a lado) ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Planejado vs. Estudado</CardTitle>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">horas esta semana por matéria</p>
          </CardHeader>
          <CardContent>
            <StudyBarChart subjects={subjectsWithStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Evolução Semanal</CardTitle>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">minutos de foco por dia</p>
          </CardHeader>
          <CardContent>
            <StudyAreaChart data={weeklyStats} />
          </CardContent>
        </Card>
      </div>

      {/* ── Hoje (ilha) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>O que temos para hoje?</CardTitle>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            {todayEvents.length > 0
              ? `${todayEvents.length} bloco${todayEvents.length > 1 ? 's' : ''} agendado${todayEvents.length > 1 ? 's' : ''}`
              : 'Nenhum bloco agendado'}
          </p>
        </CardHeader>
        <CardContent>
          <TodayWidget events={todayEvents} />
        </CardContent>
      </Card>

    </div>
  )
}
