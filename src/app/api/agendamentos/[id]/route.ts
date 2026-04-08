import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelarEventoCalendar, atualizarEventoCalendar } from '@/lib/google-calendar'
import { canAccessLeadId, contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isMissingAgendamentoOwnerColumnError } from '@/lib/permissions'

const AGENDAMENTO_SELECT_FULL =
  'id, tenant_id, google_event_id, lead_id, status, usuario_id, calendar_owner_scope, calendar_owner_usuario_id'
const AGENDAMENTO_SELECT_LEGACY =
  'id, tenant_id, google_event_id, lead_id, status, usuario_id'
const AGENDAMENTO_RETURN_SELECT = `
  *,
  leads(id, nome, telefone),
  usuarios:usuarios!agendamentos_usuario_id_fkey(id, nome, email)
`

async function getAgendamentoAtualWithSchemaFallback(
  supabase: any,
  tenantId: string | null,
  id: string,
) {
  let result = await supabase
    .from('agendamentos')
    .select(AGENDAMENTO_SELECT_FULL)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!isMissingAgendamentoOwnerColumnError(result.error)) {
    return result
  }

  return supabase
    .from('agendamentos')
    .select(AGENDAMENTO_SELECT_LEGACY)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, data_hora, duracao_minutos, observacoes, honorario, usuario_id } = body

  // Busca agendamento atual
  const { data: atual } = await getAgendamentoAtualWithSchemaFallback(
    adminSupabase,
    context.tenantId,
    id,
  )
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
  if (usuario_id) {
    if (!contextHasPermission(context, 'agendamentos_assign')) {
      return NextResponse.json({ error: 'Você não tem permissão para reatribuir agendamentos' }, { status: 403 })
    }
    updates.usuario_id = usuario_id
  }

  if (!status && data_hora && !['cancelado', 'realizado'].includes(atual.status)) {
    updates.status = 'remarcado'
  }

  // Atualiza no Google Calendar se remarcando
  if (atual?.google_event_id && data_hora) {
    try {
      await atualizarEventoCalendar({
        supabase: adminSupabase,
        tenantId: context.tenantId,
        googleEventId: atual.google_event_id,
        dataHora: data_hora,
        duracaoMinutos: duracao_minutos ?? 30,
        ownerScope: 'calendar_owner_scope' in atual ? atual.calendar_owner_scope : undefined,
        ownerUsuarioId: 'calendar_owner_usuario_id' in atual ? atual.calendar_owner_usuario_id : undefined,
      })
    } catch (err) {
      console.warn('Erro ao atualizar evento Google Calendar:', err)
    }
  }

  // Cancela no Google Calendar se status = cancelado
  if (status === 'cancelado' && atual?.google_event_id) {
    try {
      await cancelarEventoCalendar({
        supabase: adminSupabase,
        tenantId: context.tenantId,
        googleEventId: atual.google_event_id,
        ownerScope: 'calendar_owner_scope' in atual ? atual.calendar_owner_scope : undefined,
        ownerUsuarioId: 'calendar_owner_usuario_id' in atual ? atual.calendar_owner_usuario_id : undefined,
      })
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

  const { data, error } = await adminSupabase
    .from('agendamentos')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .select(AGENDAMENTO_RETURN_SELECT)
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
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: atual } = await getAgendamentoAtualWithSchemaFallback(
    adminSupabase,
    context.tenantId,
    id,
  )

  if (!atual) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  if (!context.isAdmin) {
    const allowed = await canAccessLeadId(supabase, context, atual.lead_id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (atual?.google_event_id) {
    try {
      await cancelarEventoCalendar({
        supabase: adminSupabase,
        tenantId: context.tenantId,
        googleEventId: atual.google_event_id,
        ownerScope: 'calendar_owner_scope' in atual ? atual.calendar_owner_scope : undefined,
        ownerUsuarioId: 'calendar_owner_usuario_id' in atual ? atual.calendar_owner_usuario_id : undefined,
      })
    } catch (err) {
      console.warn('Erro ao cancelar evento Google Calendar:', err)
    }
  }

  await adminSupabase.from('leads').update({ status: 'awaiting' }).eq('id', atual.lead_id).eq('status', 'scheduled')

  const { error } = await adminSupabase.from('agendamentos').delete().eq('id', id).eq('tenant_id', context.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
