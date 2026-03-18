import { setReauthCookie } from '@/lib/session-security'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await request.json()
  if (!password) return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 })

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })

  if (error) return NextResponse.json({ error: 'Senha inválida' }, { status: 401 })

  await setReauthCookie('app')
  return NextResponse.json({ ok: true })
}
