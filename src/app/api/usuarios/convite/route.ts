import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const EMAIL_EM_USO_MESSAGE =
  'Este email ja possui uma conta cadastrada no PrevLegal. No modelo atual do go-live, cada email fica vinculado a um unico escritorio.'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

  const { data } = await supabase
    .from('convites')
    .select('id, email, role, expires_at, aceito')
    .eq('token', token)
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })

  const { data: usuarioExistente } = await supabase
    .from('usuarios')
    .select('id, auth_id, email')
    .eq('email', data.email.toLowerCase())
    .maybeSingle()

  if (usuarioExistente?.auth_id) {
    return NextResponse.json({
      error: EMAIL_EM_USO_MESSAGE,
      stale: true,
      email: data.email,
    }, { status: 409 })
  }

  return NextResponse.json({ convite: data })
}
