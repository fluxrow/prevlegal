import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import {
  normalizeCampaignOperationalState,
  resolveLeadIdsForOperationalConversationState,
} from '@/lib/campaign-audience-by-operational-state'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: Request) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!context.tenantId) {
    return NextResponse.json({ error: 'Tenant não resolvido para este usuário' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')

  if (mode !== 'operational_state') {
    return NextResponse.json({ error: 'Modo de audiência inválido' }, { status: 400 })
  }

  const normalizedOperationalState = normalizeCampaignOperationalState(
    searchParams.get('state'),
  )

  if (!normalizedOperationalState) {
    return NextResponse.json({ error: 'Estado operacional inválido' }, { status: 400 })
  }

  try {
    const adminClient = createAdminClient()
    const leadIds = await resolveLeadIdsForOperationalConversationState(
      adminClient,
      context.tenantId,
      normalizedOperationalState,
    )

    return NextResponse.json({
      count: leadIds.length,
      lead_ids: leadIds,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao calcular audiência' },
      { status: 500 },
    )
  }
}
