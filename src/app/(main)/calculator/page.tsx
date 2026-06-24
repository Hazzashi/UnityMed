import { createClient } from '@/lib/supabase/server'
import { SubjectManager } from '@/components/calculator/SubjectManager'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export const dynamic = 'force-dynamic'

export default async function CalculatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const subjectsRes = await supabase.from('subjects').select('*').eq('user_id', user.id).order('name')

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planejamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre suas matérias, defina o peso e distribua suas horas semanais automaticamente.
        </p>
      </div>
      <SubjectManager
        initialSubjects={subjectsRes.data ?? []}
        initialWeeklyGoal={(profileRes.data as ProfileRow | null)?.weekly_goal_hours ?? 20}
        userId={user.id}
      />
    </div>
  )
}
