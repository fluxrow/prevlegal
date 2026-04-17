import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

async function promoteLeadToContactedIfNew(
  supabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string | null,
  leadId: string,
) {
  if (!tenantId) return

  const { data: currentLead } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!currentLead || currentLead.status !== 'new') return

  await supabase
    .from('leads')
    .update({ status: 'contacted', updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('tenant_id', tenantId)

  const { processEventTriggers } = await import('@/lib/events/orchestrator')
  await processEventTriggers(tenantId, leadId, 'lead_status_mudou', 'contacted')
    .catch(err => console.error('[Orquestrador] Erro ao disparar gatilho após iniciar conversa:', err))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { mensagem } = await request.json()
  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  let leadQuery = supabase
    .from('leads')
    .select('id, nome, telefone, tenant_id, status')
    .eq('id', id)
  leadQuery = applyTenantFilter(leadQuery, context.tenantId)

  const { data: lead, error: leadError } = await leadQuery.maybeSingle()
  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
  }

  if (!lead.telefone?.trim()) {
    return NextResponse.json({ error: 'Lead sem telefone para iniciar conversa' }, { status: 400 })
  }

  let conversaQuery = supabase
    .from('conversas')
    .select('id')
    .eq('lead_id', lead.id)
  conversaQuery = applyTenantFilter(conversaQuery, context.tenantId)

  let { data: conversa } = await conversaQuery.limit(1).maybeSingle()

  if (!conversa) {
    const { data: criada, error: createError } = await supabase
      .from('conversas')
      .insert({
        tenant_id: context.tenantId,
        lead_id: lead.id,
        telefone: lead.telefone,
        status: 'humano',
        nao_lidas: 0,
      })
      .select('id')
      .single()

    if (createError || !criada) {
      return NextResponse.json(
        { error: createError?.message || 'Falha ao criar conversa' },
        { status: 500 },
      )
    }

    conversa = criada
  }

  const result = await sendWhatsAppMessage({
    tenantId: context.tenantId,
    to: lead.telefone,
    body: mensagem.trim(),
  })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Falha no envio WhatsApp' },
      { status: 502 },
    )
  }

  const agora = new Date().toISOString()

  if (!conversa) {
    return NextResponse.json(
      { error: 'Falha ao preparar a conversa' },
      { status: 500 },
    )
  }

  await supabase.from('mensagens_inbound').insert({
    tenant_id: context.tenantId,
    conversa_id: conversa.id,
    lead_id: lead.id,
    telefone_remetente: result.from,
    telefone_destinatario: lead.telefone,
    mensagem: mensagem.trim(),
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: mensagem.trim(),
    twilio_sid: result.externalMessageId,
  })

  await supabase
    .from('conversas')
    .update({
      status: 'humano',
      ultima_mensagem: mensagem.trim(),
      ultima_mensagem_at: agora,
      nao_lidas: 0,
      assumido_por: context.usuarioId,
      assumido_em: agora,
    })
    .eq('id', conversa.id)

  await promoteLeadToContactedIfNew(supabase, context.tenantId, lead.id)

  return NextResponse.json({
    success: true,
    conversaId: conversa.id,
    leadNome: lead.nome,
  })
}
