import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { getPersonalInboxLeadIds } from '@/lib/inbox-visibility'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessibleLeadIds = await getPersonalInboxLeadIds(supabase, context)
  if (accessibleLeadIds.length === 0) {
    return NextResponse.json({
      portal: 0,
      humanos: 0,
      agendamentos: 0,
      inboxTotal: 0,
      total: 0,
    })
  }

  const [portalRes, humanosRes, agendamentosRes] = await Promise.all([
    supabase
      .from('portal_mensagens')
      .select('id', { count: 'exact', head: true })
      .in('lead_id', accessibleLeadIds)
      .eq('remetente', 'cliente')
      .eq('lida', false),
    supabase
      .from('conversas')
      .select('id', { count: 'exact', head: true })
      .in('lead_id', accessibleLeadIds)
      .in('status', ['humano', 'aguardando_cliente'])
      .gt('nao_lidas', 0),
    supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId)
      .in('lead_id', accessibleLeadIds)
      .in('status', ['agendado', 'remarcado']),
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
