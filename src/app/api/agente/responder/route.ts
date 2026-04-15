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
- Nunca use markdown, listas ou asteriscos`

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
        telefone_remetente,
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
    const campanha_id = lead?.campanha_id || null
    const leadStatus = lead?.status || null

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
      const agora = new Date()
      const horaAtual = agora.toTimeString().slice(0, 5) // "HH:MM"
      const diaSemana = agora.getDay() // 0=dom, 6=sáb

      if (config.agente_apenas_dias_uteis && (diaSemana === 0 || diaSemana === 6)) {
        return NextResponse.json({ error: 'Fora do horário de atendimento (fim de semana)' }, { status: 403 })
      }

      if (horaAtual < config.agente_horario_inicio || horaAtual > config.agente_horario_fim) {
        return NextResponse.json({ error: 'Fora do horário de atendimento' }, { status: 403 })
      }
    }

    // 4. Buscar histórico da conversa (últimas 10 mensagens do lead)
    const historico: { role: 'user' | 'assistant'; content: string }[] = []

    if (mensagem.lead_id) {
      const { data: inbounds } = await supabase
        .from('mensagens_inbound')
        .select('mensagem, respondido_por_agente, resposta_agente, created_at')
        .eq('lead_id', mensagem.lead_id)
        .neq('id', mensagem_id)
        .order('created_at', { ascending: true })
        .limit(10)

      inbounds?.forEach(msg => {
        historico.push({ role: 'user', content: msg.mensagem })
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
    const response = await anthropic.messages.create({
      model: config.agente_modelo || 'claude-sonnet-4-20250514',
      max_tokens: config.agente_max_tokens || 500,
      system: systemPrompt,
      messages: historico,
    })

    const respostaTexto = response.content[0].type === 'text' ? response.content[0].text : ''

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
