import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolvePortalViewer } from '@/lib/portal-auth'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params
  const body = await request.json().catch(() => ({}))

  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : ''
  const sugestao = typeof body.sugestao === 'string' ? body.sugestao.trim() : ''

  if (!motivo) {
    return NextResponse.json({ error: 'Explique brevemente o motivo da remarcação.' }, { status: 400 })
  }

  const { data: lead } = await adminSupabase
    .from('leads')
    .select('id, nome, tenant_id')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  const { data: proximoAgendamento } = await adminSupabase
    .from('agendamentos')
    .select('id, data_hora, status')
    .eq('lead_id', lead.id)
    .in('status', ['agendado', 'confirmado', 'remarcado'])
    .gte('data_hora', new Date().toISOString())
    .order('data_hora', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!proximoAgendamento) {
    return NextResponse.json({ error: 'Não há consulta futura para remarcar.' }, { status: 400 })
  }

  const viewerResult = await resolvePortalViewer(adminSupabase, request, lead.id)
  const origemNome = viewerResult.viewer?.nome || lead.nome || 'Cliente do portal'
  const descricao = sugestao
    ? `${origemNome} pediu remarcação. Motivo: ${motivo}. Sugestão: ${sugestao}.`
    : `${origemNome} pediu remarcação. Motivo: ${motivo}.`

  const { error: timelineError } = await adminSupabase
    .from('portal_timeline_events')
    .insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      tipo: 'pedido_remarcacao_cliente',
      titulo: 'Pedido de remarcação enviado',
      descricao,
      visivel_cliente: true,
    })

  if (timelineError && !isMissingRelation(timelineError)) {
    return NextResponse.json({ error: timelineError.message }, { status: 500 })
  }

  await adminSupabase.from('notificacoes').insert({
    tenant_id: lead.tenant_id,
    tipo: 'portal',
    titulo: `Pedido de remarcação — ${lead.nome}`,
    descricao: sugestao ? `${motivo} • ${sugestao}` : motivo,
    lida: false,
    link: `/agendamentos`,
  })

  return NextResponse.json({
    ok: true,
    pedido: {
      agendamento_id: proximoAgendamento.id,
      motivo,
      sugestao: sugestao || null,
    },
  })
}
