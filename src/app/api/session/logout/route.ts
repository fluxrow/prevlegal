import { clearSessionSecurityCookies } from '@/lib/session-security'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  await clearSessionSecurityCookies('app')
  return NextResponse.json({ ok: true })
}
