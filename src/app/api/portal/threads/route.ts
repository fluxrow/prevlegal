import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { getPersonalInboxLeadIds } from '@/lib/inbox-visibility'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessibleLeadIds = await getPersonalInboxLeadIds(supabase, context)

  let query = supabase
    .from('portal_mensagens')
    .select('lead_id, mensagem, remetente, lida, created_at, leads!inner(nome, responsavel_id)')
    .order('created_at', { ascending: false })

  if (accessibleLeadIds.length === 0) {
    return NextResponse.json({ threads: [] })
  }
  query = query.in('lead_id', accessibleLeadIds)

  const { data } = await query

  const map: Record<string, {
    lead_id: string
    lead_nome: string
    ultima_mensagem: string | null
    ultima_mensagem_em: string | null
    nao_lidas: number
  }> = {}

  for (const msg of data || []) {
    const lead = Array.isArray(msg.leads) ? msg.leads[0] : msg.leads

    if (!map[msg.lead_id]) {
      map[msg.lead_id] = {
        lead_id: msg.lead_id,
        lead_nome: (lead as { nome?: string } | null)?.nome || 'Lead',
        ultima_mensagem: msg.mensagem,
        ultima_mensagem_em: msg.created_at,
        nao_lidas: 0,
      }
    }

    if (msg.remetente === 'cliente' && !msg.lida) {
      map[msg.lead_id].nao_lidas++
    }
  }

  const threads = Object.values(map).sort((a, b) =>
    new Date(b.ultima_mensagem_em || 0).getTime() - new Date(a.ultima_mensagem_em || 0).getTime()
  )

  return NextResponse.json({ threads })
}
