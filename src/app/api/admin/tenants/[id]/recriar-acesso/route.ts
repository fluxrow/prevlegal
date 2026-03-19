import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function gerarSenhaTemporaria() {
  return `Tmp#${crypto.randomUUID()}Aa1`
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await verificarAdminReauthRecente()) {
    return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })
  }

  const { id } = await params
  const adminSupabase = createAdminSupabase()

  const { data: tenant, error: tenantError } = await adminSupabase
    .from('tenants')
    .select('nome, responsavel_nome, responsavel_email')
    .eq('id', id)
    .single()

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 })
  }

  const email = tenant?.responsavel_email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email do responsavel nao encontrado para este tenant' }, { status: 404 })
  }

  const { data: usuariosExistentes, error: usuariosError } = await adminSupabase
    .from('usuarios')
    .select('id, auth_id, email, nome, role, ativo, convidado_por')
    .eq('email', email)

  if (usuariosError) {
    return NextResponse.json({ error: usuariosError.message }, { status: 500 })
  }

  const { data: adminsExistentes, error: adminsError } = await adminSupabase
    .from('usuarios')
    .select('id, auth_id, email, nome, role, ativo, convidado_por')
    .eq('role', 'admin')
    .order('convidado_em', { ascending: true })

  if (adminsError) {
    return NextResponse.json({ error: adminsError.message }, { status: 500 })
  }

  const usuarioResponsavel =
    usuariosExistentes?.[0] ||
    ((adminsExistentes || []).length === 1 ? adminsExistentes?.[0] : null)

  const authIds = new Set(
    [usuarioResponsavel?.auth_id, ...(usuariosExistentes || []).map((usuario) => usuario.auth_id)]
      .filter(Boolean)
  )

  const { data: authUsersPage, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 })
  }

  const authUsers = authUsersPage?.users || []
  const authUsersParaRemover = authUsers.filter(
    (user) => user.email?.toLowerCase() === email || authIds.has(user.id)
  )

  for (const authUser of authUsersParaRemover) {
    const { error } = await adminSupabase.auth.admin.deleteUser(authUser.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { error: convitesDeleteError } = await adminSupabase
    .from('convites')
    .delete()
    .eq('email', email)
    .eq('aceito', false)

  if (convitesDeleteError) {
    return NextResponse.json({ error: convitesDeleteError.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prevlegal.vercel.app'
  const senhaTemporaria = gerarSenhaTemporaria()

  const { data: authUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
    user_metadata: {
      full_name: tenant?.responsavel_nome || tenant?.nome || email,
    },
  })

  if (createAuthError || !authUser.user) {
    return NextResponse.json({ error: createAuthError?.message || 'Nao foi possivel provisionar o usuario auth' }, { status: 500 })
  }

  const payload = {
    auth_id: authUser.user.id,
    email,
    nome: tenant?.responsavel_nome || usuarioResponsavel?.nome || tenant?.nome || email,
    role: 'admin',
    ativo: true,
    convidado_por: usuarioResponsavel?.convidado_por || null,
    convidado_em: new Date().toISOString(),
  }

  const { error: usuarioSyncError } = usuarioResponsavel
    ? await adminSupabase.from('usuarios').update(payload).eq('id', usuarioResponsavel.id)
    : await adminSupabase.from('usuarios').insert(payload)

  if (usuarioSyncError) {
    await adminSupabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: usuarioSyncError.message }, { status: 500 })
  }

  const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/redefinir-senha`,
  })

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    email,
    mensagem: `Conta provisionada e email de definicao de senha enviado para ${email}`,
  })
}
