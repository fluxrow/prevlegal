import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { triggerAgentAutoresponder } from '@/lib/agent-autoresponder'

export const runtime = 'nodejs'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  const { data: pendingMessages, error: pendingMessagesError } = await supabase
    .from('mensagens_inbound')
    .select('id, conversa_id, lead_id, tenant_id, created_at')
    .not('conversa_id', 'is', null)
    .eq('respondido_por_agente', false)
    .eq('respondido_manualmente', false)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(200)

  if (pendingMessagesError) {
    return NextResponse.json({ error: pendingMessagesError.message }, { status: 500 })
  }

  const latestByConversation = new Map<string, (typeof pendingMessages)[number]>()
  for (const row of pendingMessages || []) {
    if (!row.conversa_id) continue
    if (!latestByConversation.has(row.conversa_id)) {
      latestByConversation.set(row.conversa_id, row)
    }
  }

  const conversaIds = Array.from(latestByConversation.keys())

  if (conversaIds.length === 0) {
    return NextResponse.json({ processados: 0, resultados: [] })
  }

  const { data: conversas, error: conversasError } = await supabase
    .from('conversas')
    .select('id, status')
    .in('id', conversaIds)

  if (conversasError) {
    return NextResponse.json({ error: conversasError.message }, { status: 500 })
  }

  const statusMap = new Map((conversas || []).map((conversa) => [conversa.id, conversa.status]))
  const messagesToProcess = Array.from(latestByConversation.values()).filter(
    (row) => row.conversa_id && statusMap.get(row.conversa_id) === 'agente',
  )

  const resultados: Array<{
    mensagem_id: string
    conversa_id: string | null
    status: string
    detalhe?: string
  }> = []

  for (const row of messagesToProcess) {
    const result = await triggerAgentAutoresponder(row.id)
    resultados.push({
      mensagem_id: row.id,
      conversa_id: row.conversa_id,
      status: result.ok ? 'processado' : 'falhou',
      detalhe: result.ok ? result.payload?.reason || null : result.error,
    })
  }

  return NextResponse.json({
    processados: messagesToProcess.length,
    resultados,
  })
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
