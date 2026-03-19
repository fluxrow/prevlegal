import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getResetConvite(adminSupabase: any, token: string) {
  const { data } = await adminSupabase
    .from('convites')
    .select('id, email, role, tenant_id, expires_at, aceito')
    .eq('token', token)
    .eq('role', 'password_reset')
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data
}

export async function GET(request: Request) {
  const adminSupabase = createAdminSupabase()
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 400 })
  }

  const convite = await getResetConvite(adminSupabase, token)
  if (!convite) {
    return NextResponse.json({ error: 'Link invalido ou expirado' }, { status: 404 })
  }

  const email = convite.email.toLowerCase()
  const { data: usuariosPage, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 })
  }

  const usuarioAuth = (usuariosPage.users || []).find((user) => user.email?.toLowerCase() === email)

  if (!usuarioAuth) {
    return NextResponse.json({ error: 'Usuario de autenticacao nao encontrado' }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    email,
  })
}

export async function POST(request: Request) {
  const adminSupabase = createAdminSupabase()
  const { token, senha } = await request.json()

  if (!token || !senha) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  if (String(senha).length < 8) {
    return NextResponse.json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  const convite = await getResetConvite(adminSupabase, token)
  if (!convite) {
    return NextResponse.json({ error: 'Link invalido ou expirado' }, { status: 404 })
  }

  const email = convite.email.toLowerCase()
  const { data: usuariosPage, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 })
  }

  const usuarioAuth = (usuariosPage.users || []).find((user) => user.email?.toLowerCase() === email)
  if (!usuarioAuth) {
    return NextResponse.json({ error: 'Usuario de autenticacao nao encontrado' }, { status: 409 })
  }

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(usuarioAuth.id, {
    password: senha,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { error: markError } = await adminSupabase
    .from('convites')
    .update({ aceito: true })
    .eq('id', convite.id)

  if (markError) {
    return NextResponse.json({ error: markError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
