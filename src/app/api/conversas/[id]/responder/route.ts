import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'
import { canViewConversationForInbox } from '@/lib/inbox-visibility'

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
  if (!contextHasPermission(context, 'inbox_humana_manage')) {
    return NextResponse.json({ error: 'Você não tem permissão para responder manualmente' }, { status: 403 })
  }

  const supabase = createAdminSupabase()
  const { id } = await params
  const { mensagem } = await request.json()

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 })
  }

  const { data: conversa } = await supabase
    .from('conversas')
    .select('telefone, lead_id, tenant_id, assumido_por, leads!inner(responsavel_id)')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

  if (!canViewConversationForInbox(context, conversa)) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const conversaSelecionada = conversa!

  const result = await sendWhatsAppMessage({
    tenantId: context.tenantId,
    to: conversaSelecionada.telefone,
    body: mensagem,
  })
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Falha no envio WhatsApp' }, { status: 502 })
  }

  // Registrar mensagem manual
  await supabase.from('mensagens_inbound').insert({
    tenant_id: context.tenantId,
    conversa_id: id,
    telefone_remetente: result.from,
    telefone_destinatario: conversaSelecionada.telefone,
    mensagem,
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: mensagem,
    twilio_sid: result.externalMessageId,
  })

  await supabase.from('conversas').update({
    ultima_mensagem: mensagem,
    ultima_mensagem_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
