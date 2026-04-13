import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { getPersonalInboxLeadIds, getVisibleConversationIds } from '@/lib/inbox-visibility'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [accessibleLeadIds, visibleConversationIds] = await Promise.all([
    getPersonalInboxLeadIds(supabase, context),
    getVisibleConversationIds(supabase, context),
  ])

  if (accessibleLeadIds.length === 0 && visibleConversationIds.length === 0) {
    return NextResponse.json({
      portal: 0,
      humanos: 0,
      agendamentos: 0,
      inboxTotal: 0,
      total: 0,
    })
  }

  const [portalRes, humanosRes, agendamentosRes] = await Promise.all([
    accessibleLeadIds.length > 0
      ? supabase
          .from('portal_mensagens')
          .select('id', { count: 'exact', head: true })
          .in('lead_id', accessibleLeadIds)
          .eq('remetente', 'cliente')
          .eq('lida', false)
      : Promise.resolve({ count: 0, error: null } as const),
    visibleConversationIds.length > 0
      ? supabase
          .from('conversas')
          .select('id', { count: 'exact', head: true })
          .in('id', visibleConversationIds)
          .in('status', ['humano', 'aguardando_cliente'])
          .gt('nao_lidas', 0)
      : Promise.resolve({ count: 0, error: null } as const),
    accessibleLeadIds.length > 0
      ? supabase
          .from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .in('lead_id', accessibleLeadIds)
          .in('status', ['agendado', 'remarcado'])
      : Promise.resolve({ count: 0, error: null } as const),
  ])

  if (portalRes.error) return NextResponse.json({ error: portalRes.error.message }, { status: 500 })
  if (humanosRes.error) return NextResponse.json({ error: humanosRes.error.message }, { status: 500 })
  if (agendamentosRes.error) return NextResponse.json({ error: agendamentosRes.error.message }, { status: 500 })

  const portal = portalRes.count || 0
  const humanos = humanosRes.count || 0
  const agendamentos = agendamentosRes.count || 0
  const inboxTotal = portal + humanos

  return NextResponse.json({
    portal,
    humanos,
    agendamentos,
    inboxTotal,
    total: inboxTotal,
  })
}
