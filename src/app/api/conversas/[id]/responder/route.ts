import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { mensagem } = await request.json()

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 })
  }

  const { data: conversa } = await supabase
    .from('conversas')
    .select('telefone')
    .eq('id', id)
    .single()

  if (!conversa) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const { data: config } = await supabase
    .from('configuracoes')
    .select('twilio_numero_origem')
    .limit(1)
    .single()

  const twilioFrom = config?.twilio_numero_origem || 'whatsapp:+14155238886'
  const twilioTo = conversa.telefone.startsWith('whatsapp:')
    ? conversa.telefone
    : `whatsapp:${conversa.telefone}`

  // Enviar via Twilio HTTP API
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`

  await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
    },
    body: new URLSearchParams({ From: twilioFrom, To: twilioTo, Body: mensagem }).toString(),
  })

  // Registrar mensagem manual
  await supabase.from('mensagens_inbound').insert({
    conversa_id: id,
    telefone_remetente: twilioFrom,
    telefone_destinatario: conversa.telefone,
    mensagem,
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: mensagem,
  })

  await supabase.from('conversas').update({
    ultima_mensagem: mensagem,
    ultima_mensagem_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
