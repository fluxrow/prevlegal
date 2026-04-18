import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sanitizeInvitePermissions } from '@/lib/permissions'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function gerarEmailProvisionamento() {
  return `invite+${crypto.randomUUID()}@prevlegal.local`
}

const EMAIL_EM_USO_MESSAGE =
  'Este email ja possui uma conta cadastrada no PrevLegal. No modelo atual do go-live, cada email fica vinculado a um unico escritorio. Use outro email para este escritorio ou conclua a migracao desse acesso antes de aceitar o convite.'

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
  if (!convite.tenant_id) return NextResponse.json({ error: 'Convite sem tenant configurado' }, { status: 409 })

  const email = convite.email.toLowerCase()
  const convitePermissions = sanitizeInvitePermissions(convite.permissions)

  const { data: authUsersPage, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 })
  }

  const authUserExistente = (authUsersPage?.users || []).find(
    (authUser) => authUser.email?.trim().toLowerCase() === email,
  )

  if (authUserExistente) {
    return NextResponse.json({ error: EMAIL_EM_USO_MESSAGE, code: 'email_already_registered' }, { status: 409 })
  }

  const { data: usuarioPorEmail } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single()

  const precisaReaproveitarUsuario = Boolean(usuarioPorEmail)
  const emailProvisionamento = precisaReaproveitarUsuario ? gerarEmailProvisionamento() : email

  // Cria usuário no Supabase Auth
  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: emailProvisionamento,
    password: senha,
    email_confirm: true,
    user_metadata: {
      full_name: nome,
    },
  })

  if (authError) {
    const normalizedAuthError = authError.message?.toLowerCase() || ''
    if (normalizedAuthError.includes('already been registered') || normalizedAuthError.includes('already registered')) {
      return NextResponse.json({ error: EMAIL_EM_USO_MESSAGE, code: 'email_already_registered' }, { status: 409 })
    }

    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  if (precisaReaproveitarUsuario) {
    const { error: cleanupAutoUserError } = await adminSupabase
      .from('usuarios')
      .delete()
      .eq('auth_id', authUser.user.id)

    if (cleanupAutoUserError) {
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: cleanupAutoUserError.message }, { status: 500 })
    }

    const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(authUser.user.id, {
      email,
      email_confirm: true,
      user_metadata: {
        full_name: nome,
      },
    })

    if (authUpdateError) {
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: authUpdateError.message }, { status: 500 })
    }
  }

  // Cria registro em usuarios
  const payload = {
    tenant_id: convite.tenant_id,
    auth_id: authUser.user.id,
    email,
    nome,
    role: convite.role,
    ativo: true,
    convidado_por: convite.convidado_por,
    convidado_em: new Date().toISOString(),
    ...(convitePermissions ? { permissions: convitePermissions } : {}),
  }

  const { data: usuarioCriadoNoTrigger } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', authUser.user.id)
    .maybeSingle()

  const { error: userError } = usuarioPorEmail
    ? await adminSupabase
        .from('usuarios')
        .update(payload)
        .eq('id', usuarioPorEmail.id)
    : usuarioCriadoNoTrigger
      ? await adminSupabase
          .from('usuarios')
          .update(payload)
          .eq('id', usuarioCriadoNoTrigger.id)
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
