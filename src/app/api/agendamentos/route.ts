import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { criarEventoCalendar } from '@/lib/google-calendar'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isMissingUserCalendarColumnError } from '@/lib/permissions'

async function getScopedLead(
  supabase: any,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  leadId: string,
) {
  if (!context.tenantId) return null

  let query = supabase
    .from('leads')
    .select('id, nome, tenant_id, responsavel_id')
    .eq('id', leadId)
    .eq('tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function getScopedUsuario(
  supabase: any,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  usuarioId: string | null | undefined,
) {
  const resolvedId = usuarioId || context.usuarioId
  if (!context.tenantId || !resolvedId) return null

  let result = await supabase
    .from('usuarios')
    .select('id, nome, email, google_calendar_email, google_calendar_connected_at')
    .eq('id', resolvedId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

  if (isMissingUserCalendarColumnError(result.error)) {
    result = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('id', resolvedId)
      .eq('tenant_id', context.tenantId)
      .maybeSingle()
  }

  const { data, error } = result
  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('agendamentos')
    .select(`
      *,
      leads (id, nome, telefone, banco, ganho_potencial),
      usuarios (id, nome, email)
    `)
    .eq('tenant_id', context.tenantId)
    .order('data_hora', { ascending: true })

  if (!context.isAdmin) {
    query = query.eq('usuario_id', context.usuarioId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const context = await getTenantContext(supabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { lead_id, usuario_id, data_hora, duracao_minutos = 30, observacoes, honorario, email_reuniao } = body

    if (!lead_id || !data_hora) {
      return NextResponse.json({ error: 'lead_id e data_hora são obrigatórios' }, { status: 400 })
    }

    const lead = await getScopedLead(adminSupabase, context, lead_id)
    if (!lead) {
      return NextResponse.json({ error: 'Lead fora do escopo deste tenant/usuário' }, { status: 403 })
    }

    const usuarioResponsavel = await getScopedUsuario(
      adminSupabase,
      context,
      context.isAdmin ? usuario_id : context.usuarioId,
    )
    if (!usuarioResponsavel) {
      return NextResponse.json({ error: 'Responsável inválido para este tenant' }, { status: 400 })
    }

    let googleEventId: string | null = null
    let meetLink: string | null = null
    let calendarOwnerScope: 'tenant' | 'user' | null = null
    let calendarOwnerUsuarioId: string | null = null
    let calendarOwnerEmail: string | null = null
    const emailReuniao =
      typeof email_reuniao === 'string' && email_reuniao.trim()
        ? email_reuniao.trim()
        : undefined
    const emailLead = emailReuniao || undefined

    try {
      const resultado = await criarEventoCalendar({
        supabase: adminSupabase,
        tenantId: context.tenantId,
        ownerUsuarioId: usuarioResponsavel.id,
        titulo: `Consulta Previdenciária — ${lead?.nome ?? 'Lead'}`,
        descricao: observacoes ?? '',
        dataHora: data_hora,
        duracaoMinutos: duracao_minutos,
        emailLead,
        emailAdvogado: usuarioResponsavel?.email ?? undefined,
      })
      googleEventId = resultado.googleEventId
      meetLink = resultado.meetLink
      calendarOwnerScope = resultado.calendarOwnerScope
      calendarOwnerUsuarioId = resultado.calendarOwnerUsuarioId
      calendarOwnerEmail = resultado.calendarOwnerEmail
    } catch (err) {
      console.warn('Google Calendar não conectado, agendando sem evento:', err)
    }

    const { data, error } = await adminSupabase
      .from('agendamentos')
      .insert({
        tenant_id: context.tenantId,
        lead_id,
        usuario_id: usuarioResponsavel.id,
        data_hora,
        duracao_minutos,
        observacoes,
        honorario,
        google_event_id: googleEventId,
        meet_link: meetLink,
        calendar_owner_scope: calendarOwnerScope,
        calendar_owner_usuario_id: calendarOwnerUsuarioId,
        calendar_owner_email: calendarOwnerEmail,
        status: 'agendado',
      })
      .select(`*, leads(id, nome, telefone), usuarios(id, nome)`)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { error: leadUpdateError } = await adminSupabase
      .from('leads')
      .update({ status: 'scheduled' })
      .eq('id', lead_id)
      .eq('tenant_id', context.tenantId)

    if (leadUpdateError) {
      console.warn('Falha ao atualizar status do lead após agendamento:', leadUpdateError.message)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível criar o agendamento'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
