import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { getTenantContext } from '@/lib/tenant-context'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ connected: false })

  const { data: config } = await getConfiguracaoAtual(
    supabase,
    context.tenantId,
    'google_calendar_token',
  )

  const connected = !!(config?.google_calendar_token)
  return NextResponse.json({ connected })
}
