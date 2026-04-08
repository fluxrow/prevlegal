import { NextResponse } from 'next/server'
import { setSessionActivityCookie } from '@/lib/session-security'
import { touchUsuarioUltimoAcesso } from '@/lib/current-usuario'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  if (data.user) {
    try {
      await touchUsuarioUltimoAcesso(data.user)
    } catch (touchError) {
      console.error('Falha ao registrar ultimo acesso no login', touchError)
    }
  }

  await setSessionActivityCookie('app')
  return NextResponse.json({ ok: true })
}
