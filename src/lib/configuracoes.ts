type QueryError = {
  message?: string
}

type QueryResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T | null
  error: QueryError | null
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns?: string) => TenantScopedQuery
    insert: (payload: Record<string, unknown>) => {
      select: (columns?: string) => {
        single: <T extends Record<string, unknown> = Record<string, unknown>>() => PromiseLike<QueryResult<T>>
      }
    }
  }
}

type TenantScopedQuery = {
  eq: (column: string, value: string | null) => TenantScopedQueryResult
  is: (column: string, value: null) => TenantScopedQueryResult
}

type TenantScopedQueryResult = {
  limit: (count: number) => {
    maybeSingle: <T extends Record<string, unknown> = Record<string, unknown>>() => PromiseLike<QueryResult<T>>
  }
}

function applyTenantFilter(query: TenantScopedQuery, tenantId: string | null): TenantScopedQueryResult {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

export async function getConfiguracaoAtual<T extends Record<string, unknown> = Record<string, unknown>>(
  supabase: SupabaseLike,
  tenantId: string | null,
  columns = '*',
) {
  const query = applyTenantFilter(
    supabase.from('configuracoes').select(columns),
    tenantId,
  )

  return query.limit(1).maybeSingle<T>()
}

export async function ensureConfiguracaoAtual(
  supabase: SupabaseLike,
  tenantId: string | null,
  defaults: Record<string, unknown> = {},
) {
  const { data: existing, error } = await getConfiguracaoAtual<{ id: string }>(supabase, tenantId, 'id')

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
    .single<{ id: string }>()
}
