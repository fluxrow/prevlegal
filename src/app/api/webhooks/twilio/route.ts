import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { getTwilioRoutingContextByWhatsAppNumber } from '@/lib/twilio'
import { triggerAgentAutoresponder } from '@/lib/agent-autoresponder'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

export async function POST(request: NextRequest) {
  const supabase = createAdminSupabase()
  const body = await request.text()
  const params = Object.fromEntries(new URLSearchParams(body))
  const from = params.From        // ex: "whatsapp:+5541999999999"
  const to = params.To            // ex: "whatsapp:+14155238886"
  const body_msg = params.Body    // texto da mensagem
  const messageSid = params.MessageSid
  const routing = await getTwilioRoutingContextByWhatsAppNumber(to)

  // 1. Validar assinatura Twilio
  const twilioSignature = request.headers.get('x-twilio-signature') || ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`

  const isValid = twilio.validateRequest(
    routing.credentials.authToken,
    twilioSignature,
    url,
    params
  )

  // Em ambiente de desenvolvimento/sandbox, aceitar mesmo sem assinatura válida
  if (!isValid && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 403 })
  }

  if (!from || !body_msg) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // 3. Normalizar telefone (remover "whatsapp:" e espaços)
  const telefoneNormalizado = from.replace('whatsapp:', '').replace(/\s/g, '')
  // Remove +55 para buscar no banco (leads armazenados sem código do país ou com formatos variados)
  const telefone10ou11 = telefoneNormalizado.replace(/^\+55/, '')

  // 4. Buscar lead pelo telefone dentro do tenant do numero de destino
  let leadQuery = supabase
    .from('leads')
    .select('id, nome, status, campanha_id, tenant_id')
    .or(`telefone.eq.${telefone10ou11},telefone_enriquecido.eq.${telefone10ou11},telefone.eq.${telefoneNormalizado},telefone_enriquecido.eq.${telefoneNormalizado}`)
    .limit(2)

  if (routing.tenantId) {
    leadQuery = applyTenantFilter(leadQuery, routing.tenantId)
  }

  const { data: leadMatches } = await leadQuery
  const lead = (leadMatches || []).length === 1 ? leadMatches?.[0] : null
  const tenantId = lead?.tenant_id || routing.tenantId || null

  // 5. Salvar mensagem inbound
  const { data: mensagemInserida, error: insertError } = await supabase
    .from('mensagens_inbound')
    .insert({
      tenant_id: tenantId,
      lead_id: lead?.id || null,
      campanha_id: lead?.campanha_id || null,
      telefone_remetente: from,
      telefone_destinatario: to,
      mensagem: body_msg,
      twilio_message_sid: messageSid,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Erro ao salvar mensagem inbound:', insertError)
  }

  // 5b. Upsert conversa (thread por telefone)
  let conversaId: string | null = null
  let conversaStatus: string = 'agente'
  let shouldResumeHuman = false

  if (mensagemInserida) {
    let conversaQuery = supabase
      .from('conversas')
      .select('id, nao_lidas, status')
      .eq('telefone', from)
    conversaQuery = applyTenantFilter(conversaQuery, tenantId)
    const { data: conversaExistente } = await conversaQuery.maybeSingle()

    if (conversaExistente) {
      conversaId = conversaExistente.id
      conversaStatus = conversaExistente.status || 'agente'
      shouldResumeHuman =
        conversaStatus === 'aguardando_cliente' || conversaStatus === 'resolvido'

      await supabase.from('conversas').update({
        status: shouldResumeHuman ? 'humano' : conversaStatus,
        ultima_mensagem: body_msg,
        ultima_mensagem_at: new Date().toISOString(),
        nao_lidas: (conversaExistente.nao_lidas || 0) + 1,
      }).eq('id', conversaExistente.id)

      await supabase.from('mensagens_inbound')
        .update({ conversa_id: conversaExistente.id })
        .eq('id', mensagemInserida.id)
    } else {
      const { data: novaConversa } = await supabase
        .from('conversas')
        .insert({
          tenant_id: tenantId,
          telefone: from,
          lead_id: lead?.id || null,
          status: 'agente',
          ultima_mensagem: body_msg,
          ultima_mensagem_at: new Date().toISOString(),
          nao_lidas: 1,
        })
        .select('id')
        .single()

      if (novaConversa) {
        conversaId = novaConversa.id
        await supabase.from('mensagens_inbound')
          .update({ conversa_id: novaConversa.id })
          .eq('id', mensagemInserida.id)
      }
    }
  }

  // 5c. Criar notificação de nova mensagem
  if (conversaId) {
    const nomeRemetente = lead?.nome || telefoneNormalizado
    await supabase.from('notificacoes').insert({
      tenant_id: tenantId,
      tipo: 'mensagem',
      titulo: `Nova mensagem de ${nomeRemetente}`,
      descricao: body_msg.slice(0, 100),
      link: `/caixa-de-entrada?conversaId=${conversaId}&telefone=${encodeURIComponent(from)}`,
      metadata: { conversa_id: conversaId, telefone: from },
    })

    // 5d. Detectar gatilhos de escalada
    const { data: config } = await getConfiguracaoAtual(
      supabase,
      tenantId,
      'agente_gatilhos_escalada',
    )

    if (config?.agente_gatilhos_escalada) {
      const gatilhos = config.agente_gatilhos_escalada
        .split('\n')
        .map((g: string) => g.trim().toLowerCase())
        .filter(Boolean)

      const msgLower = body_msg.toLowerCase()
      const gatilhoAtivado = gatilhos.find((g: string) => msgLower.includes(g))

      if (gatilhoAtivado) {
        await supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'escalada',
          titulo: `⚠️ Escalada detectada — ${nomeRemetente}`,
          descricao: `Gatilho: "${gatilhoAtivado}" — Mensagem: ${body_msg.slice(0, 80)}`,
          link: `/caixa-de-entrada?conversaId=${conversaId}&telefone=${encodeURIComponent(from)}`,
          metadata: { conversa_id: conversaId, telefone: from, gatilho: gatilhoAtivado },
        })
      }
    }
  }

  // 6. Se lead encontrado, atualizar status da mensagem na campanha e status do lead
  if (lead?.id) {
    // Atualizar última mensagem da campanha para "respondido"
    await supabase
      .from('campanha_mensagens')
      .update({
        status: 'respondido',
        respondido_at: new Date().toISOString()
      })
      .eq('lead_id', lead.id)
      .in('status', ['enviado', 'entregue', 'lido'])
      .order('created_at', { ascending: false })
      .limit(1)

    // Atualizar status do lead para "awaiting" se ainda estava em "contacted"
    if (lead.status === 'contacted') {
      await supabase
        .from('leads')
        .update({ status: 'awaiting' })
        .eq('id', lead.id)
    }

    // Incrementar total_respondidos na campanha
    if (lead.campanha_id) {
      await supabase.rpc('increment_campanha_respondidos', {
        p_campanha_id: lead.campanha_id
      })
    }

    // Stop automático de follow-up quando lead responde
    const { data: runAtiva } = await supabase
      .from('followup_runs')
      .select('id, tenant_id')
      .eq('lead_id', lead.id)
      .eq('status', 'ativo')
      .maybeSingle()

    if (runAtiva) {
      await supabase
        .from('followup_runs')
        .update({ status: 'stop_automatico', motivo_parada: 'Lead respondeu via WhatsApp' })
        .eq('id', runAtiva.id)

      await supabase.from('followup_events').insert({
        tenant_id: runAtiva.tenant_id,
        run_id: runAtiva.id,
        lead_id: lead.id,
        tipo: 'stop_lead_respondeu',
        canal: 'whatsapp',
        metadata: { mensagem: body_msg.slice(0, 200) },
      })
    }
  }

  if (mensagemInserida?.id && conversaId && !shouldResumeHuman) {
    after(async () => {
      const result = await triggerAgentAutoresponder(mensagemInserida.id)
      if (!result.ok) {
        console.error('Falha ao acionar agente automaticamente via webhook Twilio:', result.error)
      }
    })
  }

  // 7. Retornar TwiML vazio (Twilio exige resposta 200)
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    }
  )
}
