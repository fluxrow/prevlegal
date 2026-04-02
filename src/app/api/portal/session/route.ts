import { NextResponse } from 'next/server'
import { PORTAL_SESSION_COOKIE } from '@/lib/portal-auth'

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(PORTAL_SESSION_COOKIE)
  return response
}
