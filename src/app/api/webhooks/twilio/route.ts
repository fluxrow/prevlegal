import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { getTwilioRoutingContextByWhatsAppNumber } from '@/lib/twilio'
import { triggerAgentAutoresponder } from '@/lib/agent-autoresponder'
import {
  markCampaignLeadAsResponded,
  resolveCampaignIdForLeadReply,
} from '@/lib/campaign-response-metrics'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'
import {
  buildInboundMediaPlaceholder,
  extractTwilioInboundMedia,
  persistInboundLeadDocument,
  shouldPersistInboundMediaAsLeadDocument,
} from '@/lib/whatsapp-inbound-media'

type AgentFailurePayload = {
  retry_at?: string
  horario_inicio?: string
  horario_fim?: string
  dias_uteis_only?: boolean
}

type AgentEscalationConfig = {
  agente_gatilhos_escalada?: string | null
}

type ConfiguracoesSupabase = Parameters<typeof getConfiguracaoAtual>[0]

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function hasRecentDuplicateMessage({
  supabase,
  tenantId,
  from,
  to,
  body,
  withinMs = 45000,
}: {
  supabase: ReturnType<typeof createAdminSupabase>
  tenantId: string | null
  from: string
  to: string | null
  body: string
  withinMs?: number
}) {
  let query = supabase
    .from('mensagens_inbound')
    .select('id')
    .eq('telefone_remetente', from)
    .eq('mensagem', body)
    .gte('created_at', new Date(Date.now() - withinMs).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)

  if (to) {
    query = query.eq('telefone_destinatario', to)
  }

  const { data } = await query.maybeSingle()
  return Boolean(data?.id)
}

async function registerAgentAutoresponderFailure({
  supabase,
  tenantId,
  conversaId,
  mensagemId,
  from,
  leadId,
  campanhaId,
  leadName,
  result,
}: {
  supabase: ReturnType<typeof createAdminSupabase>
  tenantId: string | null
  conversaId: string | null
  mensagemId?: string | null
  from: string
  leadId?: string | null
  campanhaId?: string | null
  leadName: string
  result: { status: number; error: string; payload?: AgentFailurePayload }
}) {
  const normalizedError = String(result.error || '').toLowerCase()
  const outsideHours = normalizedError.includes('fora do horário')
  const timeout = normalizedError.includes('timed out') || normalizedError.includes('timeout')
  const horarioInicio = String(result.payload?.horario_inicio || '').trim()
  const horarioFim = String(result.payload?.horario_fim || '').trim()
  const diasUteisOnly = Boolean(result.payload?.dias_uteis_only)
  const retryAt = String(result.payload?.retry_at || '').trim()

  let noticeBody = ''

  if (outsideHours && tenantId) {
    const faixa = horarioInicio && horarioFim ? `das ${horarioInicio} às ${horarioFim}` : 'no próximo horário de atendimento'
    const dias = diasUteisOnly ? 'em dias úteis ' : ''
    noticeBody = `Olá. No momento estamos fora do horário de atendimento. Nossa equipe retorna ${dias}${faixa}. Assim que estivermos no horário configurado, seguimos com o seu atendimento.`

    const sendResult = await sendWhatsAppMessage({
      tenantId,
      to: from,
      body: noticeBody,
    })

    if (sendResult.success) {
      await supabase.from('mensagens_inbound').insert({
        tenant_id: tenantId,
        lead_id: leadId || null,
        campanha_id: campanhaId || null,
        conversa_id: conversaId,
        telefone_remetente: sendResult.from,
        telefone_destinatario: from,
        mensagem: noticeBody,
        respondido_por_agente: true,
        respondido_manualmente: false,
        resposta_agente: noticeBody,
        twilio_sid: sendResult.externalMessageId,
        lido: true,
        lido_em: new Date().toISOString(),
      })

      if (mensagemId) {
        await supabase
          .from('mensagens_inbound')
          .update({
            agente_reprocessar_apos: retryAt || null,
            lido: true,
            lido_em: new Date().toISOString(),
          })
          .eq('id', mensagemId)
      }
    } else if (mensagemId) {
      await supabase
        .from('mensagens_inbound')
        .update({
          agente_reprocessar_apos: retryAt || null,
          lido: true,
          lido_em: new Date().toISOString(),
        })
        .eq('id', mensagemId)
    }
  } else if (outsideHours && mensagemId) {
    await supabase
      .from('mensagens_inbound')
      .update({
        agente_reprocessar_apos: retryAt || null,
        lido: true,
        lido_em: new Date().toISOString(),
      })
      .eq('id', mensagemId)
  }

  if (conversaId) {
    await supabase
      .from('conversas')
      .update({
        status: outsideHours ? 'agente' : 'humano',
        ...(noticeBody
          ? {
              ultima_mensagem: noticeBody,
              ultima_mensagem_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq('id', conversaId)
  }

  if (!tenantId) return

  const titulo = outsideHours
    ? `Agente fora do horário — aviso enviado — ${leadName}`
    : timeout
      ? `Agente não respondeu a tempo — ${leadName}`
      : `Agente indisponível — ${leadName}`

  const descricao = outsideHours
    ? 'O lead respondeu fora da janela configurada do agente e recebeu o aviso de horário. O mesmo inbound não deve voltar a disparar resposta automática duplicada.'
    : timeout
      ? 'O agente demorou além do limite interno para responder. A conversa foi devolvida para atendimento humano.'
      : `O agente não conseguiu continuar a conversa automaticamente. Motivo: ${result.error}`

  await supabase.from('notificacoes').insert({
    tenant_id: tenantId,
    tipo: 'escalada',
    titulo,
    descricao,
    link: conversaId
      ? `/caixa-de-entrada?conversaId=${conversaId}&telefone=${encodeURIComponent(from)}`
      : '/caixa-de-entrada',
    metadata: {
      motivo: outsideHours ? 'agent_outside_hours_queued' : timeout ? 'agent_timeout' : 'agent_autoresponder_failed',
      conversa_id: conversaId,
      telefone: from,
      erro: result.error,
      status: result.status,
      horario_inicio: horarioInicio || null,
      horario_fim: horarioFim || null,
      dias_uteis_only: diasUteisOnly,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = createAdminSupabase()
  const body = await request.text()
  const params = Object.fromEntries(new URLSearchParams(body))
  const from = params.From        // ex: "whatsapp:+5541999999999"
  const to = params.To            // ex: "whatsapp:+14155238886"
  const body_msg = String(params.Body || '').trim()
  const messageSid = params.MessageSid
  const routing = await getTwilioRoutingContextByWhatsAppNumber(to)
  const inboundMedia = extractTwilioInboundMedia(params)
  const hasTextBody = Boolean(body_msg)
  const mediaPlaceholder = buildInboundMediaPlaceholder(inboundMedia)
  const normalizedInboundMessage = body_msg || mediaPlaceholder

  if (!routing.tenantId) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 202,
        headers: { 'Content-Type': 'text/xml' },
      },
    )
  }

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

  if (!from || !normalizedInboundMessage) {
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
    .or(`telefone.eq.${telefone10ou11},telefone_enriquecido.eq.${telefone10ou11},conjuge_celular.eq.${telefone10ou11},conjuge_telefone.eq.${telefone10ou11},filho_celular.eq.${telefone10ou11},filho_telefone.eq.${telefone10ou11},irmao_celular.eq.${telefone10ou11},irmao_telefone.eq.${telefone10ou11},telefone.eq.${telefoneNormalizado},telefone_enriquecido.eq.${telefoneNormalizado},conjuge_celular.eq.${telefoneNormalizado},conjuge_telefone.eq.${telefoneNormalizado},filho_celular.eq.${telefoneNormalizado},filho_telefone.eq.${telefoneNormalizado},irmao_celular.eq.${telefoneNormalizado},irmao_telefone.eq.${telefoneNormalizado}`)
    .limit(2)

  if (routing.tenantId) {
    leadQuery = leadQuery.eq('tenant_id', routing.tenantId)
  }

  const { data: leadMatches } = await leadQuery
  const lead = (leadMatches || []).length === 1 ? leadMatches?.[0] : null
  const tenantId = lead?.tenant_id || routing.tenantId || null
  const resolvedCampaignId =
    lead?.campanha_id || (lead?.id ? await resolveCampaignIdForLeadReply({ supabase, leadId: lead.id }) : null)

  if (messageSid) {
    let duplicateQuery = supabase
      .from('mensagens_inbound')
      .select('id')
      .eq('twilio_message_sid', messageSid)
      .limit(1)

    duplicateQuery = tenantId
      ? duplicateQuery.eq('tenant_id', tenantId)
      : duplicateQuery.is('tenant_id', null)

    const { data: duplicateBySid } = await duplicateQuery.maybeSingle()
    if (duplicateBySid) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        },
      )
    }
  }

  const duplicateByBody = await hasRecentDuplicateMessage({
    supabase,
    tenantId,
    from,
    to,
    body: normalizedInboundMessage,
  })

  if (duplicateByBody) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      },
    )
  }

  // 5. Salvar mensagem inbound
  const { data: mensagemInserida, error: insertError } = await supabase
    .from('mensagens_inbound')
    .insert({
      tenant_id: tenantId,
      lead_id: lead?.id || null,
      campanha_id: resolvedCampaignId,
      telefone_remetente: from,
      telefone_destinatario: to,
      mensagem: normalizedInboundMessage,
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
  let shouldTriggerAgent = false

  if (mensagemInserida) {
    let conversaQuery = supabase
      .from('conversas')
      .select('id, nao_lidas, status')
      .eq('telefone', from)
    conversaQuery = tenantId ? conversaQuery.eq('tenant_id', tenantId) : conversaQuery.is('tenant_id', null)
    const { data: conversaExistente } = await conversaQuery.maybeSingle()

    if (conversaExistente) {
      conversaId = conversaExistente.id
      conversaStatus = conversaExistente.status || 'agente'
      shouldResumeHuman =
        conversaStatus === 'aguardando_cliente' || conversaStatus === 'resolvido'
      const nextConversationStatus = shouldResumeHuman ? 'humano' : conversaStatus

      await supabase.from('conversas').update({
        status: nextConversationStatus,
        ultima_mensagem: normalizedInboundMessage,
        ultima_mensagem_at: new Date().toISOString(),
        nao_lidas: (conversaExistente.nao_lidas || 0) + 1,
      }).eq('id', conversaExistente.id)
      shouldTriggerAgent = nextConversationStatus === 'agente' && hasTextBody

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
          ultima_mensagem: normalizedInboundMessage,
          ultima_mensagem_at: new Date().toISOString(),
          nao_lidas: 1,
        })
        .select('id')
        .single()

      if (novaConversa) {
        conversaId = novaConversa.id
        shouldTriggerAgent = hasTextBody
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
      descricao: normalizedInboundMessage.slice(0, 100),
      link: `/caixa-de-entrada?conversaId=${conversaId}&telefone=${encodeURIComponent(from)}`,
      metadata: { conversa_id: conversaId, telefone: from },
    })

    // 5d. Detectar gatilhos de escalada
    const configuracoesSupabase = supabase as unknown as ConfiguracoesSupabase
    const { data: config } = await getConfiguracaoAtual<AgentEscalationConfig>(
      configuracoesSupabase,
      tenantId,
      'agente_gatilhos_escalada',
    )

    if (config?.agente_gatilhos_escalada) {
      const gatilhos = config.agente_gatilhos_escalada
        .split('\n')
        .map((g: string) => g.trim().toLowerCase())
        .filter(Boolean)

      const msgLower = normalizedInboundMessage.toLowerCase()
      const gatilhoAtivado = gatilhos.find((g: string) => msgLower.includes(g))

      if (gatilhoAtivado) {
        await supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'escalada',
          titulo: `⚠️ Escalada detectada — ${nomeRemetente}`,
          descricao: `Gatilho: "${gatilhoAtivado}" — Mensagem: ${normalizedInboundMessage.slice(0, 80)}`,
          link: `/caixa-de-entrada?conversaId=${conversaId}&telefone=${encodeURIComponent(from)}`,
          metadata: { conversa_id: conversaId, telefone: from, gatilho: gatilhoAtivado },
        })
      }
    }
  }

  // 6. Se lead encontrado, atualizar status da mensagem na campanha e status do lead
  if (lead?.id) {
    // Atualizar status do lead para "awaiting" se ainda estava em "contacted"
    if (lead.status === 'contacted') {
      await supabase
        .from('leads')
        .update({ status: 'awaiting' })
        .eq('id', lead.id)
    }

    await markCampaignLeadAsResponded({
      supabase,
      campaignId: resolvedCampaignId,
      leadId: lead.id,
    })

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
        metadata: { mensagem: normalizedInboundMessage.slice(0, 200) },
      })
    }
  }

  if (lead?.id && inboundMedia.some(shouldPersistInboundMediaAsLeadDocument)) {
    after(async () => {
      const auth = Buffer.from(
        `${routing.credentials.accountSid}:${routing.credentials.authToken}`,
      ).toString('base64')

      for (const media of inboundMedia) {
        if (!shouldPersistInboundMediaAsLeadDocument(media)) continue

        const result = await persistInboundLeadDocument({
          supabase,
          tenantId,
          leadId: lead.id,
          media,
          description: 'Recebido via WhatsApp (Twilio)',
          headers: {
            Authorization: `Basic ${auth}`,
          },
        })

        if (!result.ok && result.reason !== 'ineligible') {
          console.error('Falha ao persistir mídia inbound Twilio em lead_documentos:', {
            leadId: lead.id,
            reason: result.reason,
            error: 'error' in result ? result.error : null,
          })
        }
      }
    })
  }

  if (mensagemInserida?.id && conversaId && shouldTriggerAgent) {
    after(async () => {
      const result = await triggerAgentAutoresponder(mensagemInserida.id)
      if (!result.ok) {
        console.error('Falha ao acionar agente automaticamente via webhook Twilio:', result.error)
        await registerAgentAutoresponderFailure({
          supabase,
          tenantId,
          conversaId,
          mensagemId: mensagemInserida.id,
          from,
          leadId: lead?.id || null,
          campanhaId: resolvedCampaignId,
          leadName: lead?.nome || telefoneNormalizado,
          result: {
            status: result.status,
            error: result.error || 'Erro desconhecido ao acionar agente via Twilio',
            payload: result.payload ?? undefined,
          },
        })
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
