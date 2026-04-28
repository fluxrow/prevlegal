const DEFAULT_ALLOWED_EMAILS = [
  'jessica@alexandrini.adv.br',
]

const DEFAULT_ALLOWED_TENANT_IDS = [
  '5d1d30b7-8b64-4f87-9cdb-562d1693e824',
  'dbb8ae41-8d87-4305-80c0-40a8958d9688',
]

type QueryError = {
  message: string
}

type TenantLookupRow = {
  tenant_id: string | null
}

type QueryLike = {
  eq: (column: string, value: string) => QueryLike
  maybeSingle: <T>() => PromiseLike<{ data: T | null; error: QueryError | null }>
  not: (column: string, operator: 'is', value: null) => QueryLike
  limit: (count: number) => PromiseLike<{ data: TenantLookupRow[] | null; error: QueryError | null }>
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => QueryLike
  }
}

type CountQueryLike = {
  from: (table: string) => {
    select: (
      columns: string,
      options?: { count?: 'exact'; head?: boolean },
    ) => PromiseLike<{ count: number | null; error: QueryError | null }>
  }
}

export function getContainmentAllowedEmails() {
  const raw = process.env.TENANT_CONTAINMENT_ALLOWED_EMAILS?.trim()
  if (!raw) return DEFAULT_ALLOWED_EMAILS

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function getContainmentAllowedTenantIds() {
  const raw = process.env.TENANT_CONTAINMENT_ALLOWED_TENANT_IDS?.trim()
  if (!raw) return DEFAULT_ALLOWED_TENANT_IDS

  return raw
    .split(',')
    .map((tenantId) => tenantId.trim())
    .filter(Boolean)
}

export function isAllowedByTenantContainment(email?: string | null, tenantId?: string | null) {
  const normalizedTenantId = typeof tenantId === 'string' ? tenantId.trim() : ''
  if (normalizedTenantId) {
    const allowedTenantIds = getContainmentAllowedTenantIds()
    if (allowedTenantIds.includes(normalizedTenantId)) {
      return true
    }
  }

  if (!email) return true

  const normalizedEmail = email.trim().toLowerCase()
  const allowedEmails = getContainmentAllowedEmails()
  return allowedEmails.includes(normalizedEmail)
}

export function isBlockedByTenantContainment(email?: string | null, tenantId?: string | null) {
  return !isAllowedByTenantContainment(email, tenantId)
}

export async function getAuthenticatedTenantIdForContainment(supabase: SupabaseLike, authUserId: string) {
  const { data: usuarioAtual, error } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('auth_id', authUserId)
    .maybeSingle<TenantLookupRow>()

  if (error) return null
  return usuarioAtual?.tenant_id || null
}

export async function canProvisionOutsideContainment(adminSupabase: CountQueryLike & SupabaseLike, tenantId?: string) {
  const countSupabase = adminSupabase as CountQueryLike
  const scopedSupabase = adminSupabase as SupabaseLike

  const { count, error } = await countSupabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  if (error) return false
  if ((count || 0) === 0) return true
  if (!tenantId) return false

  const { count: tenantCount, error: tenantCountError } = await countSupabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })

  if (tenantCountError || (tenantCount || 0) !== 1) return false

  const { data: usuariosComTenant, error: usuariosError } = await scopedSupabase
    .from('usuarios')
    .select('tenant_id')
    .not('tenant_id', 'is', null)
    .limit(10)

  if (usuariosError) return false

  const tenantIds = Array.from(
    new Set(
      (usuariosComTenant || [])
        .map((usuario: { tenant_id: string | null }) => usuario.tenant_id)
        .filter(Boolean)
    )
  )

  return tenantIds.length === 1 && tenantIds[0] === tenantId
}

export async function canBypassContainmentForBootstrap(supabase: SupabaseLike, authUserId: string) {
  const { data: usuarioAtual, error: usuarioError } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('auth_id', authUserId)
    .maybeSingle<TenantLookupRow>()

  if (usuarioError || !usuarioAtual?.tenant_id) return false

  const { data: usuariosComTenant, error: tenantsError } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .not('tenant_id', 'is', null)
    .limit(2)

  if (tenantsError) return false

  const tenantIds = Array.from(
    new Set(
      (usuariosComTenant || [])
        .map((usuario: { tenant_id: string | null }) => usuario.tenant_id)
        .filter(Boolean)
    )
  )
  return tenantIds.length === 1 && tenantIds[0] === usuarioAtual.tenant_id
}
