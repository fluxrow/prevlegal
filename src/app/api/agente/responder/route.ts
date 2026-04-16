import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { normalizeOperationProfile } from '@/lib/operation-profile'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo'

// Prompt padrão do sistema caso o escritório não tenha configurado um personalizado
const PROMPT_PADRAO = `Você é uma consultora virtual de atendimento previdenciário.

Seu objetivo é acolher, qualificar leads e conduzir para o próximo passo mais adequado, como explicação breve, atendimento com a equipe jurídica, análise inicial ou confirmação de agenda.

CONTEXTO DO LEAD:
Nome: {nome}

INSTRUÇÕES:
- Seja cordial, direta e profissional
- Use linguagem simples, acessível para idosos
- Sempre chame o lead pelo nome quando ele estiver disponível
- Considere o histórico da conversa como fonte de verdade; não reinicie o atendimento como se fosse um contato novo se já houver contexto
- Nunca prometa valores ou resultados garantidos
- Foque em orientar o lead e avançar para o próximo passo certo
- Não cite valores, retroativos, NB ou dados sensíveis na primeira explicação
- Se o lead demonstrar interesse, explique em poucas linhas o cenário e deixe a conversa pronta para a equipe jurídica continuar
- Se recusar, agradeça e encerre educadamente
- Respostas curtas (máximo 3 linhas no WhatsApp)
- Nunca use emojis
- Nunca use markdown, listas ou asteriscos`

function stripEmojis(text: string) {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '')
    .replace(/\uFE0F/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function buildAgentContinuitySection({
  leadName,
  currentAgentType,
  operationProfile,
  activeAgentTypes,
  hasHistory,
}: {
  leadName?: string | null
  currentAgentType?: string | null
  operationProfile?: string | null
  activeAgentTypes: string[]
  hasHistory: boolean
}) {
  const normalizedProfile = normalizeOperationProfile(operationProfile || 'beneficios_previdenciarios')
  const normalizedType = String(currentAgentType || 'triagem').trim().toLowerCase()
  const downstreamTypes = activeAgentTypes.filter((tipo) => tipo !== normalizedType)
  const hasDownstream = downstreamTypes.length > 0
  const leadRef = leadName?.trim() ? leadName.trim() : 'o lead'
  const profileHint =
    normalizedProfile === 'planejamento_previdenciario'
      ? 'No playbook de planejamento, a operação pode seguir com agentes até o momento em que o especialista ou advogado assume para validar a estrutura final e colher assinatura.'
      : 'No playbook de benefícios, a abordagem deve aquecer o lead com clareza, sem despejar tese jurídica, sem falar de valores e sem parecer promessa de resultado.'

  const stageHint =
    normalizedType === 'triagem'
      ? hasDownstream
        ? `Você está na etapa de triagem. Seu papel é aquecer ${leadRef}, validar interesse e deixar o contexto pronto para os próximos agentes ativos (${downstreamTypes.join(', ')}). Não antecipe etapas demais se ainda for cedo.`
        : `Você está na etapa de triagem e não há agentes posteriores ativos no momento. Seu papel é aquecer ${leadRef}, explicar o essencial em linguagem simples e deixar a conversa pronta para a advogada responsável assumir sem perda de contexto.`
      : `Você está na etapa ${normalizedType}. Continue a conversa como parte do mesmo atendimento, assumindo que ${leadRef} já ouviu a explicação inicial e que o histórico registra o que foi falado ou combinado.`

  const continuityHint = hasHistory
    ? `Já existe histórico anterior. Nunca recomece a conversa do zero, nunca repita apresentação inicial desnecessária e sempre responda como alguém que sabe o que já foi alinhado com ${leadRef}.`
    : `Se esta for a primeira resposta efetiva da esteira, apresente o assunto com delicadeza, objetividade e sem despejar informação demais de uma vez.`

  return [
    'CONTINUIDADE OPERACIONAL:',
    '- Sempre trate o histórico da conversa como o contexto oficial do caso.',
    `- Sempre que possível, chame ${leadRef} pelo nome.`,
    `- ${profileHint}`,
    `- ${stageHint}`,
    `- ${continuityHint}`,
    '- Quando o lead demonstrar interesse real, organize a conversa para facilitar o handoff humano em vez de encerrar com resposta vaga.',
  ].join('\n')
}

function normalizeComparablePhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) return digits.slice(2)
  return digits
}

function getOperationalClock() {
  const now = new Date()
  const hourMinute = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
  }).format(now)

  return {
    hourMinute,
    isWeekend: weekday === 'Sat' || weekday === 'Sun',
  }
}

function isAnthropicCreditError(error: unknown) {
  const message = String((error as any)?.message || '').toLowerCase()
  return (
    message.includes('credit balance is too low') ||
    message.includes('purchase credits') ||
    message.includes('plans & billing')
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabase()
    const { mensagem_id } = await request.json()

    if (!mensagem_id) {
      return NextResponse.json({ error: 'mensagem_id obrigatório' }, { status: 400 })
    }

    // 1. Buscar a mensagem recebida + dados do lead
    const { data: mensagem, error: msgError } = await supabase
      .from('mensagens_inbound')
      .select(`
        id,
        mensagem,
        campanha_id,
        conversa_id,
        telefone_remetente,
        telefone_destinatario,
        lead_id,
        leads (
          nome, nb, banco, valor_rma, ganho_potencial, status, campanha_id, tenant_id
        )
      `)
      .eq('id', mensagem_id)
      .single()

    if (msgError || !mensagem) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }

    // 2. Resolver agente — prioridade: campanha → tipo/estágio → padrão tenant → config global
    const tenantId = (mensagem.leads as any)?.tenant_id || null
    const lead = mensagem.leads as any
    let campanha_id = lead?.campanha_id || mensagem.campanha_id || null
    const leadStatus = lead?.status || null

    if (!campanha_id && mensagem.lead_id) {
      const { data: ultimaCampanhaMensagem } = await supabase
        .from('campanha_mensagens')
        .select('campanha_id')
        .eq('lead_id', mensagem.lead_id)
        .order('enviado_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      campanha_id = ultimaCampanhaMensagem?.campanha_id || null
    }

    // Mapa de status do lead → tipo de agente (Fase D — roteamento por estágio)
    const STATUS_TO_TIPO: Record<string, string> = {
      novo: 'triagem',
      em_contato: 'triagem',
      qualificado: 'confirmacao_agenda',
      agendado: 'confirmacao_agenda',
      perdido: 'reativacao',
      sem_resposta: 'reativacao',
    }

    let agenteRow: any = null
    let activeAgentTypes: string[] = []

    if (tenantId) {
      const { data: agentesAtivos } = await supabase
        .from('agentes')
        .select('tipo')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)

      activeAgentTypes = Array.from(
        new Set(
          (agentesAtivos || [])
            .map((row: any) => String(row?.tipo || '').trim().toLowerCase())
            .filter(Boolean),
        ),
      )
    }

    // 2a. Agente específico da campanha do lead
    if (campanha_id) {
      const { data: campanha } = await supabase
        .from('campanhas')
        .select('agente_id')
        .eq('id', campanha_id)
        .maybeSingle()

      if (campanha?.agente_id) {
        const { data: agenteCampanha } = await supabase
          .from('agentes')
          .select('*')
          .eq('id', campanha.agente_id)
          .eq('ativo', true)
          .maybeSingle()
        if (agenteCampanha) agenteRow = agenteCampanha
      }
    }

    // 2b. Roteamento por tipo/estágio do lead (se não veio da campanha)
    if (!agenteRow && tenantId && leadStatus) {
      const tipoAlvo = STATUS_TO_TIPO[leadStatus]
      if (tipoAlvo) {
        const { data: agenteTipo } = await supabase
          .from('agentes')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('tipo', tipoAlvo)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle()
        if (agenteTipo) agenteRow = agenteTipo
      }
    }

    // 2c. Agente padrão do tenant (is_default = true — Fase C)
    if (!agenteRow && tenantId) {
      const { data: agentePadrao } = await supabase
        .from('agentes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .eq('ativo', true)
        .maybeSingle()
      if (agentePadrao) agenteRow = agentePadrao
    }

    // 2d. Config global da tabela configuracoes (fallback original)
    const { data: globalConfig } = await getConfiguracaoAtual(
      supabase,
      tenantId,
      'agente_ativo, agente_nome, agente_prompt_sistema, agente_modelo, agente_max_tokens, agente_resposta_automatica, agente_horario_inicio, agente_horario_fim, agente_apenas_dias_uteis, agente_fluxo_qualificacao, agente_exemplos_dialogo, agente_gatilhos_escalada, agente_frases_proibidas, agente_objeccoes, agente_fallback',
    )

    // Monta config unificada (agente resolvido tem prioridade sobre config global)
    const config = agenteRow ? {
      agente_ativo: agenteRow.ativo,
      agente_nome: agenteRow.nome_publico,
      agente_prompt_sistema: agenteRow.prompt_base,
      agente_modelo: agenteRow.modelo,
      agente_max_tokens: agenteRow.max_tokens,
      agente_resposta_automatica: agenteRow.resposta_automatica,
      agente_horario_inicio: agenteRow.janela_inicio,
      agente_horario_fim: agenteRow.janela_fim,
      agente_apenas_dias_uteis: agenteRow.dias_uteis_only,
      agente_fluxo_qualificacao: agenteRow.fluxo_qualificacao,
      agente_exemplos_dialogo: agenteRow.exemplos_dialogo,
      agente_gatilhos_escalada: agenteRow.gatilhos_escalada,
      agente_frases_proibidas: agenteRow.frases_proibidas,
      agente_objeccoes: agenteRow.objeccoes,
      agente_fallback: agenteRow.fallback,
      agente_tipo: agenteRow.tipo,
      agente_perfil_operacao: agenteRow.perfil_operacao,
    } : globalConfig

    if (!config?.agente_ativo) {
      return NextResponse.json({ error: 'Agente não está ativo' }, { status: 403 })
    }

    // 3. Verificar janela de horário
    if (config.agente_horario_inicio && config.agente_horario_fim) {
      const { hourMinute, isWeekend } = getOperationalClock()

      if (config.agente_apenas_dias_uteis && isWeekend) {
        return NextResponse.json({ error: 'Fora do horário de atendimento (fim de semana)' }, { status: 403 })
      }

      if (hourMinute < config.agente_horario_inicio || hourMinute > config.agente_horario_fim) {
        return NextResponse.json({ error: 'Fora do horário de atendimento' }, { status: 403 })
      }
    }

    // 4. Buscar histórico da conversa (últimas 10 mensagens do lead)
    const historico: { role: 'user' | 'assistant'; content: string }[] = []

    if (mensagem.lead_id) {
      const { data: inbounds } = await supabase
        .from('mensagens_inbound')
        .select('mensagem, telefone_remetente, telefone_destinatario, respondido_por_agente, respondido_manualmente, resposta_agente, created_at')
        .eq('lead_id', mensagem.lead_id)
        .neq('id', mensagem_id)
        .order('created_at', { ascending: true })
        .limit(10)

      const leadPhone = normalizeComparablePhone(mensagem.telefone_remetente)

      inbounds?.forEach(msg => {
        const outboundToLead =
          Boolean(leadPhone) &&
          normalizeComparablePhone(msg.telefone_destinatario) === leadPhone &&
          normalizeComparablePhone(msg.telefone_remetente) !== leadPhone

        if (outboundToLead) {
          const outboundText = (msg.resposta_agente || msg.mensagem || '').trim()
          if (outboundText) {
            historico.push({ role: 'assistant', content: outboundText })
          }
          return
        }

        const inboundText = (msg.mensagem || '').trim()
        if (inboundText) {
          historico.push({ role: 'user', content: inboundText })
        }

        if (msg.respondido_por_agente && msg.resposta_agente) {
          historico.push({ role: 'assistant', content: msg.resposta_agente })
        }
      })
    }

    // Adicionar a mensagem atual ao histórico
    historico.push({ role: 'user', content: mensagem.mensagem })

    // 5. Montar system prompt com dados do lead
    const promptBase = config.agente_prompt_sistema || PROMPT_PADRAO
    const partes = [promptBase]
    if (config.agente_fluxo_qualificacao) partes.push(`\nFLUXO DE QUALIFICAÇÃO:\n${config.agente_fluxo_qualificacao}`)
    if (config.agente_exemplos_dialogo) partes.push(`\nEXEMPLOS DE DIÁLOGO:\n${config.agente_exemplos_dialogo}`)
    if (config.agente_gatilhos_escalada) partes.push(`\nGATILHOS DE ESCALADA — quando ocorrerem, encerre e informe que a equipe jurídica responsável continuará o atendimento:\n${config.agente_gatilhos_escalada}`)
    if (config.agente_frases_proibidas) partes.push(`\nFRASES ABSOLUTAMENTE PROIBIDAS:\n${config.agente_frases_proibidas}`)
    if (config.agente_objeccoes) partes.push(`\nCOMO LIDAR COM OBJEÇÕES:\n${config.agente_objeccoes}`)
    if (config.agente_fallback) partes.push(`\nFALLBACK — quando não entender a mensagem, responda: "${config.agente_fallback}"`)
    partes.push(
      `\n${buildAgentContinuitySection({
        leadName: lead?.nome,
        currentAgentType: config.agente_tipo || agenteRow?.tipo || null,
        operationProfile: config.agente_perfil_operacao || agenteRow?.perfil_operacao || null,
        activeAgentTypes,
        hasHistory: historico.length > 1,
      })}`,
    )

    const systemPrompt = partes.join('\n')
      .replace('{nome}', lead?.nome || 'Beneficiário')
      .replace('{nb}', lead?.nb || 'N/A')
      .replace('{banco}', lead?.banco || 'N/A')
      .replace('{valor}', lead?.valor_rma ? `${Number(lead.valor_rma).toFixed(2)}` : 'N/A')
      .replace('{ganho}', lead?.ganho_potencial ? `${Number(lead.ganho_potencial).toFixed(2)}` : 'N/A')

    // 6. Chamar Claude
    let response

    try {
      response = await anthropic.messages.create({
        model: config.agente_modelo || 'claude-sonnet-4-20250514',
        max_tokens: config.agente_max_tokens || 500,
        system: systemPrompt,
        messages: historico,
      })
    } catch (modelError: any) {
      if (isAnthropicCreditError(modelError)) {
        if (mensagem.conversa_id) {
          await supabase
            .from('conversas')
            .update({
              status: 'humano',
            })
            .eq('id', mensagem.conversa_id)
        }

        if (tenantId) {
          const nomeLead = lead?.nome || 'Lead sem nome'
          await supabase.from('notificacoes').insert({
            tenant_id: tenantId,
            tipo: 'escalada',
            titulo: `Agente indisponível — ${nomeLead}`,
            descricao: 'O agente não conseguiu responder porque o saldo da API Anthropic está insuficiente. Assuma a conversa manualmente.',
            link: mensagem.conversa_id
              ? `/caixa-de-entrada?conversaId=${mensagem.conversa_id}&telefone=${encodeURIComponent(mensagem.telefone_remetente || '')}`
              : '/caixa-de-entrada',
            metadata: {
              motivo: 'anthropic_credit_low',
              conversa_id: mensagem.conversa_id || null,
              lead_id: mensagem.lead_id || null,
              mensagem_id,
            },
          })
        }
      }

      throw modelError
    }

    const respostaTextoBruta = response.content[0].type === 'text' ? response.content[0].text : ''
    const respostaTexto = stripEmojis(respostaTextoBruta)

    if (!respostaTexto) {
      return NextResponse.json({ error: 'Resposta vazia do modelo' }, { status: 500 })
    }

    // 7. Marcar mensagem como respondida + rastrear agente (Fase D)
    await supabase
      .from('mensagens_inbound')
      .update({
        respondido_por_agente: true,
        resposta_agente: respostaTexto,
        lido: true,
        lido_em: new Date().toISOString(),
        agente_respondente_id: agenteRow?.id ?? null,
      })
      .eq('id', mensagem_id)

    // 8. Se resposta automática ativa, enviar via Twilio
    if (config.agente_resposta_automatica && mensagem.telefone_remetente) {
      const result = await sendWhatsAppMessage({
        tenantId,
        to: mensagem.telefone_remetente,
        body: respostaTexto,
      })

      if (!result.success) {
        console.error('Falha ao enviar resposta automática via WhatsApp:', result.error)
      }
    }

    return NextResponse.json({
      success: true,
      resposta: respostaTexto,
      automatico: config.agente_resposta_automatica,
    })

  } catch (error: any) {
    console.error('Erro no agente:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
