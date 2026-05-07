import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { canViewConversationForInbox } from '@/lib/inbox-visibility'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function extractLeadDocumentStoragePath(url?: string | null) {
  if (!url) return null
  const marker = '/lead-documentos/'
  const index = url.indexOf(marker)
  if (index < 0) return null
  const path = url.slice(index + marker.length).split('?')[0]?.trim()
  return path || null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!contextHasPermission(context, 'inbox_humana_manage')) {
    return NextResponse.json({ error: 'Você não tem permissão para enviar documentos manualmente' }, { status: 403 })
  }

  const supabase = createAdminSupabase()
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const documentoId = typeof body.documento_id === 'string' ? body.documento_id.trim() : ''
  const mensagemIntro = typeof body.mensagem === 'string' ? body.mensagem.trim() : ''

  if (!documentoId) {
    return NextResponse.json({ error: 'documento_id obrigatório' }, { status: 400 })
  }

  const { data: conversa } = await supabase
    .from('conversas')
    .select('id, telefone, lead_id, tenant_id, assumido_por, leads(nome, responsavel_id)')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

  if (!canViewConversationForInbox(context, conversa)) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  if (!conversa?.lead_id) {
    return NextResponse.json({ error: 'Conversa sem lead vinculado' }, { status: 409 })
  }

  const { data: documento, error: documentoError } = await supabase
    .from('lead_documentos')
    .select('id, lead_id, nome, arquivo_nome, arquivo_url')
    .eq('id', documentoId)
    .eq('lead_id', conversa.lead_id)
    .maybeSingle()

  if (documentoError) return NextResponse.json({ error: documentoError.message }, { status: 500 })
  if (!documento) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  let shareUrl = documento.arquivo_url || ''
  const storagePath = extractLeadDocumentStoragePath(documento.arquivo_url)

  if (storagePath) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from('lead-documentos')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30)

    if (signedError) {
      return NextResponse.json({ error: signedError.message }, { status: 500 })
    }

    shareUrl = signedData?.signedUrl || shareUrl
  }

  if (!shareUrl) {
    return NextResponse.json({ error: 'Documento sem link disponível para compartilhamento' }, { status: 409 })
  }

  const documentTitle = documento.nome || documento.arquivo_nome || 'documento'
  const outboundBody = [mensagemIntro, `Segue o documento "${documentTitle}":`, shareUrl]
    .filter(Boolean)
    .join('\n\n')

  const result = await sendWhatsAppMessage({
    tenantId: context.tenantId,
    to: conversa.telefone,
    body: outboundBody,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Falha no envio do documento por WhatsApp' }, { status: 502 })
  }

  await supabase.from('mensagens_inbound').insert({
    tenant_id: context.tenantId,
    lead_id: conversa.lead_id,
    conversa_id: id,
    telefone_remetente: result.from,
    telefone_destinatario: conversa.telefone,
    mensagem: outboundBody,
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: outboundBody,
    twilio_sid: result.externalMessageId,
  })

  await supabase.from('conversas').update({
    ultima_mensagem: outboundBody,
    ultima_mensagem_at: new Date().toISOString(),
  }).eq('id', id)

  await supabase.from('lead_documentos').update({
    compartilhado_cliente: true,
    compartilhado_em: new Date().toISOString(),
  }).eq('id', documentoId)

  return NextResponse.json({
    ok: true,
    documento: {
      id: documento.id,
      nome: documentTitle,
      share_url: shareUrl,
    },
  })
}
