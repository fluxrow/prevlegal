import { createClient } from '@/lib/supabase/server'
import type { PermissionKey, PermissionMap, Role } from '@/lib/permissions'
import { hasPermission as hasResolvedPermission, isMissingPermissionsColumnError } from '@/lib/permissions'

export interface TenantContext {
  authUserId: string
  usuarioId: string
  tenantId: string | null
  email: string
  role: Role
  permissions?: Partial<PermissionMap> | null
  isAdmin: boolean
}

export async function getTenantContext(existingSupabase?: Awaited<ReturnType<typeof createClient>>) {
  const supabase = existingSupabase ?? await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return null

  let usuarioQuery = await supabase
    .from('usuarios')
    .select('id, tenant_id, email, role, permissions, ativo')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (isMissingPermissionsColumnError(usuarioQuery.error)) {
    usuarioQuery = await supabase
      .from('usuarios')
      .select('id, tenant_id, email, role, ativo')
      .eq('auth_id', user.id)
      .maybeSingle()
  }

  const { data: usuario, error: usuarioError } = usuarioQuery

  if (usuarioError || !usuario || !usuario.ativo) return null

  return {
    authUserId: user.id,
    usuarioId: usuario.id,
    tenantId: usuario.tenant_id || null,
    email: (user.email || usuario.email || '').toLowerCase(),
    role: usuario.role as Role,
    permissions: ('permissions' in usuario ? (usuario.permissions || null) : null) as Partial<PermissionMap> | null,
    isAdmin: usuario.role === 'admin',
  } satisfies TenantContext
}

export function contextHasPermission(
  context: TenantContext,
  permission: PermissionKey,
) {
  return hasResolvedPermission(context, permission)
}

export async function getAccessibleLeadIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TenantContext,
) {
  if (!context.tenantId) return []

  let query = supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((lead) => lead.id)
}

export async function canAccessLeadId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TenantContext,
  leadId: string,
) {
  if (!context.tenantId) return false

  let query = supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}
