import { createClient } from '@supabase/supabase-js'

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getOrCreateLeadThread(
  supabase: ReturnType<typeof createAdminSupabase>,
  {
    tenantId,
    leadId,
    usuarioId,
    currentOwnerUsuarioId,
  }: {
    tenantId: string
    leadId: string
    usuarioId: string
    currentOwnerUsuarioId?: string | null
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from('lead_threads_internas')
    .select('id, tenant_id, lead_id, created_by, current_owner_usuario_id, status, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('lead_threads_internas')
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      created_by: usuarioId,
      current_owner_usuario_id: currentOwnerUsuarioId ?? usuarioId,
      status: 'ativa',
    })
    .select('id, tenant_id, lead_id, created_by, current_owner_usuario_id, status, created_at, updated_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao criar thread interna')
  }

  return data
}

export async function getTenantUsuariosMap(
  supabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string,
  ids: Array<string | null | undefined>,
) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[]
  if (uniqueIds.length === 0) return new Map<string, { id: string; nome: string | null; email: string | null }>()

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email')
    .eq('tenant_id', tenantId)
    .in('id', uniqueIds)

  if (error) {
    throw new Error(error.message)
  }

  return new Map((data || []).map((usuario) => [usuario.id, usuario]))
}

export async function getTenantUsuarioById(
  supabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string,
  usuarioId: string,
) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo')
    .eq('tenant_id', tenantId)
    .eq('id', usuarioId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
