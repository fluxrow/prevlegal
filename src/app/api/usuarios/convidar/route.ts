import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getUsuarioLogado, hasPermission } from '@/lib/auth-role'
import { isMissingPermissionsColumnError, sanitizeInvitePermissions } from '@/lib/permissions'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const EMAIL_EM_USO_MESSAGE =
  'Este email ja possui uma conta cadastrada no PrevLegal. No modelo atual do go-live, cada email fica vinculado a um unico escritorio. Convide outro email para este escritorio ou trate a migracao desse acesso antes de seguir.'

export async function POST(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario || !hasPermission(usuario, 'usuarios_manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const supabase = await createClient()
  const adminSupabase = createAdminSupabase()
  const { email, role, permissions } = await request.json()

  if (!email || !role) return NextResponse.json({ error: 'Email e role são obrigatórios' }, { status: 400 })

  const normalizedEmail = String(email).trim().toLowerCase()
  const sanitizedPermissions = sanitizeInvitePermissions(permissions)

  // Verifica se já existe usuário com esse email
  const { data: existente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1)
    .single()

  if (existente) return NextResponse.json({ error: EMAIL_EM_USO_MESSAGE }, { status: 409 })

  const { data: authUsersPage, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authUsersError) return NextResponse.json({ error: authUsersError.message }, { status: 500 })

  const authUserExistente = (authUsersPage?.users || []).some(
    (authUser) => authUser.email?.trim().toLowerCase() === normalizedEmail,
  )

  if (authUserExistente) return NextResponse.json({ error: EMAIL_EM_USO_MESSAGE }, { status: 409 })

  const invitePayload = {
    email: normalizedEmail,
    role,
    convidado_por: usuario.id,
    tenant_id: usuario.tenant_id,
    ...(sanitizedPermissions ? { permissions: sanitizedPermissions } : {}),
  }

  const { data, error } = await supabase
    .from('convites')
    .insert(invitePayload)
    .select()
    .single()

  if (error && sanitizedPermissions && isMissingPermissionsColumnError(error)) {
    return NextResponse.json(
      { error: 'O banco ainda não suporta permissões customizadas em convites. Aplique a migration antes de usar esse recurso.' },
      { status: 409 },
    )
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'
  const urlConvite = `${baseUrl}/auth/aceitar-convite?token=${data.token}`

  return NextResponse.json({ convite: data, url: urlConvite })
}

export async function DELETE(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario || !hasPermission(usuario, 'usuarios_manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const supabase = await createClient()
  const { id } = await request.json()
  await supabase.from('convites').delete().eq('id', id).eq('tenant_id', usuario.tenant_id)
  return NextResponse.json({ ok: true })
}
