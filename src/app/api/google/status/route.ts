import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ connected: false })

  const { data: config } = await supabase
    .from('configuracoes')
    .select('google_calendar_token')
    .single()

  const connected = !!(config?.google_calendar_token)
  return NextResponse.json({ connected })
}
