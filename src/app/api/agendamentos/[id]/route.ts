import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelarEventoCalendar, atualizarEventoCalendar } from '@/lib/google-calendar'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, data_hora, duracao_minutos, observacoes, honorario } = body

  // Busca agendamento atual
  const { data: atual } = await supabase
    .from('agendamentos')
    .select('google_event_id, lead_id')
    .eq('id', id)
    .single()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (observacoes !== undefined) updates.observacoes = observacoes
  if (honorario !== undefined) updates.honorario = honorario
  if (data_hora) updates.data_hora = data_hora
  if (duracao_minutos) updates.duracao_minutos = duracao_minutos

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

  // Atualiza status do lead se convertido
  if (status === 'realizado' && atual?.lead_id) {
    await supabase.from('leads').update({ status: 'converted' }).eq('id', atual.lead_id)
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .update(updates)
    .eq('id', id)
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: atual } = await supabase
    .from('agendamentos')
    .select('google_event_id')
    .eq('id', id)
    .single()

  if (atual?.google_event_id) {
    try {
      await cancelarEventoCalendar(atual.google_event_id)
    } catch (err) {
      console.warn('Erro ao cancelar evento Google Calendar:', err)
    }
  }

  const { error } = await supabase.from('agendamentos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
