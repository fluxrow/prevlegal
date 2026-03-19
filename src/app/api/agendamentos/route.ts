import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { criarEventoCalendar } from '@/lib/google-calendar'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

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

  if (!context.isAdmin) {
    const allowed = await canAccessLeadId(supabase, context, lead_id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Busca email do lead (se tiver)
  const { data: lead } = await supabase
    .from('leads')
    .select('nome, email')
    .eq('id', lead_id)
    .single()

  // Busca email do usuário responsável
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, email')
    .eq('id', usuario_id)
    .maybeSingle()

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
      emailAdvogado: usuario?.email ?? undefined,
    })
    googleEventId = resultado.googleEventId
    meetLink = resultado.meetLink
  } catch (err) {
    console.warn('Google Calendar não conectado, agendando sem evento:', err)
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      lead_id,
      usuario_id: context.isAdmin ? (usuario_id ?? context.usuarioId) : context.usuarioId,
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
