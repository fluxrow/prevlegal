import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.getAll().some(cookie =>
    cookie.name.includes('supabase') || cookie.name.includes('sb-')
  )

  if (hasSession) redirect('/dashboard')
  redirect('/lp.html')
}
