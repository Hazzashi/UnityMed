import { createClient } from '@/lib/supabase/server'
import { NotesWorkspace } from '@/components/notes/NotesWorkspace'
import type { Database } from '@/types/database'

type NoteFolderRow = Database['public']['Tables']['note_folders']['Row']
type SubjectRow    = Database['public']['Tables']['subjects']['Row']

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [foldersRes, notesRes, subjectsRes] = await Promise.all([
    supabase.from('note_folders').select('*').eq('user_id', user.id).order('name'),
    supabase.from('notes').select('id, title, folder_id, subject_id, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('subjects').select('id, name, color').eq('user_id', user.id).order('name'),
  ])

  return (
    <NotesWorkspace
      initialFolders={(foldersRes.data ?? []) as NoteFolderRow[]}
      initialNotes={notesRes.data ?? []}
      subjects={(subjectsRes.data ?? []) as SubjectRow[]}
      userId={user.id}
    />
  )
}
