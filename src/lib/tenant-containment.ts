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
