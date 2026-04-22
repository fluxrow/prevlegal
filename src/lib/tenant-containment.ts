const DEFAULT_ALLOWED_EMAILS = [
  'jessica@alexandrini.adv.br',
]

const DEFAULT_ALLOWED_TENANT_IDS = [
  'dbb8ae41-8d87-4305-80c0-40a8958d9688',
]

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

export async function getAuthenticatedTenantIdForContainment(supabase: any, authUserId: string) {
  const { data: usuarioAtual, error } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('auth_id', authUserId)
    .maybeSingle()

  if (error) return null
  return usuarioAtual?.tenant_id || null
}

export async function canProvisionOutsideContainment(adminSupabase: any, tenantId?: string) {
  const { count, error } = await adminSupabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  if (error) return false
  if ((count || 0) === 0) return true
  if (!tenantId) return false

  const { count: tenantCount, error: tenantCountError } = await adminSupabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })

  if (tenantCountError || (tenantCount || 0) !== 1) return false

  const { data: usuariosComTenant, error: usuariosError } = await adminSupabase
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

export async function canBypassContainmentForBootstrap(supabase: any, authUserId: string) {
  const { data: usuarioAtual, error: usuarioError } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('auth_id', authUserId)
    .maybeSingle()

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
