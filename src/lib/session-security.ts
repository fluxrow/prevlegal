import { cookies } from 'next/headers'
import {
  ADMIN_IDLE_MINUTES,
  ADMIN_LAST_ACTIVE_COOKIE,
  ADMIN_REAUTH_COOKIE,
  APP_IDLE_MINUTES,
  APP_LAST_ACTIVE_COOKIE,
  APP_REAUTH_COOKIE,
  REAUTH_WINDOW_MINUTES,
  getReauthWindowMs,
  getTimestampNow,
  isTimestampExpired,
  parseTimestamp,
} from './session-config'

export {
  ADMIN_IDLE_MINUTES,
  ADMIN_LAST_ACTIVE_COOKIE,
  ADMIN_REAUTH_COOKIE,
  APP_IDLE_MINUTES,
  APP_LAST_ACTIVE_COOKIE,
  APP_REAUTH_COOKIE,
  REAUTH_WINDOW_MINUTES,
  getReauthWindowMs,
  getTimestampNow,
  isTimestampExpired,
  parseTimestamp,
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
