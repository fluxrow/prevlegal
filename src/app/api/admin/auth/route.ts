import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { setReauthCookie, setSessionActivityCookie, clearSessionSecurityCookies } from '@/lib/session-security'

const ADMIN_EMAIL = process.env.ADMIN_FLUXROW_EMAIL || 'fbcfarias@icloud.com'
const ADMIN_SENHA = process.env.ADMIN_FLUXROW_SENHA || 'Fbc*2025#'
const ADMIN_TOKEN = process.env.ADMIN_FLUXROW_TOKEN || 'fluxrow-admin-secret-2026'

export async function POST(request: Request) {
  const { email, senha } = await request.json()
  if (email !== ADMIN_EMAIL || senha !== ADMIN_SENHA) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }
  const cookieStore = await cookies()
  cookieStore.set('admin_token', ADMIN_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  await setSessionActivityCookie('admin')
  await setReauthCookie('admin')
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_token')
  await clearSessionSecurityCookies('admin')
  return NextResponse.json({ ok: true })
}
