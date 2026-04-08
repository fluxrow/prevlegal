import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json()

  const validStatuses = ['new', 'contacted', 'awaiting', 'scheduled', 'converted', 'lost']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: oldLead } = await supabase
    .from('leads')
    .select('status')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (oldLead && oldLead.status !== status) {
    const { processEventTriggers } = await import('@/lib/events/orchestrator')

    await processEventTriggers(context.tenantId, id, 'lead_status_mudou', status)
      .catch(err => console.error('[Orquestrador] Erro ao disparar gatilho pela rota de status:', err))
  }

  return NextResponse.json({ success: true, lead: data })
}
