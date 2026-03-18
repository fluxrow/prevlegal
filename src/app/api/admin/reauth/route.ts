import { setReauthCookie } from '@/lib/session-security'
import { verificarAdminCredenciais } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, senha } = await request.json()
  if (!verificarAdminCredenciais(email, senha)) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  await setReauthCookie('admin')
  return NextResponse.json({ ok: true })
}
