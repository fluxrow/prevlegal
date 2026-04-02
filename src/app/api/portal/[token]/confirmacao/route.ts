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

  const { data: lead } = await adminSupabase
    .from('leads')
    .select('id, nome, tenant_id, portal_ativo')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  const viewerResult = await resolvePortalViewer(adminSupabase, request, lead.id)

  const { data: proximoAgendamento, error: agendamentoError } = await adminSupabase
    .from('agendamentos')
    .select('id, status, data_hora')
    .eq('lead_id', lead.id)
    .in('status', ['agendado', 'confirmado', 'remarcado'])
    .gte('data_hora', new Date().toISOString())
    .order('data_hora', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (agendamentoError) {
    return NextResponse.json({ error: agendamentoError.message }, { status: 500 })
  }

  if (!proximoAgendamento) {
    return NextResponse.json({ error: 'Nenhuma consulta futura disponível para confirmação.' }, { status: 404 })
  }

  if (proximoAgendamento.status !== 'confirmado') {
    const { error: updateError } = await adminSupabase
      .from('agendamentos')
      .update({
        status: 'confirmado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', proximoAgendamento.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  const origemNome =
    viewerResult.viewer?.nome?.trim() ||
    (viewerResult.viewer ? 'Acesso do portal' : 'Cliente')

  const descricao =
    proximoAgendamento.status === 'confirmado'
      ? `${origemNome} revisou e manteve a presença confirmada na consulta.`
      : `${origemNome} confirmou presença na consulta agendada.`

  const { error: timelineError } = await adminSupabase
    .from('portal_timeline_events')
    .insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      tipo: 'confirmacao_presenca_cliente',
      titulo: 'Presença confirmada no portal',
      descricao,
      visivel_cliente: true,
    })

  if (timelineError && !isMissingRelation(timelineError)) {
    return NextResponse.json({ error: timelineError.message }, { status: 500 })
  }

  await adminSupabase.from('notificacoes').insert({
    tenant_id: lead.tenant_id,
    tipo: 'portal',
    titulo: `Consulta confirmada — ${lead.nome}`,
    descricao: descricao,
    lida: false,
    link: `/agendamentos`,
  })

  return NextResponse.json({
    ok: true,
    agendamento: {
      id: proximoAgendamento.id,
      status: 'confirmado',
    },
  })
}
