import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUsuarioLogado, hasPermission } from '@/lib/auth-role'
import { isMissingPermissionsColumnError } from '@/lib/permissions'

export async function GET() {
  const supabase = await createClient()
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const usuariosQueryComPermissions = await supabase
    .from('usuarios')
    .select('id, nome, email, role, permissions, ativo, convidado_em, ultimo_acesso, google_calendar_email, google_calendar_connected_at')
    .eq('tenant_id', usuario.tenant_id)
    .order('convidado_em', { ascending: true })

  const usuariosQuery = isMissingPermissionsColumnError(usuariosQueryComPermissions.error)
    ? await supabase
      .from('usuarios')
      .select('id, nome, email, role, ativo, convidado_em, ultimo_acesso, google_calendar_email, google_calendar_connected_at')
      .eq('tenant_id', usuario.tenant_id)
      .order('convidado_em', { ascending: true })
    : usuariosQueryComPermissions

  const { data: usuarios, error: usuariosError } = usuariosQuery
  if (usuariosError) return NextResponse.json({ error: usuariosError.message }, { status: 500 })

  const { data: convites } = await supabase
    .from('convites')
    .select('id, email, role, aceito, expires_at, created_at')
    .eq('tenant_id', usuario.tenant_id)
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({
    usuarios: (usuarios || []).map((item) => ({
      ...item,
      permissions: 'permissions' in item ? item.permissions : null,
    })),
    convites: convites || [],
    role: usuario.role,
  })
}

export async function PATCH(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario || !hasPermission(usuario, 'usuarios_manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const supabase = await createClient()
  const { id, role, ativo, permissions } = await request.json()

  if (id === usuario.id) return NextResponse.json({ error: 'Não é possível alterar seu próprio perfil aqui' }, { status: 400 })

  let result = await supabase
    .from('usuarios')
    .update({ role, ativo, permissions })
    .eq('id', id)
    .eq('tenant_id', usuario.tenant_id)
    .select()
    .single()

  if (isMissingPermissionsColumnError(result.error)) {
    result = await supabase
      .from('usuarios')
      .update({ role, ativo })
      .eq('id', id)
      .eq('tenant_id', usuario.tenant_id)
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({
    usuario: {
      ...result.data,
      permissions: result.data && 'permissions' in result.data ? result.data.permissions : null,
    },
  })
}
