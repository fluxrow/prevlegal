import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
    .select('id, auth_id, email')
    .eq('email', email)

  if (usuariosError) {
    return NextResponse.json({ error: usuariosError.message }, { status: 500 })
  }

  const authIds = new Set(
    (usuariosExistentes || [])
      .map((usuario) => usuario.auth_id)
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

  const { data: convite, error: conviteError } = await adminSupabase
    .from('convites')
    .insert({
      email,
      role: 'admin',
      convidado_por: usuariosExistentes?.[0]?.id || null,
    })
    .select('id, token, email, expires_at')
    .single()

  if (conviteError) {
    return NextResponse.json({ error: conviteError.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prevlegal.vercel.app'
  const url = `${baseUrl}/auth/aceitar-convite?token=${convite.token}`

  return NextResponse.json({
    ok: true,
    email,
    url,
    convite,
    mensagem: `Novo acesso gerado para ${email}`,
  })
}
