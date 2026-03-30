import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelarEventoCalendar, atualizarEventoCalendar } from '@/lib/google-calendar'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, data_hora, duracao_minutos, observacoes, honorario, usuario_id } = body

  // Busca agendamento atual
  let atualQuery = supabase
    .from('agendamentos')
    .select('id, tenant_id, google_event_id, lead_id, status, usuario_id')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)

  const { data: atual } = await atualQuery.single()
  if (!atual) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  if (!context.isAdmin) {
    const allowed = await canAccessLeadId(supabase, context, atual.lead_id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (observacoes !== undefined) updates.observacoes = observacoes
  if (honorario !== undefined) updates.honorario = honorario
  if (data_hora) updates.data_hora = data_hora
  if (duracao_minutos) updates.duracao_minutos = duracao_minutos
  if (usuario_id && context.isAdmin) updates.usuario_id = usuario_id

  if (!status && data_hora && !['cancelado', 'realizado'].includes(atual.status)) {
    updates.status = 'remarcado'
  }

  // Atualiza no Google Calendar se remarcando
  if (atual?.google_event_id && data_hora) {
    try {
      await atualizarEventoCalendar({
        googleEventId: atual.google_event_id,
        dataHora: data_hora,
        duracaoMinutos: duracao_minutos ?? 30,
      })
    } catch (err) {
      console.warn('Erro ao atualizar evento Google Calendar:', err)
    }
  }

  // Cancela no Google Calendar se status = cancelado
  if (status === 'cancelado' && atual?.google_event_id) {
    try {
      await cancelarEventoCalendar(atual.google_event_id)
    } catch (err) {
      console.warn('Erro ao cancelar evento Google Calendar:', err)
    }
  }

  // Atualiza status do lead conforme a evolução do agendamento
  if (status === 'realizado' && atual?.lead_id) {
    await supabase.from('leads').update({ status: 'converted' }).eq('id', atual.lead_id)
  }

  if (['agendado', 'confirmado', 'remarcado'].includes(status) && atual?.lead_id) {
    await supabase.from('leads').update({ status: 'scheduled' }).eq('id', atual.lead_id)
  }

  if (status === 'cancelado' && atual?.lead_id) {
    await supabase.from('leads').update({ status: 'awaiting' }).eq('id', atual.lead_id).eq('status', 'scheduled')
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .select(`*, leads(id, nome, telefone), usuarios(id, nome)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: atual } = await supabase
    .from('agendamentos')
    .select('google_event_id, lead_id')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .single()

  if (!atual) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  if (!context.isAdmin) {
    const allowed = await canAccessLeadId(supabase, context, atual.lead_id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (atual?.google_event_id) {
    try {
      await cancelarEventoCalendar(atual.google_event_id)
    } catch (err) {
      console.warn('Erro ao cancelar evento Google Calendar:', err)
    }
  }

  await supabase.from('leads').update({ status: 'awaiting' }).eq('id', atual.lead_id).eq('status', 'scheduled')

  const { error } = await supabase.from('agendamentos').delete().eq('id', id).eq('tenant_id', context.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
