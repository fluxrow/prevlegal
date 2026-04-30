import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'
import {
  isRecontactFoundationMissing,
  processLiveRecontactForTenant,
} from '@/lib/recontact-automation-engine'

function isAuthorized(request: NextRequest) {
  const expected = String(process.env.CRON_SECRET || '').trim()
  const provided = request.headers.get('authorization') || ''

  if (!expected) return false
  return provided === `Bearer ${expected}`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Erro desconhecido')
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminSupabase()
    const { data: tenants, error } = await admin
      .from('configuracoes')
      .select('tenant_id')
      .eq('auto_recontact_mode', 'live')
      .or('auto_recontact_campaign_no_reply_enabled.eq.true,auto_recontact_open_conversation_enabled.eq.true')

    if (error) throw new Error(error.message)

    const uniqueTenantIds = Array.from(
      new Set((tenants || []).map((row: { tenant_id?: string | null }) => row.tenant_id).filter(Boolean)),
    ) as string[]

    const results = []
    for (const tenantId of uniqueTenantIds) {
      const result = await processLiveRecontactForTenant(admin, tenantId)
      results.push({ tenantId, ...result })
    }

    return NextResponse.json({ ok: true, processedTenants: results.length, results })
  } catch (error) {
    if (isRecontactFoundationMissing(error)) {
      return NextResponse.json({
        ok: true,
        processedTenants: 0,
        results: [],
        foundationReady: false,
      })
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
