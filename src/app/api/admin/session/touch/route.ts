import { setSessionActivityCookie } from '@/lib/session-security'
import { verificarAdminAuth } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function POST() {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await setSessionActivityCookie('admin')
  return NextResponse.json({ ok: true })
}
