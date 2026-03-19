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

export async function canProvisionOutsideContainment(adminSupabase: any) {
  const { count, error } = await adminSupabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })

  if (error) return false
  return (count || 0) === 0
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
