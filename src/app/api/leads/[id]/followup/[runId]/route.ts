import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, canAccessLeadId } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id, runId } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json() as { action: 'pausar' | 'retomar' | 'cancelar'; motivo?: string }
  const service = createAdminSupabase()

  const { data: run } = await service
    .from('followup_runs')
    .select('id, status')
    .eq('id', runId)
    .eq('lead_id', id)
    .eq('tenant_id', context.tenantId)
    .single()

  if (!run) return NextResponse.json({ error: 'Run não encontrada' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  let eventoTipo = ''

  if (body.action === 'pausar' && run.status === 'ativo') {
    updates.status = 'pausado'
    updates.pausado_por = context.usuarioId
    eventoTipo = 'pausado'
  } else if (body.action === 'retomar' && run.status === 'pausado') {
    updates.status = 'ativo'
    eventoTipo = 'retomado'
  } else if (body.action === 'cancelar' && ['ativo', 'pausado'].includes(run.status)) {
    updates.status = 'cancelado'
    updates.cancelado_por = context.usuarioId
    updates.motivo_parada = body.motivo || 'Cancelado manualmente'
    eventoTipo = 'cancelado'
  } else {
    return NextResponse.json({ error: 'Ação inválida para o status atual' }, { status: 400 })
  }

  const { data: updated, error } = await service
    .from('followup_runs')
    .update(updates)
    .eq('id', runId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service.from('followup_events').insert({
    tenant_id: context.tenantId,
    run_id: runId,
    lead_id: id,
    tipo: eventoTipo,
    metadata: { usuario_id: context.usuarioId, motivo: body.motivo || null },
  })

  return NextResponse.json(updated)
}
