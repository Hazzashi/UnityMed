import { createClient } from '@/lib/supabase/server'
import { GlossaryView } from '@/components/glossary/GlossaryView'
import type { Database } from '@/types/database'

type GlossaryRow = Database['public']['Tables']['glossary']['Row']
type SubjectRow  = Database['public']['Tables']['subjects']['Row']

export const dynamic = 'force-dynamic'

export default async function GlossaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [entriesRes, subjectsRes] = await Promise.all([
    supabase.from('glossary').select('*').eq('user_id', user.id).order('term'),
    supabase.from('subjects').select('id, name, color').eq('user_id', user.id).order('name'),
  ])

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-black dark:text-[#F4F3EF]">Glossário</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Central indexada de termos, conceitos e vocabulário técnico.
        </p>
      </div>
      <GlossaryView
        initialEntries={(entriesRes.data ?? []) as GlossaryRow[]}
        subjects={(subjectsRes.data ?? []) as SubjectRow[]}
        userId={user.id}
      />
    </div>
  )
}
