import { setSessionActivityCookie } from '@/lib/session-security'
import { touchUsuarioUltimoAcesso } from '@/lib/current-usuario'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await touchUsuarioUltimoAcesso(user)
  } catch (touchError) {
    console.error('Falha ao registrar ultimo acesso da sessao', touchError)
  }

  await setSessionActivityCookie('app')
  return NextResponse.json({ ok: true })
}
