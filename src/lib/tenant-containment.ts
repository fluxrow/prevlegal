const DEFAULT_ALLOWED_EMAILS = [
  'jessica@alexandrini.adv.br',
  'fbcfarias@icloud.com',
  'fbcfarias@gmail.com',
]

export function getContainmentAllowedEmails() {
  const raw = process.env.TENANT_CONTAINMENT_ALLOWED_EMAILS?.trim()
  if (!raw) return DEFAULT_ALLOWED_EMAILS

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isBlockedByTenantContainment(email?: string | null) {
  if (!email) return false

  const normalizedEmail = email.trim().toLowerCase()
  const allowedEmails = getContainmentAllowedEmails()
  return !allowedEmails.includes(normalizedEmail)
}

