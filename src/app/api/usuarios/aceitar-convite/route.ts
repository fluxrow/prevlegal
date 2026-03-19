import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const adminSupabase = createAdminSupabase()
  const { token, nome, senha } = await request.json()
  if (!token || !nome || !senha) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  // Busca convite válido
  const { data: convite } = await adminSupabase
    .from('convites')
    .select('*')
    .eq('token', token)
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!convite) return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })

  const email = convite.email.toLowerCase()

  const { data: usuarioPorEmail } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single()

  // Cria usuário no Supabase Auth
  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Cria registro em usuarios
  const payload = {
    auth_id: authUser.user.id,
    email,
    nome,
    role: convite.role,
    ativo: true,
    convidado_por: convite.convidado_por,
    convidado_em: new Date().toISOString(),
  }

  const { error: userError } = usuarioPorEmail
    ? await adminSupabase
        .from('usuarios')
        .update(payload)
        .eq('id', usuarioPorEmail.id)
    : await adminSupabase
        .from('usuarios')
        .insert(payload)

  if (userError) {
    // Rollback auth user
    await adminSupabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  // Marca convite como aceito
  await adminSupabase.from('convites').update({ aceito: true }).eq('id', convite.id)

  return NextResponse.json({ ok: true })
}
