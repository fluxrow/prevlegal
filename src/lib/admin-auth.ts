import { cookies } from 'next/headers'
import { ADMIN_REAUTH_COOKIE, getReauthWindowMs, isTimestampExpired, parseTimestamp } from './session-security'

const ADMIN_TOKEN = process.env.ADMIN_FLUXROW_TOKEN || 'fluxrow-admin-secret-2026'
const ADMIN_EMAIL = process.env.ADMIN_FLUXROW_EMAIL || 'fbcfarias@icloud.com'
const ADMIN_SENHA = process.env.ADMIN_FLUXROW_SENHA || 'Fbc*2025#'

export async function verificarAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_token')?.value === ADMIN_TOKEN
}

export function verificarAdminCredenciais(email?: string, senha?: string) {
  return email === ADMIN_EMAIL && senha === ADMIN_SENHA
}

export async function verificarAdminReauthRecente(): Promise<boolean> {
  const cookieStore = await cookies()
  const value = cookieStore.get(ADMIN_REAUTH_COOKIE)?.value
  return parseTimestamp(value) !== null && !isTimestampExpired(value, getReauthWindowMs())
}
