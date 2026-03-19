import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/auth-role'

export interface TenantContext {
  authUserId: string
  usuarioId: string
  tenantId: string | null
  email: string
  role: Role
  isAdmin: boolean
}

export async function getTenantContext(existingSupabase?: Awaited<ReturnType<typeof createClient>>) {
  const supabase = existingSupabase ?? await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, tenant_id, email, role, ativo')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (usuarioError || !usuario || !usuario.ativo) return null

  return {
    authUserId: user.id,
    usuarioId: usuario.id,
    tenantId: usuario.tenant_id || null,
    email: (user.email || usuario.email || '').toLowerCase(),
    role: usuario.role as Role,
    isAdmin: usuario.role === 'admin',
  } satisfies TenantContext
}

export async function getAccessibleLeadIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TenantContext,
) {
  if (context.isAdmin) return null

  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('responsavel_id', context.usuarioId)

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
  if (context.isAdmin) return true

  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('responsavel_id', context.usuarioId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}
