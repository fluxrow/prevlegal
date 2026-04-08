import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUsuarioLogado, hasPermission } from '@/lib/auth-role'
import { isMissingPermissionsColumnError, isMissingUsuarioOptionalColumnError } from '@/lib/permissions'

const USUARIOS_SELECT_VARIANTS = [
  'id, nome, email, role, permissions, ativo, convidado_em, ultimo_acesso, google_calendar_email, google_calendar_connected_at',
  'id, nome, email, role, permissions, ativo, convidado_em, ultimo_acesso',
  'id, nome, email, role, ativo, convidado_em, ultimo_acesso',
] as const

async function listUsuariosWithSchemaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
) {
  let lastResult: { data: Record<string, unknown>[] | null; error: { message: string } | null } | null = null

  for (const selectClause of USUARIOS_SELECT_VARIANTS) {
    const result = await supabase
      .from('usuarios')
      .select(selectClause)
      .eq('tenant_id', tenantId)
      .order('convidado_em', { ascending: true })

    if (!result.error) return result
    lastResult = result

    if (!isMissingUsuarioOptionalColumnError(result.error)) {
      return result
    }
  }

  return lastResult!
}

export async function GET() {
  const supabase = await createClient()
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const { data: usuarios, error: usuariosError } = await listUsuariosWithSchemaFallback(supabase, usuario.tenant_id)
  if (usuariosError) return NextResponse.json({ error: usuariosError.message }, { status: 500 })
  const usuariosList = (usuarios || []) as Array<Record<string, unknown>>

  const { data: convites } = await supabase
    .from('convites')
    .select('id, email, role, aceito, expires_at, created_at')
    .eq('tenant_id', usuario.tenant_id)
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({
    usuarios: usuariosList.map((item) => ({
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
