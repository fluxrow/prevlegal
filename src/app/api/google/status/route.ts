import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { getGoogleCalendarStatus } from '@/lib/google-calendar'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) {
    return NextResponse.json({
      currentUser: { connected: false, email: null, connectedAt: null },
      tenantDefault: { connected: false, email: null, connectedAt: null },
      effective: { connected: false, source: 'none', email: null },
    })
  }

  const status = await getGoogleCalendarStatus({
    supabase,
    tenantId: context.tenantId,
    usuarioId: context.usuarioId,
  })

  return NextResponse.json(status)
}
