type SupabaseLike = {
  from: (table: string) => any
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

export async function getConfiguracaoAtual(
  supabase: SupabaseLike,
  tenantId: string | null,
  columns = '*',
) {
  const query = applyTenantFilter(
    supabase.from('configuracoes').select(columns),
    tenantId,
  )

  return query.limit(1).maybeSingle()
}

export async function ensureConfiguracaoAtual(
  supabase: SupabaseLike,
  tenantId: string | null,
  defaults: Record<string, unknown> = {},
) {
  const { data: existing, error } = await getConfiguracaoAtual(supabase, tenantId, 'id')

  if (error) {
    return { data: null, error }
  }

  if (existing) {
    return { data: existing, error: null }
  }

  const payload = {
    nome_escritorio: 'Meu Escritório',
    ...defaults,
    ...(tenantId ? { tenant_id: tenantId } : {}),
  }

  return supabase
    .from('configuracoes')
    .insert(payload)
    .select('id')
    .single()
}
