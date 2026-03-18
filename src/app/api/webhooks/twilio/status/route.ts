import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Mapeamento dos status do Twilio para o enum mensagem_status do banco
const STATUS_MAP: Record<string, string> = {
  queued: 'enviando',
  sending: 'enviando',
  sent: 'enviado',
  delivered: 'entregue',
  read: 'lido',
  failed: 'falhou',
  undelivered: 'falhou',
}

export async function POST(request: NextRequest) {
  const supabase = createAdminSupabase()
  // 1. Validar assinatura Twilio
  const twilioSignature = request.headers.get('x-twilio-signature') || ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`

  const body = await request.text()
  const params = Object.fromEntries(new URLSearchParams(body))

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    params
  )

  if (!isValid && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 403 })
  }

  // 2. Extrair dados do callback
  const messageSid = params.MessageSid      // SID único da mensagem
  const messageStatus = params.MessageStatus // queued | sent | delivered | read | failed | undelivered

  if (!messageSid || !messageStatus) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const novoStatus = STATUS_MAP[messageStatus]
  if (!novoStatus) {
    // Status desconhecido — apenas confirmar recebimento
    return new NextResponse('', { status: 200 })
  }

  // 3. Buscar a mensagem pelo twilio_sid
  const { data: mensagem } = await supabase
    .from('campanha_mensagens')
    .select('id, status, campanha_id, lead_id')
    .eq('twilio_sid', messageSid)
    .maybeSingle()

  if (!mensagem) {
    // Mensagem não encontrada — pode ser de outro contexto, retornar 200 mesmo assim
    return new NextResponse('', { status: 200 })
  }

  // 4. Montar objeto de atualização com os timestamps corretos
  const agora = new Date().toISOString()
  const updates: Record<string, string> = { status: novoStatus }

  if (novoStatus === 'enviado') updates.enviado_at = agora
  if (novoStatus === 'entregue') updates.entregue_at = agora
  if (novoStatus === 'lido') updates.lido_at = agora
  if (novoStatus === 'falhou') updates.erro_detalhe = `Twilio status: ${messageStatus}`

  // 5. Só atualizar se for um status "mais avançado" (evitar regressão)
  const ORDER = ['enviando', 'enviado', 'entregue', 'lido', 'respondido', 'falhou']
  const statusAtualIdx = ORDER.indexOf(mensagem.status)
  const novoStatusIdx = ORDER.indexOf(novoStatus)

  // Falhou pode ocorrer a qualquer momento — sempre atualizar
  // Para outros, só avançar (nunca regredir)
  if (novoStatus !== 'falhou' && novoStatusIdx <= statusAtualIdx) {
    return new NextResponse('', { status: 200 })
  }

  await supabase
    .from('campanha_mensagens')
    .update(updates)
    .eq('id', mensagem.id)

  // 6. Atualizar contadores na campanha
  if (mensagem.campanha_id) {
    if (novoStatus === 'entregue') {
      await supabase.rpc('increment_campanha_entregues', {
        p_campanha_id: mensagem.campanha_id,
      })
    }
    if (novoStatus === 'lido') {
      await supabase.rpc('increment_campanha_lidos', {
        p_campanha_id: mensagem.campanha_id,
      })
    }
    if (novoStatus === 'falhou') {
      await supabase.rpc('increment_campanha_falhos', {
        p_campanha_id: mensagem.campanha_id,
      })
    }
  }

  return new NextResponse('', { status: 200 })
}
