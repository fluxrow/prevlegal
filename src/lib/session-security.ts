import { cookies } from 'next/headers'

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

export async function hasRecentReauth(mode: 'app' | 'admin') {
  const cookieStore = await cookies()
  const cookieName = mode === 'admin' ? ADMIN_REAUTH_COOKIE : APP_REAUTH_COOKIE
  const value = cookieStore.get(cookieName)?.value
  return parseTimestamp(value) !== null && !isTimestampExpired(value, getReauthWindowMs())
}

export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export async function setSessionActivityCookie(mode: 'app' | 'admin') {
  const cookieStore = await cookies()
  const cookieName = mode === 'admin' ? ADMIN_LAST_ACTIVE_COOKIE : APP_LAST_ACTIVE_COOKIE
  const maxAgeSeconds = mode === 'admin' ? ADMIN_IDLE_MINUTES * 60 : APP_IDLE_MINUTES * 60
  cookieStore.set(cookieName, getTimestampNow(), getSessionCookieOptions(maxAgeSeconds))
}

export async function setReauthCookie(mode: 'app' | 'admin') {
  const cookieStore = await cookies()
  const cookieName = mode === 'admin' ? ADMIN_REAUTH_COOKIE : APP_REAUTH_COOKIE
  cookieStore.set(cookieName, getTimestampNow(), getSessionCookieOptions(REAUTH_WINDOW_MINUTES * 60))
}

export async function clearSessionSecurityCookies(mode?: 'app' | 'admin') {
  const cookieStore = await cookies()

  const targets = mode
    ? [mode === 'admin' ? ADMIN_LAST_ACTIVE_COOKIE : APP_LAST_ACTIVE_COOKIE, mode === 'admin' ? ADMIN_REAUTH_COOKIE : APP_REAUTH_COOKIE]
    : [APP_LAST_ACTIVE_COOKIE, ADMIN_LAST_ACTIVE_COOKIE, APP_REAUTH_COOKIE, ADMIN_REAUTH_COOKIE]

  targets.forEach((cookieName) => cookieStore.delete(cookieName))
}
