const DEFAULT_ALLOWED_EMAILS = [
  'jessica@alexandrini.adv.br',
]

export function getContainmentAllowedEmails() {
  const raw = process.env.TENANT_CONTAINMENT_ALLOWED_EMAILS?.trim()
  if (!raw) return DEFAULT_ALLOWED_EMAILS

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedByTenantContainment(email?: string | null) {
  if (!email) return true

  const normalizedEmail = email.trim().toLowerCase()
  const allowedEmails = getContainmentAllowedEmails()
  return allowedEmails.includes(normalizedEmail)
}

export function isBlockedByTenantContainment(email?: string | null) {
  return !isAllowedByTenantContainment(email)
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
