export const APP_IDLE_MINUTES = 45
export const ADMIN_IDLE_MINUTES = 15
export const REAUTH_WINDOW_MINUTES = 10

export const APP_LAST_ACTIVE_COOKIE = 'pl_last_active'
export const ADMIN_LAST_ACTIVE_COOKIE = 'pl_admin_last_active'
export const APP_REAUTH_COOKIE = 'pl_reauth_at'
export const ADMIN_REAUTH_COOKIE = 'pl_admin_reauth_at'

const MINUTE_MS = 60 * 1000

export function getIdleTimeoutMs(mode: 'app' | 'admin') {
  return (mode === 'admin' ? ADMIN_IDLE_MINUTES : APP_IDLE_MINUTES) * MINUTE_MS
}

export function getReauthWindowMs() {
  return REAUTH_WINDOW_MINUTES * MINUTE_MS
}

export function getTimestampNow() {
  return Date.now().toString()
}

export function parseTimestamp(value?: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isTimestampExpired(value: string | null | undefined, maxAgeMs: number) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return false
  return Date.now() - timestamp > maxAgeMs
}
