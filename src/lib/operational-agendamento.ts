import { atualizarEventoCalendar, criarEventoCalendar } from '@/lib/google-calendar'
import { createAdminSupabase } from '@/lib/internal-collaboration'
import {
  isMissingAgendamentoOwnerColumnError,
  isMissingUserCalendarColumnError,
} from '@/lib/permissions'
import type { TenantContext } from '@/lib/tenant-context'

type AdminSupabase = ReturnType<typeof createAdminSupabase>
type CalendarSupabaseLike = { from: AdminSupabase['from'] }
type CreateCalendarEvent = (args: {
  supabase: CalendarSupabaseLike
  tenantId: string | null
  ownerUsuarioId?: string | null
  titulo: string
  descricao?: string
  dataHora: string
  duracaoMinutos: number
  emailLead?: string
  emailAdvogado?: string
}) => Promise<{
  googleEventId: string | null
  meetLink: string | null
  calendarOwnerScope: 'tenant' | 'user'
  calendarOwnerUsuarioId: string | null
  calendarOwnerEmail: string | null
  calendarOwnerLabel: string
}>
type UpdateCalendarEvent = (args: {
  supabase: CalendarSupabaseLike
  tenantId: string | null
  googleEventId: string
  dataHora: string
  duracaoMinutos: number
  ownerScope?: 'tenant' | 'user' | null
  ownerUsuarioId?: string | null
  emailLead?: string
  emailAdvogado?: string
}) => Promise<void>

type QueryError = { message: string } | null

type ScopedLead = {
  id: string
  nome: string | null
  tenant_id: string | null
  responsavel_id: string | null
  email: string | null
}

type ScopedUsuario = {
  id: string
  nome: string | null
  email: string | null
  google_calendar_email?: string | null
  google_calendar_connected_at?: string | null
}

type OpenAgendamento = {
  id: string
  tenant_id: string | null
  lead_id: string | null
  usuario_id: string | null
  status: string
  data_hora: string
  duracao_minutos: number | null
  google_event_id: string | null
  meet_link?: string | null
  calendar_owner_scope?: 'tenant' | 'user' | null
  calendar_owner_usuario_id?: string | null
  calendar_owner_email?: string | null
}

export type OperationalAgendamentoResult = {
  mode: 'created' | 'updated' | 'failed'
  agendamentoId: string
  googleEventCreated: boolean
  leadEmail: string | null
  leadEmailMissing: boolean
  invitedLead: boolean
  calendarOwnerScope: 'tenant' | 'user' | null
  calendarOwnerUsuarioId: string | null
  calendarOwnerEmail: string | null
  error?: string | null
}

const AGENDAMENTOS_INSERT_RETURN_SELECT = `
  *,
  leads(id, nome, telefone, email),
  usuarios:usuarios!agendamentos_usuario_id_fkey(id, nome, email)
`

const OPEN_AGENDAMENTO_SELECT_FULL =
  'id, tenant_id, lead_id, usuario_id, status, data_hora, duracao_minutos, google_event_id, meet_link, calendar_owner_scope, calendar_owner_usuario_id, calendar_owner_email'
const OPEN_AGENDAMENTO_SELECT_LEGACY =
  'id, tenant_id, lead_id, usuario_id, status, data_hora, duracao_minutos, google_event_id, meet_link'

function normalizeEmail(value: string | null | undefined) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized || null
}

async function getScopedLead(
  supabase: AdminSupabase,
  context: TenantContext,
  leadId: string,
) {
  if (!context.tenantId) return null

  let query = supabase
    .from('leads')
    .select('id, nome, tenant_id, responsavel_id, email')
    .eq('id', leadId)
    .eq('tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query.maybeSingle<ScopedLead>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function getScopedUsuario(
  supabase: AdminSupabase,
  context: TenantContext,
  usuarioId: string | null | undefined,
) {
  const resolvedId = usuarioId || context.usuarioId
  if (!context.tenantId || !resolvedId) return null

  let result = await supabase
    .from('usuarios')
    .select('id, nome, email, google_calendar_email, google_calendar_connected_at')
    .eq('id', resolvedId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle<ScopedUsuario>()

  if (isMissingUserCalendarColumnError(result.error)) {
    result = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('id', resolvedId)
      .eq('tenant_id', context.tenantId)
      .maybeSingle<ScopedUsuario>()
  }

  const { data, error } = result
  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function insertAgendamentoWithSchemaFallback(
  supabase: AdminSupabase,
  payload: Record<string, unknown>,
) {
  const result = await supabase
    .from('agendamentos')
    .insert(payload)
    .select(AGENDAMENTOS_INSERT_RETURN_SELECT)
    .single()

  if (!isMissingAgendamentoOwnerColumnError(result.error)) {
    return result
  }

  const legacyPayload = { ...payload }
  delete legacyPayload.calendar_owner_scope
  delete legacyPayload.calendar_owner_usuario_id
  delete legacyPayload.calendar_owner_email

  return supabase
    .from('agendamentos')
    .insert(legacyPayload)
    .select(AGENDAMENTOS_INSERT_RETURN_SELECT)
    .single()
}

async function updateAgendamentoWithSchemaFallback(
  supabase: AdminSupabase,
  agendamentoId: string,
  tenantId: string | null,
  payload: Record<string, unknown>,
) {
  const result = await supabase
    .from('agendamentos')
    .update(payload)
    .eq('id', agendamentoId)
    .eq('tenant_id', tenantId)
    .select(AGENDAMENTOS_INSERT_RETURN_SELECT)
    .single()

  if (!isMissingAgendamentoOwnerColumnError(result.error)) {
    return result
  }

  const legacyPayload = { ...payload }
  delete legacyPayload.calendar_owner_scope
  delete legacyPayload.calendar_owner_usuario_id
  delete legacyPayload.calendar_owner_email

  return supabase
    .from('agendamentos')
    .update(legacyPayload)
    .eq('id', agendamentoId)
    .eq('tenant_id', tenantId)
    .select(AGENDAMENTOS_INSERT_RETURN_SELECT)
    .single()
}

async function getOpenAgendamentoForLead(
  supabase: AdminSupabase,
  tenantId: string | null,
  leadId: string,
) {
  let result = await (supabase
    .from('agendamentos')
    .select(OPEN_AGENDAMENTO_SELECT_FULL)
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .in('status', ['agendado', 'confirmado', 'remarcado'])
    .order('data_hora', { ascending: false })
    .limit(1)
    .maybeSingle() as PromiseLike<{ data: OpenAgendamento | null; error: QueryError }>)

  if (!isMissingAgendamentoOwnerColumnError(result.error)) {
    if (result.error) {
      throw new Error(result.error.message)
    }
    return result.data
  }

  result = await (supabase
    .from('agendamentos')
    .select(OPEN_AGENDAMENTO_SELECT_LEGACY)
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .in('status', ['agendado', 'confirmado', 'remarcado'])
    .order('data_hora', { ascending: false })
    .limit(1)
    .maybeSingle() as PromiseLike<{ data: OpenAgendamento | null; error: QueryError }>)

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.data
}

async function setLeadScheduled(
  supabase: AdminSupabase,
  tenantId: string | null,
  leadId: string,
) {
  const { error } = await supabase
    .from('leads')
    .update({ status: 'scheduled' })
    .eq('id', leadId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.warn('Falha ao atualizar status do lead após agendamento:', error.message)
  }
}

export async function upsertOperationalAgendamentoForLead({
  supabase,
  context,
  leadId,
  dataHora,
  duracaoMinutos = 30,
  observacoes,
  honorario,
  preferUsuarioId,
  emailReuniao,
}: {
  supabase: AdminSupabase
  context: TenantContext
  leadId: string
  dataHora: string
  duracaoMinutos?: number
  observacoes?: string | null
  honorario?: number | null
  preferUsuarioId?: string | null
  emailReuniao?: string | null
}): Promise<OperationalAgendamentoResult> {
  const lead = await getScopedLead(supabase, context, leadId)
  if (!lead) {
    throw new Error('Lead fora do escopo deste tenant/usuário')
  }

  const leadEmail = normalizeEmail(emailReuniao) || normalizeEmail(lead.email)
  const defaultUsuarioId = preferUsuarioId || lead.responsavel_id || context.usuarioId
  const agendamentoAberto = await getOpenAgendamentoForLead(supabase, context.tenantId, leadId)
  const ownerUsuarioId = agendamentoAberto?.usuario_id || defaultUsuarioId
  const usuarioResponsavel = await getScopedUsuario(supabase, context, ownerUsuarioId)

  if (!usuarioResponsavel) {
    throw new Error('Responsável inválido para este tenant')
  }

  const emailAdvogado = normalizeEmail(usuarioResponsavel.email) || undefined
  const invitedLead = Boolean(leadEmail)
  let googleEventId = agendamentoAberto?.google_event_id || null
  let meetLink = agendamentoAberto?.meet_link || null
  let calendarOwnerScope = agendamentoAberto?.calendar_owner_scope || null
  let calendarOwnerUsuarioId = agendamentoAberto?.calendar_owner_usuario_id || null
  let calendarOwnerEmail = agendamentoAberto?.calendar_owner_email || null
  let googleEventCreated = Boolean(agendamentoAberto?.google_event_id)
  const calendarSupabase = supabase as unknown as CalendarSupabaseLike
  const updateCalendarEvent = atualizarEventoCalendar as unknown as UpdateCalendarEvent
  const createCalendarEvent = criarEventoCalendar as unknown as CreateCalendarEvent

  try {
    if (agendamentoAberto?.google_event_id) {
      await updateCalendarEvent({
        supabase: calendarSupabase,
        tenantId: context.tenantId,
        googleEventId: agendamentoAberto.google_event_id,
        dataHora,
        duracaoMinutos,
        ownerScope: agendamentoAberto.calendar_owner_scope,
        ownerUsuarioId: agendamentoAberto.calendar_owner_usuario_id || agendamentoAberto.usuario_id,
        emailLead: leadEmail || undefined,
        emailAdvogado,
      })
      googleEventCreated = true
    } else {
      const resultado = await createCalendarEvent({
        supabase: calendarSupabase,
        tenantId: context.tenantId,
        ownerUsuarioId: usuarioResponsavel.id,
        titulo: `Consulta Previdenciária — ${lead.nome ?? 'Lead'}`,
        descricao: observacoes ?? '',
        dataHora,
        duracaoMinutos,
        emailLead: leadEmail || undefined,
        emailAdvogado,
      })
      googleEventId = resultado.googleEventId
      meetLink = resultado.meetLink
      calendarOwnerScope = resultado.calendarOwnerScope
      calendarOwnerUsuarioId = resultado.calendarOwnerUsuarioId
      calendarOwnerEmail = resultado.calendarOwnerEmail
      googleEventCreated = Boolean(resultado.googleEventId)
    }
  } catch (err) {
    console.warn('Google Calendar não conectado, mantendo agendamento interno:', err)
  }

  const payload = {
    tenant_id: context.tenantId,
    lead_id: leadId,
    usuario_id: agendamentoAberto?.usuario_id || usuarioResponsavel.id,
    data_hora: dataHora,
    duracao_minutos: duracaoMinutos,
    observacoes,
    honorario,
    google_event_id: googleEventId,
    meet_link: meetLink,
    calendar_owner_scope: calendarOwnerScope,
    calendar_owner_usuario_id: calendarOwnerUsuarioId,
    calendar_owner_email: calendarOwnerEmail,
    status: 'agendado',
    updated_at: new Date().toISOString(),
  }

  if (!agendamentoAberto) {
    const { data, error } = await insertAgendamentoWithSchemaFallback(supabase, payload)
    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível criar o agendamento')
    }

    await setLeadScheduled(supabase, context.tenantId, leadId)

    return {
      mode: 'created',
      agendamentoId: String((data as { id?: string }).id || ''),
      googleEventCreated,
      leadEmail,
      leadEmailMissing: !leadEmail,
      invitedLead,
      calendarOwnerScope,
      calendarOwnerUsuarioId,
      calendarOwnerEmail,
    }
  }

  const { data, error } = await updateAgendamentoWithSchemaFallback(
    supabase,
    agendamentoAberto.id,
    context.tenantId,
    payload,
  )

  if (error || !data) {
    throw new Error(error?.message || 'Não foi possível atualizar o agendamento')
  }

  await setLeadScheduled(supabase, context.tenantId, leadId)

  return {
    mode: 'updated',
    agendamentoId: agendamentoAberto.id,
    googleEventCreated,
    leadEmail,
    leadEmailMissing: !leadEmail,
    invitedLead,
    calendarOwnerScope,
    calendarOwnerUsuarioId,
    calendarOwnerEmail,
  }
}
