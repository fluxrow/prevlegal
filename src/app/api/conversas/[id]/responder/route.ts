import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTwilioCredentialsByTenantId, sendWhatsApp } from '@/lib/twilio'
import { getTenantContext } from '@/lib/tenant-context'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabase()
  const { id } = await params
  const { mensagem } = await request.json()

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 })
  }

  let conversaQuery = supabase
    .from('conversas')
    .select('telefone, lead_id, tenant_id, leads!inner(responsavel_id)')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
  if (!context.isAdmin) {
    conversaQuery = conversaQuery.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data: conversa } = await conversaQuery.single()

  if (!conversa) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const creds = await getTwilioCredentialsByTenantId(context.tenantId)
  const twilioTo = conversa.telefone.startsWith('whatsapp:')
    ? conversa.telefone
    : `whatsapp:${conversa.telefone}`

  const result = await sendWhatsApp(twilioTo, mensagem, creds)
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Falha no envio Twilio' }, { status: 502 })
  }

  // Registrar mensagem manual
  await supabase.from('mensagens_inbound').insert({
    tenant_id: context.tenantId,
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
