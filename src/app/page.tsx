import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { APP_IDLE_MINUTES, APP_LAST_ACTIVE_COOKIE, isTimestampExpired } from '@/lib/session-security'
import { cookies } from 'next/headers'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const appLastActive = cookieStore.get(APP_LAST_ACTIVE_COOKIE)?.value

  if (user && !isTimestampExpired(appLastActive, APP_IDLE_MINUTES * 60 * 1000)) {
    redirect('/dashboard')
  }
  redirect('/lp.html')
}
