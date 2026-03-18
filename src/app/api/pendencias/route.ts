import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [portalRes, humanosRes, agendamentosRes] = await Promise.all([
    supabase
      .from('portal_mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('remetente', 'cliente')
      .eq('lida', false),
    supabase
      .from('conversas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'humano')
      .gt('nao_lidas', 0),
    supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('criado_por', 'agente')
      .eq('visualizado', false),
  ])

  const portal = portalRes.count || 0
  const humanos = humanosRes.count || 0
  const agendamentos = agendamentosRes.count || 0

  return NextResponse.json({
    portal,
    humanos,
    agendamentos,
    total: portal + humanos + agendamentos,
  })
}
