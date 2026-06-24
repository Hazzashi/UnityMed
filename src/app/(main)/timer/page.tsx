import { createClient } from '@/lib/supabase/server'
import { TimerDisplay } from '@/components/timer/TimerDisplay'

export const dynamic = 'force-dynamic'

export default async function TimerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return (
    <div className="flex min-h-[calc(100vh-24px)] items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-[#F4F3EF]">Foco</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            Escolha uma matéria e inicie sua sessão de estudo
          </p>
        </div>
        {/* userId passado corretamente para o INSERT de study_sessions */}
        <TimerDisplay subjects={subjects ?? []} userId={user.id} />
      </div>
    </div>
  )
}
