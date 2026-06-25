import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { AppShell } from '@/components/layout/AppShell'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, course, semester')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<ProfileRow, 'full_name' | 'course' | 'semester'> | null

  return (
    <AppShell>
      <Sidebar
        userName={profile?.full_name}
        userCourse={profile?.course}
        userSemester={profile?.semester}
      />
      <ContentWrapper>{children}</ContentWrapper>
    </AppShell>
  )
}
