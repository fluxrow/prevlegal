import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTwilioCredentials, sendWhatsApp } from '@/lib/twilio'

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

  const creds = await getTwilioCredentials(process.env.TENANT_SLUG)
  const twilioTo = conversa.telefone.startsWith('whatsapp:')
    ? conversa.telefone
    : `whatsapp:${conversa.telefone}`

  const result = await sendWhatsApp(twilioTo, mensagem, creds)
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Falha no envio Twilio' }, { status: 502 })
  }

  // Registrar mensagem manual
  await supabase.from('mensagens_inbound').insert({
    conversa_id: id,
    telefone_remetente: creds.whatsappNumber,
    telefone_destinatario: conversa.telefone,
    mensagem,
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: mensagem,
    twilio_sid: result.sid,
  })

  await supabase.from('conversas').update({
    ultima_mensagem: mensagem,
    ultima_mensagem_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
