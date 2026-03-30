import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { criarEventoCalendar } from '@/lib/google-calendar'
import { getTenantContext } from '@/lib/tenant-context'

async function getScopedLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  leadId: string,
) {
  if (!context.tenantId) return null

  let query = supabase
    .from('leads')
    .select('id, nome, email, tenant_id, responsavel_id')
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  usuarioId: string | null | undefined,
) {
  const resolvedId = usuarioId || context.usuarioId
  if (!context.tenantId || !resolvedId) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email')
    .eq('id', resolvedId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

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
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { lead_id, usuario_id, data_hora, duracao_minutos = 30, observacoes, honorario } = body

  if (!lead_id || !data_hora) {
    return NextResponse.json({ error: 'lead_id e data_hora são obrigatórios' }, { status: 400 })
  }

  const lead = await getScopedLead(supabase, context, lead_id)
  if (!lead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const usuarioResponsavel = await getScopedUsuario(supabase, context, context.isAdmin ? usuario_id : context.usuarioId)
  if (!usuarioResponsavel) {
    return NextResponse.json({ error: 'Responsável inválido para este tenant' }, { status: 400 })
  }

  let googleEventId: string | null = null
  let meetLink: string | null = null

  // Tenta criar no Google Calendar (não falha se não conectado)
  try {
    const resultado = await criarEventoCalendar({
      titulo: `Consulta Previdenciária — ${lead?.nome ?? 'Lead'}`,
      descricao: observacoes ?? '',
      dataHora: data_hora,
      duracaoMinutos: duracao_minutos,
      emailLead: (lead as { email?: string })?.email ?? undefined,
      emailAdvogado: usuarioResponsavel?.email ?? undefined,
    })
    googleEventId = resultado.googleEventId
    meetLink = resultado.meetLink
  } catch (err) {
    console.warn('Google Calendar não conectado, agendando sem evento:', err)
  }

  const { data, error } = await supabase
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
      status: 'agendado',
    })
    .select(`*, leads(id, nome, telefone), usuarios(id, nome)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualiza status do lead para "scheduled"
  await supabase.from('leads').update({ status: 'scheduled' }).eq('id', lead_id)

  return NextResponse.json(data, { status: 201 })
}
