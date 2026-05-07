import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { normalizeOperationProfile } from '@/lib/operation-profile'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'
import { getPlanningKnowledgeBlock } from '@/lib/agent-knowledge'
import { logLlmUsage } from '@/lib/agent-llm-logger'
import { repairCommonMojibake } from '@/lib/text-repair'
import { buildConversationTimelineRows } from '@/lib/conversation-message-timeline'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type ConfiguracoesSupabase = Parameters<typeof getConfiguracaoAtual>[0]

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo'
const AGENT_RESPONSE_DELAY_MS = Math.max(0, Number(process.env.AGENT_RESPONSE_DELAY_MS || 4500))
const AGENT_COALESCE_MESSAGE_GAP_MS = 10000
const AGENT_COALESCE_WAIT_MS = 15000
const AGENT_FLOOD_WINDOW_MS = 60000
const AGENT_FLOOD_LIMIT = 5
const AGENT_FLOOD_SILENCE_MS = 30000
const AGENT_SUMMARY_BATCH_SIZE = 10
const KNOWLEDGE_WARNING_LOGGED = new Set<string>()
const LOCAL_TEST_PLANNING_SPECIALISTS = 'Marcos ou Diogo'

type HistoricoEntry = { role: 'user' | 'assistant'; content: string }

type InboundMessageRow = {
  id: string
  mensagem: string | null
  telefone_remetente: string | null
  telefone_destinatario: string | null
  respondido_por_agente: boolean | null
  respondido_manualmente: boolean | null
  resposta_agente: string | null
  agente_reprocessar_apos?: string | null
  lido_em?: string | null
  created_at: string
}

type LeadContextRow = {
  nome: string | null
  nb: string | null
  banco: string | null
  valor_rma: number | null
  ganho_potencial: number | null
  status: string | null
  campanha_id: string | null
  tenant_id: string | null
}

type InboundMessageWithLead = {
  id: string
  mensagem: string | null
  campanha_id: string | null
  conversa_id: string | null
  telefone_remetente: string | null
  telefone_destinatario: string | null
  created_at: string
  lead_id: string | null
  leads: LeadContextRow | LeadContextRow[] | null
}

type AgentRow = {
  id: string
  ativo: boolean | null
  nome_publico: string | null
  prompt_base: string | null
  modelo: string | null
  max_tokens: number | null
  resposta_automatica: boolean | null
  janela_inicio: string | null
  janela_fim: string | null
  dias_uteis_only: boolean | null
  fluxo_qualificacao: string | null
  exemplos_dialogo: string | null
  gatilhos_escalada: string | null
  frases_proibidas: string | null
  objeccoes: string | null
  fallback: string | null
  tipo: string | null
  perfil_operacao: string | null
}

type AgentRuntimeConfig = {
  agente_ativo: boolean | null
  agente_nome: string | null
  agente_prompt_sistema: string | null
  agente_modelo: string | null
  agente_max_tokens: number | null
  agente_resposta_automatica: boolean | null
  agente_horario_inicio: string | null
  agente_horario_fim: string | null
  agente_apenas_dias_uteis: boolean | null
  agente_fluxo_qualificacao: string | null
  agente_exemplos_dialogo: string | null
  agente_gatilhos_escalada: string | null
  agente_frases_proibidas: string | null
  agente_objeccoes: string | null
  agente_fallback: string | null
  agente_tipo?: string | null
  agente_perfil_operacao: string | null
}

type AnthropicUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>
  usage?: AnthropicUsage
  stop_reason?: string | null
}

function shouldUsePagliucaPlanningSpecialists(promptHint?: string | null) {
  const normalizedHint = normalizeComparableMessageText(promptHint || '')

  return (
    normalizedHint.includes('ana terra pagliuca') ||
    normalizedHint.includes('dra ana') ||
    normalizedHint.includes('conselho da mulher empresaria') ||
    normalizedHint.includes(' cme ')
  )
}

function getPlanningHumanHandoffContext(promptHint?: string | null) {
  const explicit = String(process.env.PLANNING_HUMAN_SPECIALISTS || '').trim()
  const label =
    explicit ||
    (shouldUsePagliucaPlanningSpecialists(promptHint) ? LOCAL_TEST_PLANNING_SPECIALISTS : '') ||
    (!process.env.VERCEL ? LOCAL_TEST_PLANNING_SPECIALISTS : '')

  if (!label) {
    return {
      named: false,
      analysisReference: 'o advogado ou especialista responsável da equipe',
      stageReference: 'a advogada ou o advogado responsável assumir',
      escalationContinuation: 'a equipe jurídica responsável continuará o atendimento',
      inviteReference: 'o advogado ou especialista responsável da equipe',
    }
  }

  return {
    named: true,
    analysisReference: `${label}, advogados responsáveis da equipe`,
    stageReference: `${label} seguirem com você`,
    escalationContinuation: `${label} seguirão com o atendimento`,
    inviteReference: label,
  }
}

function normalizePlanningHumanAttribution(text: string, promptHint?: string | null) {
  const handoff = getPlanningHumanHandoffContext(promptHint)
  if (!handoff.named) return text

  return text
    .replace(
      /\bA Dra\. Ana conduz essa análise pessoalmente\.?/giu,
      `O diagnóstico técnico individual fica com ${handoff.analysisReference}.`,
    )
    .replace(
      /\bA Dra\. Ana conduz essa análise\b/giu,
      `O diagnóstico técnico individual fica com ${handoff.analysisReference}`,
    )
    .replace(
      /\bVou organizar isso com a Dra\. Ana\.?/giu,
      `Vou organizar isso com ${handoff.inviteReference}.`,
    )
    .replace(
      /\bEssas informações vão ajudar a Dra\. Ana\b/giu,
      `Essas informações vão ajudar ${handoff.inviteReference}`,
    )
    .replace(
      /\bVocê gostaria que eu agendasse uma conversa com ela\b/giu,
      `Você gostaria que eu organizasse uma conversa com ${handoff.inviteReference}`,
    )
    .replace(
      /\bcom ela para apresentar sua situação específica\b/giu,
      `com ${handoff.inviteReference} para olhar sua situação específica`,
    )
    .replace(
      /\bpara ela já ter uma base do seu cenário\b/giu,
      `para ${handoff.inviteReference} já terem uma base do seu cenário`,
    )
}

function buildAnthropicCreditFallbackMessage({
  operationProfile,
  planningHumanHandoff,
}: {
  operationProfile: string
  planningHumanHandoff: ReturnType<typeof getPlanningHumanHandoffContext>
}) {
  if (normalizeOperationProfile(operationProfile) === 'planejamento_previdenciario') {
    return planningHumanHandoff.named
      ? `Recebi sua mensagem. Vou encaminhar seu atendimento para ${planningHumanHandoff.inviteReference} seguirem com você por aqui assim que possível.`
      : 'Recebi sua mensagem. Vou encaminhar seu atendimento para a equipe jurídica responsável seguir com você por aqui assim que possível.'
  }

  return 'Recebi sua mensagem. Vou encaminhar seu atendimento para a equipe responsável seguir com você por aqui assim que possível.'
}

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

function normalizeComparableMessageText(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeAssistantLine(line: string) {
  return line
    .replace(/^\s*[-•*]+\s*/u, '')
    .replace(/^\s*\d+[.)]\s*/u, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/[–—]/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function sanitizeWhatsAppResponseText(text: string) {
  const normalized = stripEmojis(repairCommonMojibake(text || ''))
    .replace(/\r/g, '')

  const cleanedLines = normalized
    .split('\n')
    .map((line) => normalizeAssistantLine(line))
    .reduce<string[]>((acc, line) => {
      if (!line) {
        if (acc.at(-1) !== '') acc.push('')
        return acc
      }

      acc.push(line)
      return acc
    }, [])

  return cleanedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function startsWithGreeting(text: string) {
  const normalized = normalizeComparableMessageText(text)
  return /^(oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem|tudo certo)\b/u.test(normalized)
}

function includesSocialCheckIn(text: string) {
  const normalized = normalizeComparableMessageText(text)
  return /(tudo bem|tudo bom|como vai|como voce esta|como você esta|tudo certo)\b/u.test(normalized)
}

function stripLeadingGreeting(text: string) {
  return text
    .replace(/^(oi|olá|ola|bom dia|boa tarde|boa noite)[,\s!.-]*/iu, '')
    .replace(/^(tudo bem( por aqui)?|tudo certo( por aqui)?|tudo ótimo por aqui|tudo otimo por aqui|por aqui tudo bem|por aqui tudo certo)[,\s!.-]*/iu, '')
    .trim()
}

function isBareGreetingReply(text: string) {
  return /^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem( por aqui)?|tudo certo( por aqui)?)[.!?]*$/iu.test(
    String(text || '').trim(),
  )
}

function looksLikeRetiredPoliteDecline(text: string) {
  const normalized = normalizeComparableMessageText(text)
  return (
    normalized.includes('ja estou aposentad') ||
    normalized.includes('ja sou aposentad') ||
    normalized.includes('ja me aposentei') ||
    normalized.includes('ja solicitei revisao') ||
    normalized.includes('ja entrei com revisao') ||
    normalized.includes('fica para outro momento') ||
    normalized.includes('agradeco o contato') ||
    normalized.includes('obrigada pelo contato')
  )
}

function buildPoliteRetiredClosure(operationProfile: string) {
  if (normalizeOperationProfile(operationProfile) === 'planejamento_previdenciario') {
    return 'Entendo perfeitamente. Que bom que você já está com isso encaminhado. Se em algum momento surgir alguma dúvida sobre a sua revisão ou se quiser uma segunda opinião técnica, seguimos à disposição por aqui.'
  }

  return 'Entendo perfeitamente. Que bom que você já está com isso encaminhado. Se em algum momento surgir alguma dúvida sobre o benefício ou se quiser retomar a conversa, seguimos à disposição por aqui.'
}

function softenPlanningGreeting({
  text,
  latestLeadMessage,
  previousAssistant,
  isFirstReplyAfterCampaign,
}: {
  text: string
  latestLeadMessage: string
  previousAssistant: string
  isFirstReplyAfterCampaign: boolean
}) {
  if (!isFirstReplyAfterCampaign) return text

  const leadStartedWithGreeting = startsWithGreeting(latestLeadMessage)
  const leadAskedSocialCheckIn = includesSocialCheckIn(latestLeadMessage)
  const assistantAlreadyGreeted = startsWithGreeting(previousAssistant)

  if (!leadStartedWithGreeting && !assistantAlreadyGreeted) {
    return text
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return text

  const nextParagraphs = [...paragraphs]

  if (assistantAlreadyGreeted && startsWithGreeting(nextParagraphs[0] || '')) {
    const stripped = stripLeadingGreeting(nextParagraphs[0] || '')
    nextParagraphs[0] = stripped || nextParagraphs[0]
  }

  if (
    nextParagraphs.length > 0 &&
    /^(obrigada|obrigado|grata|agradeco|agradeço)[.!]?$/iu.test(nextParagraphs[0] || '')
  ) {
    nextParagraphs.shift()
  }

  if (
    leadAskedSocialCheckIn &&
    nextParagraphs.length > 0 &&
    !/^(tudo bem|tudo certo|tudo ótimo|tudo otimo|por aqui tudo)/iu.test(nextParagraphs[0] || '')
  ) {
    nextParagraphs.unshift('Tudo bem por aqui, obrigada.')
  }

  return sanitizeWhatsAppResponseText(nextParagraphs.join('\n\n'))
}

function endsLikeIncompleteThought(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (/[.!?)]$/.test(trimmed)) return false

  const lastToken = trimmed.split(/\s+/).at(-1) || ''
  if (!lastToken) return false

  if (/^[A-Za-zÀ-ÿ]{1,4}$/u.test(lastToken)) return true
  if (/^(para|pra|com|sem|que|de|da|do|em|ou|e|mas|por)$/iu.test(lastToken)) return true

  return false
}

function countParagraphs(text: string) {
  return text.split(/\n\s*\n/).filter((chunk) => chunk.trim()).length
}

function tokenizeForOverlap(text: string) {
  return new Set(
    normalizeComparableMessageText(text)
      .split(' ')
      .filter((token) => token.length >= 4),
  )
}

function hasHighContentOverlap(current: string, previous: string) {
  const currentTokens = tokenizeForOverlap(current)
  const previousTokens = tokenizeForOverlap(previous)

  if (currentTokens.size < 6 || previousTokens.size < 6) return false

  let overlap = 0
  for (const token of currentTokens) {
    if (previousTokens.has(token)) overlap += 1
  }

  return overlap / currentTokens.size >= 0.45
}

function findPreviousAssistantMessage(historico: HistoricoEntry[]) {
  for (let index = historico.length - 1; index >= 0; index -= 1) {
    const entry = historico[index]
    if (entry.role === 'assistant' && entry.content.trim()) {
      return entry.content.trim()
    }
  }

  return ''
}

function needsPlanningRewrite({
  text,
  previousAssistant,
  isFirstReplyAfterCampaign,
  wasCutByTokenLimit,
}: {
  text: string
  previousAssistant: string
  isFirstReplyAfterCampaign: boolean
  wasCutByTokenLimit: boolean
}) {
  const hasMarkdownArtifacts = /[*•`_]/.test(text) || /\n\s*(?:[-•]|\d+[.)])\s/u.test(text)
  const tooLong = text.length > (isFirstReplyAfterCampaign ? 520 : 700)
  const tooManyParagraphs = countParagraphs(text) > (isFirstReplyAfterCampaign ? 3 : 4)
  const repeated = previousAssistant
    ? hasHighContentOverlap(text, previousAssistant)
    : false
  const truncated = wasCutByTokenLimit || endsLikeIncompleteThought(text)

  return hasMarkdownArtifacts || tooLong || tooManyParagraphs || repeated || truncated
}

function findRecentDuplicateInboundMessage(
  rowsDesc: InboundMessageRow[],
  currentMessageId: string,
) {
  const rowsAsc = [...rowsDesc].reverse()
  const currentIndex = rowsAsc.findIndex((row) => row.id === currentMessageId)
  if (currentIndex <= 0) return null

  const currentRow = rowsAsc[currentIndex]
  const currentBody = normalizeComparableMessageText(currentRow.mensagem)
  const currentCreatedAt = getCreatedAtMs(currentRow.created_at)
  if (!currentBody || !currentCreatedAt) return null

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const previousRow = rowsAsc[index]
    const previousCreatedAt = getCreatedAtMs(previousRow.created_at)

    if (!previousCreatedAt || currentCreatedAt - previousCreatedAt > 120000) {
      break
    }

    if (
      normalizeComparableMessageText(previousRow.mensagem) === currentBody &&
      previousRow.respondido_por_agente &&
      previousRow.resposta_agente?.trim()
    ) {
      return previousRow
    }
  }

  return null
}

async function rewritePlanningReplyForWhatsApp({
  anthropicClient,
  latestLeadMessage,
  previousAssistant,
  draft,
  isFirstReplyAfterCampaign,
}: {
  anthropicClient: Anthropic
  latestLeadMessage: string
  previousAssistant: string
  draft: string
  isFirstReplyAfterCampaign: boolean
}) {
  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: isFirstReplyAfterCampaign ? 220 : 280,
    system: [
      'Você reescreve respostas de WhatsApp de uma consultora de planejamento previdenciário.',
      'Objetivo: soar humana, clara e natural.',
      'Escreva em português do Brasil.',
      'Sem markdown, sem asteriscos, sem bullets, sem listas numeradas, sem títulos, sem travessões.',
      'Use no máximo 3 blocos curtos se for primeiro retorno após campanha, ou 4 blocos curtos nos demais casos.',
      'Faça no máximo 1 pergunta principal.',
      'Não repita o que a própria consultora acabou de dizer na mensagem anterior.',
      'Não invente análise individual, não dê parecer fechado, não recomende estratégia definitiva e não cite valores específicos sem documento.',
      'Se o rascunho estiver cortado, complete a ideia de forma curta e natural, sem alongar.',
      'Mantenha só o essencial para avançar a conversa.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [
          `ÚLTIMA MENSAGEM DO LEAD:\n${latestLeadMessage}`,
          previousAssistant ? `ÚLTIMA MENSAGEM DA CONSULTORA:\n${previousAssistant}` : '',
          `RASCUNHO A REESCREVER:\n${draft}`,
          'Reescreva agora.',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
  })

  return sanitizeWhatsAppResponseText(getAnthropicText(response as AnthropicResponse))
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message || '')
  }
  return String(error || '')
}

function getAnthropicText(response: AnthropicResponse | null | undefined) {
  const firstBlock = response?.content?.[0]
  return firstBlock?.type === 'text' ? firstBlock.text || '' : ''
}

function getUsageSnapshot(response: AnthropicResponse | null | undefined) {
  return response?.usage || {}
}

function getStopReason(response: AnthropicResponse | null | undefined) {
  return response?.stop_reason || null
}

function classifyLatestLeadTurn(message: string) {
  const normalized = String(message || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (!normalized) return 'mensagem_vazia'

  if (
    /^(sim|tenho sim|claro|claro que sim|quero sim|aceito|pode|pode sim|pode explicar|me explica|me explique|pode me explicar|quero saber|quero saber sim|pode falar|pode mandar|tenho interesse|tenho interesse sim)$/.test(
      normalized,
    )
  ) {
    return 'confirmacao_curta'
  }

  if (
    /^(oi|ola|olá|bom dia|boa tarde|boa noite)( bianca)?([,!.\s-]+(tudo bem|tudo bom|como vai|como voce esta|como você esta))?\??$/.test(
      normalized,
    ) ||
    /^(tudo bem|tudo bom|como vai)( bianca)?\??$/.test(normalized)
  ) {
    return 'saudacao_curta'
  }

  if (
    normalized.includes('explica') ||
    normalized.includes('explicar') ||
    normalized.includes('como funciona') ||
    normalized.includes('qual revisao') ||
    normalized.includes('qual readequacao') ||
    normalized.includes('mais informacao') ||
    normalized.includes('mais informacoes')
  ) {
    return 'pedido_de_explicacao'
  }

  if (
    normalized.includes('tenho interesse') ||
    normalized.includes('quero seguir') ||
    normalized.includes('quero prosseguir') ||
    normalized.includes('vamos seguir') ||
    normalized.includes('pode continuar')
  ) {
    return 'interesse_explicito'
  }

  if (
    normalized.includes('documento') ||
    normalized.includes('documentos') ||
    normalized.includes('contrato') ||
    normalized.includes('assinar') ||
    normalized.includes('assinatura')
  ) {
    return 'documentos_ou_contrato'
  }

  return 'mensagem_livre'
}

function normalizeIntentText(message: string | null | undefined) {
  return String(message || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function shouldMoveBenefitsConversationToAwaitingCustomer({
  operationProfile,
  latestLeadIntent,
  latestLeadMessage,
  historico,
}: {
  operationProfile?: string | null
  latestLeadIntent: string
  latestLeadMessage: string
  historico: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  if (normalizeOperationProfile(operationProfile || 'beneficios_previdenciarios') !== 'beneficios_previdenciarios') {
    return false
  }

  if (!['confirmacao_curta', 'interesse_explicito'].includes(latestLeadIntent)) {
    return false
  }

  const normalizedLatest = normalizeIntentText(latestLeadMessage)
  const confirmsYes =
    /^(sim|s|isso|isso mesmo|pode ser|pode ser sim|neste numero|nesse numero|pode seguir|claro|ok|okay|pode)$/.test(normalizedLatest) ||
    normalizedLatest.includes('mesmo numero') ||
    normalizedLatest.includes('neste numero') ||
    normalizedLatest.includes('nesse numero')

  if (!confirmsYes) {
    return false
  }

  const previousAssistant = [...historico]
    .reverse()
    .find((entry) => entry.role === 'assistant')

  const normalizedAssistant = normalizeIntentText(previousAssistant?.content || '')

  return (
    normalizedAssistant.includes('dra. jessica') &&
    (
      normalizedAssistant.includes('entrar em contato') ||
      normalizedAssistant.includes('dar continuidade') ||
      normalizedAssistant.includes('pode ser neste mesmo numero') ||
      normalizedAssistant.includes('pode ser neste mesmo número') ||
      normalizedAssistant.includes('neste mesmo numero do whatsapp') ||
      normalizedAssistant.includes('neste mesmo número do whatsapp') ||
      normalizedAssistant.includes('posso passar o seu contato')
    )
  )
}

function buildImmediateResponseDirective({
  latestLeadMessage,
  latestLeadIntent,
  operationProfile,
  isFirstReplyAfterCampaign,
  planningPromptHint,
}: {
  latestLeadMessage: string
  latestLeadIntent: string
  operationProfile?: string | null
  isFirstReplyAfterCampaign: boolean
  planningPromptHint?: string | null
}) {
  const normalizedProfile = normalizeOperationProfile(operationProfile || 'beneficios_previdenciarios')
  const planningHumanHandoff = getPlanningHumanHandoffContext(planningPromptHint)

  const shared = [
    'RESPOSTA IMEDIATA OBRIGATÓRIA:',
    `- A última mensagem do lead que você precisa responder agora é: "${latestLeadMessage}"`,
    `- A intenção atual do lead foi classificada como: ${latestLeadIntent}.`,
    '- Responda principalmente a essa última mensagem. Não responda saudações antigas nem perguntas antigas se elas não forem mais a prioridade atual da conversa.',
    '- Nunca reinicie a conversa como se fosse um novo contato.',
    '- Nunca repita a apresentação inicial da campanha se o lead já respondeu antes.',
    '- Nunca use emojis.',
  ]

  if (normalizedProfile === 'planejamento_previdenciario') {
    return [
      ...shared,
      '- Em planejamento previdenciário, responda como uma consultora técnica e segura, sem telemarketing e sem inventar análise individual.',
      '- Você atende apenas o titular do planejamento. Se perceber que está falando com terceiro, peça de forma cordial que o próprio titular siga a conversa.',
      '- Se o lead pedir explicação, explique o conceito pedido em linguagem simples e continue para o próximo passo da esteira.',
      '- Nunca diga que a sócia ou fundadora do escritório é quem pessoalmente conduz o diagnóstico técnico individual só porque o nome dela apareceu na abordagem comercial.',
      planningHumanHandoff.named
        ? `- Quando falar da etapa humana do planejamento, diga com naturalidade que a análise individual e a validação final ficam com ${planningHumanHandoff.analysisReference}.`
        : '- Quando falar da etapa humana do planejamento, use formulações como "advogado responsável da equipe", "especialista responsável" ou "equipe jurídica responsável".',
      '- Em WhatsApp, priorize clareza com brevidade. Respostas longas demais reduzem leitura e conversão.',
      '- Em WhatsApp, evite subtítulos em markdown, listas longas e resposta com cara de parecer técnico escrito. Prefira blocos curtos de conversa.',
      '- Em WhatsApp, nunca use asteriscos, bullets, travessões, enumeração tipo 1/2/3, nem termos com cara de relatório ou apresentação.',
      '- Antes de responder, confira o que você mesma acabou de dizer no histórico e não repita a explicação com palavras diferentes. Se o lead trouxe pouco fato novo, reconheça brevemente e avance com uma pergunta útil.',
      '- Se o lead só abrir com uma saudação como "boa tarde, tudo bem?", responda com 1 reconhecimento social curto e siga com uma ponte leve antes de entrar no tema. Não despeje o planejamento de uma vez na mesma respiração.',
      ...(latestLeadIntent === 'saudacao_curta'
        ? [
            '- A mensagem do lead é basicamente uma saudação curta. Sua primeira frase deve ser uma aproximação humana breve, e só a segunda entra no contexto do planejamento.',
            '- Evite começar essa resposta com explicação técnica longa. Prefira uma ponte curta como "Tudo bem por aqui, obrigada." antes de retomar o motivo do contato.',
          ]
        : []),
      ...(isFirstReplyAfterCampaign
        ? [
            '- Este é o primeiro retorno do lead após a abordagem ativa do escritório.',
            '- Não diga que o lead já tinha interesse anterior, que já demonstrou interesse antes, nem que o histórico mostra intenção antiga, a menos que isso esteja literalmente escrito em mensagens anteriores do próprio lead.',
            '- Se a resposta do lead for só uma saudação curta, primeiro retome com naturalidade o motivo do contato em no máximo 2 frases curtas e só depois faça 1 pergunta diagnóstica curta.',
            '- Se você já saudou o lead na mensagem de disparo, não repita "bom dia", "boa tarde" ou "boa noite" no primeiro retorno. Se quiser ser cordial, use algo como "Tudo bem por aqui, obrigada." e siga.',
            '- No primeiro retorno após campanha, não presuma profissão, porte da empresa nem contexto societário antes de o lead dizer isso. Se ainda não souber o perfil, fale de forma neutra.',
            '- Nessa retomada inicial, fale do assunto antes de perguntar, mas sem textão: explique brevemente por que planejamento previdenciário pode ser relevante e convide o lead a dizer o perfil profissional dele.',
            '- No primeiro retorno após campanha, responda idealmente em 2 ou 3 blocos curtos de WhatsApp. Use 4 apenas se ficar realmente necessário.',
            '- No primeiro retorno após campanha, não use lista numerada, não enumere todas as etapas do serviço e não despeje detalhes técnicos demais de uma vez.',
            '- No primeiro retorno após campanha, priorize esta estrutura: 1 frase dizendo o que é o planejamento; 1 exemplo concreto de situação ou impacto, sem números específicos; 1 pergunta objetiva para qualificar.',
            '- No primeiro retorno após campanha, prefira no máximo 1 pergunta principal. Só faça uma segunda pergunta se ela for curta e indispensável para entender o perfil do lead.',
          ]
        : []),
      '- O handoff humano acontece por etapa de processo: análise individual de CNIS/documentos, cálculo formal/projeção, aceite do diagnóstico técnico pago, pedido expresso para falar com advogado ou momento de contrato/assinatura.',
    ].join('\n')
  }

  if (latestLeadIntent === 'confirmacao_curta' || latestLeadIntent === 'pedido_de_explicacao' || latestLeadIntent === 'interesse_explicito') {
    return [
      ...shared,
      '- Em benefícios previdenciários, parta do contexto de que a equipe já identificou uma possibilidade de revisão ou readequação do benefício.',
      '- Não pergunte novamente se o lead tem interesse.',
      '- Não volte para triagem genérica e não pergunte sobre benefício negado, cortado ou valor que deveria ser maior.',
      '- Não comece com "Oi, tudo bem" nem com agradecimento social se o lead não abriu uma conversa social agora.',
      '- Explique em poucas linhas o cenário já identificado e avance um passo concreto da conversa.',
      '- Depois da explicação, faça no máximo uma pergunta útil de continuidade.',
      '- Não diga que agora vai analisar para descobrir se existe direito. Neste playbook, o cenário já foi previamente identificado e o seu papel é informar com clareza e conduzir para o próximo passo.',
    ].join('\n')
  }

  return [
    ...shared,
    '- Em benefícios previdenciários, mantenha a continuidade do contexto já identificado e avance a conversa com naturalidade.',
  ].join('\n')
}

function buildBenefitsOperationalKnowledge() {
  return [
    'CONHECIMENTO OPERACIONAL — READEQUAÇÃO DO TETO:',
    '- Neste playbook, o lead já foi previamente mapeado para uma possibilidade de revisão ou readequação do teto do benefício.',
    '- O objetivo da conversa não é descobrir do zero se existe um problema no benefício.',
    '- O objetivo é informar o lead com clareza, responder dúvidas iniciais de forma segura e encaminhar a continuidade com a Dra. Jessica.',
    '- Explique em linguagem simples que existe uma possibilidade já identificada de ajuste do benefício ligada à limitação do teto previdenciário na concessão.',
    '- Se o lead pedir explicação, você pode dizer em poucas linhas que se trata de um cenário em que benefícios concedidos em determinados períodos ficaram limitados ao teto da época, e depois as mudanças constitucionais abriram espaço para readequação.',
    '- Você pode mencionar que o tema já possui entendimento consolidado pelos tribunais superiores, sem despejar números de recurso, valores ou juridiquês excessivo logo de cara.',
    '- Não fale em cifras, retroativos ou valores estimados na explicação inicial.',
    '- Não transforme a conversa em aula técnica longa. Quebre a explicação em blocos curtos e naturais.',
    '- Se o lead confirmar interesse, o próximo passo principal é marcar ou encaminhar a conversa com a Dra. Jessica para aprofundamento.',
    '- O agente deve ajudar com dúvidas prévias, mas sem fingir parecer jurídico individual.',
    '- Nunca diga que vai analisar para descobrir se há direito. Diga que a equipe já identificou uma possibilidade e que a Dra. Jessica aprofunda os detalhes na continuidade.',
  ].join('\n')
}

function buildAgentContinuitySection({
  leadName,
  currentAgentType,
  operationProfile,
  activeAgentTypes,
  hasHistory,
  isFirstReplyAfterCampaign,
  planningPromptHint,
}: {
  leadName?: string | null
  currentAgentType?: string | null
  operationProfile?: string | null
  activeAgentTypes: string[]
  hasHistory: boolean
  isFirstReplyAfterCampaign: boolean
  planningPromptHint?: string | null
}) {
  const normalizedProfile = normalizeOperationProfile(operationProfile || 'beneficios_previdenciarios')
  const planningHumanHandoff = getPlanningHumanHandoffContext(planningPromptHint)
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
        : `Você está na etapa de triagem e não há agentes posteriores ativos no momento. Seu papel é aquecer ${leadRef}, explicar o essencial em linguagem simples e deixar a conversa pronta para ${normalizedProfile === 'planejamento_previdenciario' ? planningHumanHandoff.stageReference : 'a advogada responsável assumir'} sem perda de contexto.`
      : `Você está na etapa ${normalizedType}. Continue a conversa como parte do mesmo atendimento, assumindo que ${leadRef} já ouviu a explicação inicial e que o histórico registra o que foi falado ou combinado.`

  const continuityHint = isFirstReplyAfterCampaign
    ? `Este é o primeiro retorno do lead depois da abordagem ativa da campanha. Continue a conversa como sequência direta desse primeiro toque, sem fingir que já houve uma conversa longa anterior ou interesse previamente confirmado por ${leadRef}.`
    : hasHistory
    ? `Já existe histórico anterior. Nunca recomece a conversa do zero, nunca repita apresentação inicial desnecessária e sempre responda como alguém que sabe o que já foi alinhado com ${leadRef}.`
    : `Se esta for a primeira resposta efetiva da esteira, apresente o assunto com delicadeza, objetividade e sem despejar informação demais de uma vez.`

  const operationSpecificHint =
    normalizedProfile === 'planejamento_previdenciario'
      ? [
          '- No playbook de planejamento, a conversa pode avançar por agentes até proposta, contrato e preparação de assinatura antes do handoff humano.',
          '- Você atende apenas o titular do planejamento. Não conduza conversa com familiar, cuidador ou terceiro em nome do lead.',
          '- Trate o planejamento previdenciário como tema técnico e consultivo, não como curiosidade genérica nem como venda agressiva.',
          '- Se o lead já estiver engajado, continue exatamente do estágio em que a conversa está: diagnóstico, esclarecimento, proposta, preparação contratual ou assinatura.',
          '- Use conhecimento geral e a base técnica injetada para explicar conceitos como CNIS, RGPS, RPPS, histórico contributivo, formas de contribuição ao INSS, previdência complementar, regras de transição, abono permanência e organização previdenciária de longo prazo, sempre em linguagem clara.',
          '- Nunca invente conclusão individual, estratégia ideal, data de aposentadoria, ganho financeiro, economia tributária ou resposta técnica definitiva sem análise do caso.',
          '- Nunca estime cifra, percentual, ganho patrimonial, anos de antecipação, idade exata de aposentadoria, mix ideal de renda ou comparação numérica de cenários sem base documental individual.',
          '- Em perguntas técnicas iniciais, explique primeiro o mecanismo e as variáveis que costumam mudar a resposta. Depois faça 1 ou 2 perguntas de descoberta antes de sugerir qualquer direção.',
          '- Quando quiser dar exemplo, prefira exemplo situacional e qualitativo. Evite exemplo numérico ilustrativo se ele puder soar como cálculo do caso real.',
          '- Se a pergunta do lead for comparativa ou pedir recomendação, não entregue parecer final logo de saída. Estruture a resposta em: ponto central, fatores que mudam a conclusão e próxima pergunta útil.',
          '- Em regra, responda em até 4 blocos curtos de WhatsApp. Só ultrapasse isso se o lead pedir detalhamento técnico adicional.',
          '- Pergunta técnica difícil, por si só, não é motivo para escalar. Responda em nível geral com precisão e profundidade compatíveis com o perfil premium do lead.',
          '- Escale quando o lead pedir análise individual do CNIS ou documentos, cálculo formal/projeção, aceitar diagnóstico técnico pago, pedir para falar com advogado ou quando a conversa chegar à etapa de proposta/contrato/assinatura.',
          planningHumanHandoff.named
            ? `- Se o lead perguntar quem faz a análise individual, diga que isso fica com ${planningHumanHandoff.analysisReference}. Não atribua automaticamente à Dra. Ana.`
            : '- Se o lead perguntar quem faz a análise individual, diga que isso fica com o advogado ou especialista responsável da equipe. Não atribua automaticamente à Dra. Ana.',
          '- Depois que o lead demonstrar interesse real, conduza com naturalidade para diagnóstico, proposta, próximo compromisso ou preparação contratual, sem parecer telemarketing.',
        ].join('\n')
      : [
          '- No playbook de benefícios, parta do contexto de que o lead foi mapeado para uma possibilidade já identificada de revisão ou readequação do benefício.',
          '- Se o lead pedir explicação, explique diretamente o cenário já identificado em linguagem simples, curta e segura. Não volte para perguntas genéricas como se ainda estivesse descobrindo se existe problema no benefício.',
          '- Quando o lead pedir para explicar melhor, primeiro confirme o cenário em poucas linhas: diga que a equipe identificou uma possível revisão ou readequação do benefício já mapeada para o caso dele e que o próximo passo é confirmar detalhes e encaminhar a continuidade com a Dra. Jessica.',
          '- Se a última mensagem do lead for uma confirmação curta de interesse, como "sim", "tenho sim", "quero saber", "pode explicar" ou equivalente, não se apresente de novo, não repita a abertura da campanha e não pergunte novamente se ele tem interesse.',
          '- Depois de uma confirmação de interesse, continue a conversa em etapa: explique em poucas linhas o que é essa revisão ou readequação já identificada e avance para um próximo passo concreto com a Dra. Jessica ou equipe responsável.',
          '- Evite começar a resposta com fórmulas sociais desnecessárias como "Tudo bem sim, obrigada" se o lead não estiver realmente abrindo uma conversa social. Vá direto ao ponto com cordialidade.',
          '- Não reenvie uma versão reescrita da primeira mensagem da campanha. A segunda resposta precisa soar como continuidade real da conversa.',
          '- Depois da explicação inicial, faça no máximo uma pergunta útil de continuidade, ligada ao próximo passo do escritório, e não reabra uma triagem ampla.',
          '- Não pergunte se o benefício foi negado, cortado ou se o valor deveria ser maior quando o contato já veio de uma base mapeada para revisão/readequação.',
          '- Antes do handoff humano, o foco é: explicar o cenário identificado, confirmar que o lead quer seguir, e encaminhar o próximo passo com a Dra. Jessica ou equipe jurídica sem prometer resultado nem falar de valores.',
          '- Não peça documentos logo no primeiro retorno positivo, a menos que isso seja estritamente necessário para o próximo passo já alinhado na conversa.',
        ].join('\n')

  return [
    'CONTINUIDADE OPERACIONAL:',
    '- Sempre trate o histórico da conversa como o contexto oficial do caso.',
    `- Sempre que possível, chame ${leadRef} pelo nome.`,
    `- ${profileHint}`,
    `- ${stageHint}`,
    `- ${continuityHint}`,
    operationSpecificHint,
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

function getCurrentLocalDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const map = new Map(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(map.get('year') || '0'),
    month: Number(map.get('month') || '0'),
    day: Number(map.get('day') || '0'),
    weekday: String(map.get('weekday') || ''),
    hour: Number(map.get('hour') || '0'),
    minute: Number(map.get('minute') || '0'),
  }
}

function getNextOperationalRetryAt(config: AgentRuntimeConfig) {
  const start = String(config.agente_horario_inicio || '').trim()
  if (!start) return null

  const [startHourRaw, startMinuteRaw] = start.split(':')
  const startHour = Number(startHourRaw)
  const startMinute = Number(startMinuteRaw || '0')
  if (!Number.isFinite(startHour) || !Number.isFinite(startMinute)) return null

  const current = getCurrentLocalDateParts()
  const currentMinutes = current.hour * 60 + current.minute
  const startMinutes = startHour * 60 + startMinute

  const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const currentWeekdayIndex = weekdayMap.indexOf(current.weekday)
  const currentIsWeekend = currentWeekdayIndex === 0 || currentWeekdayIndex === 6
  const weekendOnly = Boolean(config.agente_apenas_dias_uteis)

  const candidate = new Date(Date.UTC(current.year, current.month - 1, current.day, startHour + 3, startMinute, 0))

  if (weekendOnly && currentIsWeekend) {
    const daysUntilMonday = currentWeekdayIndex === 6 ? 2 : 1
    candidate.setUTCDate(candidate.getUTCDate() + daysUntilMonday)
    return candidate.toISOString()
  }

  if (currentMinutes < startMinutes) {
    return candidate.toISOString()
  }

  candidate.setUTCDate(candidate.getUTCDate() + 1)

  if (weekendOnly) {
    while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
      candidate.setUTCDate(candidate.getUTCDate() + 1)
    }
  }

  return candidate.toISOString()
}

function isAnthropicCreditError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('credit balance is too low') ||
    message.includes('purchase credits') ||
    message.includes('plans & billing')
  )
}

function getCreatedAtMs(value: string | null | undefined) {
  const parsed = value ? new Date(value).getTime() : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function getRapidInboundSequenceCount(rowsDesc: InboundMessageRow[]) {
  if (!rowsDesc.length) return 0

  let count = 1
  for (let index = 0; index < rowsDesc.length - 1; index += 1) {
    const currentMs = getCreatedAtMs(rowsDesc[index]?.created_at)
    const nextMs = getCreatedAtMs(rowsDesc[index + 1]?.created_at)
    if (!currentMs || !nextMs) break
    if (currentMs - nextMs > AGENT_COALESCE_MESSAGE_GAP_MS) break
    count += 1
  }

  return count
}

function buildCurrentLeadTurn(historico: HistoricoEntry[]) {
  const chunks: string[] = []
  for (let index = historico.length - 1; index >= 0; index -= 1) {
    const entry = historico[index]
    if (entry.role !== 'user') break
    chunks.unshift(entry.content.trim())
  }
  return chunks.filter(Boolean).join('\n')
}

function buildConversationTranscript(rows: InboundMessageRow[], leadPhone: string) {
  const transcript: string[] = []
  const timeline = buildConversationTimelineRows(rows, leadPhone)

  for (const row of timeline) {
    const text = String(row.mensagem || '').trim()
    if (!text) continue
    transcript.push(`${row.timeline_role === 'assistant' ? 'AGENTE' : 'LEAD'}: ${text}`)
  }

  return transcript.join('\n')
}

async function insertStructuredAgentLog({
  supabase,
  entidadeId,
  acao,
  dadosNovos,
}: {
  supabase: ReturnType<typeof createAdminSupabase>
  entidadeId: string | null
  acao: string
  dadosNovos: Record<string, unknown>
}) {
  try {
    await supabase.from('audit_logs').insert({
      acao,
      entidade: 'conversa',
      entidade_id: entidadeId,
      dados_novos: dadosNovos,
    })
  } catch (error) {
    console.warn('[agente] Falha ao registrar log estruturado:', error)
  }
}

async function maybeRefreshOperationalSummary({
  supabase,
  anthropicClient,
  conversaId,
  currentSummary,
  summarizedMessageCount,
  leadName,
  rows,
}: {
  supabase: ReturnType<typeof createAdminSupabase>
  anthropicClient: Anthropic
  conversaId: string | null
  currentSummary: string | null | undefined
  summarizedMessageCount: number | null | undefined
  leadName: string
  rows: InboundMessageRow[]
}) {
  if (!conversaId) return

  const totalMessages = rows.length
  const previousCount = Number(summarizedMessageCount || 0)

  if (totalMessages < AGENT_SUMMARY_BATCH_SIZE) return
  if (totalMessages - previousCount < AGENT_SUMMARY_BATCH_SIZE) return

  const leadPhone = normalizeComparablePhone(rows.at(-1)?.telefone_remetente || '')
  const transcript = buildConversationTranscript(rows.slice(-40), leadPhone)
  if (!transcript.trim()) return

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 260,
      system: [
        'Você resume conversas operacionais de CRM em português do Brasil.',
        'Crie um resumo curto, objetivo e cumulativo para que outro agente continue a conversa sem parecer que reiniciou.',
        'Inclua: perfil do lead, objetivo declarado, fatos confirmados, dúvidas técnicas abertas, estágio comercial atual, próximos passos e qualquer compromisso assumido.',
        'Não use markdown, bullets nem emojis.',
        'Se houver resumo anterior, trate-o como contexto e atualize-o com o histórico recente.',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: [
            currentSummary?.trim() ? `RESUMO ANTERIOR:\n${currentSummary.trim()}` : '',
            `LEAD: ${leadName}`,
            'HISTÓRICO RECENTE:',
            transcript,
            'Produza o novo resumo operacional cumulativo.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    })

    const summaryText = stripEmojis(
      getAnthropicText(response as AnthropicResponse),
    )

    if (!summaryText) return

    await supabase
      .from('conversas')
      .update({
        resumo_operacional: summaryText,
        resumo_operacional_at: new Date().toISOString(),
        resumo_operacional_mensagens: totalMessages,
      })
      .eq('id', conversaId)
  } catch (error) {
    console.warn('[agente] Falha ao atualizar resumo operacional:', error)
  }
}

export async function POST(request: NextRequest) {
  let claimedMessageId: string | null = null
  let claimToken: string | null = null

  try {
    const supabase = createAdminSupabase()
    const { mensagem_id } = await request.json()
    claimedMessageId = mensagem_id || null

    if (!mensagem_id) {
      return NextResponse.json({ error: 'mensagem_id obrigatório' }, { status: 400 })
    }

    // 1. Buscar a mensagem recebida + dados do lead
    const { data: mensagemRow, error: msgError } = await supabase
      .from('mensagens_inbound')
      .select(`
        id,
        mensagem,
        campanha_id,
        conversa_id,
        telefone_remetente,
        telefone_destinatario,
        created_at,
        lead_id,
        leads (
          nome, nb, banco, valor_rma, ganho_potencial, status, campanha_id, tenant_id
        )
      `)
      .eq('id', mensagem_id)
      .single()

    const mensagem = mensagemRow as InboundMessageWithLead | null

    if (msgError || !mensagem) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }

    // 2. Resolver agente — prioridade: campanha → tipo/estágio → padrão tenant → config global
    const lead = Array.isArray(mensagem.leads)
      ? (mensagem.leads[0] ?? null)
      : mensagem.leads
    const tenantId = lead?.tenant_id || null
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

    let agenteRow: AgentRow | null = null
    let activeAgentTypes: string[] = []

    if (tenantId) {
      const { data: agentesAtivos } = await supabase
        .from('agentes')
        .select('tipo')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)

      activeAgentTypes = Array.from(
        new Set(
          ((agentesAtivos as Array<{ tipo: string | null }> | null) || [])
            .map((row) => String(row?.tipo || '').trim().toLowerCase())
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
        if (agenteCampanha) agenteRow = agenteCampanha as AgentRow
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
        if (agenteTipo) agenteRow = agenteTipo as AgentRow
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
      if (agentePadrao) agenteRow = agentePadrao as AgentRow
    }

    // 2d. Config global da tabela configuracoes (fallback original)
    const configuracoesSupabase = supabase as unknown as ConfiguracoesSupabase
    const { data: globalConfigData } = await getConfiguracaoAtual(
      configuracoesSupabase,
      tenantId,
      'agente_ativo, agente_nome, agente_prompt_sistema, agente_modelo, agente_max_tokens, agente_resposta_automatica, agente_horario_inicio, agente_horario_fim, agente_apenas_dias_uteis, agente_fluxo_qualificacao, agente_exemplos_dialogo, agente_gatilhos_escalada, agente_frases_proibidas, agente_objeccoes, agente_fallback, agente_perfil_operacao',
    )
    const globalConfig = globalConfigData as AgentRuntimeConfig | null

    // Monta config unificada (agente resolvido tem prioridade sobre config global)
    const config: AgentRuntimeConfig | null = agenteRow ? {
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

    const { data: conversaAtual } = mensagem.conversa_id
      ? await supabase
          .from('conversas')
          .select('id, status, resumo_operacional, resumo_operacional_mensagens')
          .eq('id', mensagem.conversa_id)
          .maybeSingle()
      : { data: null }

    // 3. Verificar janela de horário
    if (config.agente_horario_inicio && config.agente_horario_fim) {
      const { hourMinute, isWeekend } = getOperationalClock()

      if (config.agente_apenas_dias_uteis && isWeekend) {
        return NextResponse.json({
          error: 'Fora do horário de atendimento (fim de semana)',
          queued: true,
          reason: 'outside_hours',
          retry_at: getNextOperationalRetryAt(config),
          horario_inicio: config.agente_horario_inicio,
          horario_fim: config.agente_horario_fim,
          dias_uteis_only: Boolean(config.agente_apenas_dias_uteis),
        }, { status: 202 })
      }

      if (hourMinute < config.agente_horario_inicio || hourMinute > config.agente_horario_fim) {
        return NextResponse.json({
          error: 'Fora do horário de atendimento',
          queued: true,
          reason: 'outside_hours',
          retry_at: getNextOperationalRetryAt(config),
          horario_inicio: config.agente_horario_inicio,
          horario_fim: config.agente_horario_fim,
          dias_uteis_only: Boolean(config.agente_apenas_dias_uteis),
        }, { status: 202 })
      }
    }

    // 4. Buscar histórico real da conversa e aplicar debounce/coalescência
    const historyScopeColumn = mensagem.conversa_id ? 'conversa_id' : 'lead_id'
    const historyScopeValue = mensagem.conversa_id || mensagem.lead_id
    const historico: HistoricoEntry[] = []

    let inbounds: InboundMessageRow[] = []

    if (historyScopeValue) {
      const { data } = await supabase
        .from('mensagens_inbound')
        .select('id, mensagem, telefone_remetente, telefone_destinatario, respondido_por_agente, respondido_manualmente, resposta_agente, agente_reprocessar_apos, lido_em, created_at')
        .eq(historyScopeColumn, historyScopeValue)
        .order('created_at', { ascending: false })
        .limit(40)

      inbounds = (data || []) as InboundMessageRow[]
    }

    const pendingInboundRows = inbounds.filter(
      (row) => !row.respondido_por_agente && !row.respondido_manualmente,
    )
    const latestInbound = pendingInboundRows[0] || inbounds[0]
    if (latestInbound?.id && latestInbound.id !== mensagem_id) {
      return NextResponse.json(
        {
          queued: false,
          reason: 'stale_message',
        },
        { status: 202 },
      )
    }

    const duplicateInbound = findRecentDuplicateInboundMessage(inbounds, mensagem_id)
    if (duplicateInbound?.resposta_agente?.trim()) {
      await supabase
        .from('mensagens_inbound')
        .update({
          respondido_por_agente: true,
          resposta_agente: duplicateInbound.resposta_agente.trim(),
          agente_reprocessar_apos: null,
          lido: true,
          lido_em: new Date().toISOString(),
        })
        .eq('id', mensagem_id)

      return NextResponse.json(
        {
          queued: false,
          reused_previous_response: true,
          reason: 'duplicate_inbound_message',
        },
        { status: 202 },
      )
    }

    const nowMs = Date.now()
    const latestInboundMs = getCreatedAtMs(latestInbound?.created_at || mensagem.created_at)
    const latestInboundAgeMs = latestInboundMs ? Math.max(0, nowMs - latestInboundMs) : 0
    const recentInbounds = pendingInboundRows.filter(
      (row) => nowMs - getCreatedAtMs(row.created_at) <= AGENT_FLOOD_WINDOW_MS,
    )
    const rapidSequenceCount = getRapidInboundSequenceCount(pendingInboundRows)

    if (recentInbounds.length > AGENT_FLOOD_LIMIT) {
      await insertStructuredAgentLog({
        supabase,
        entidadeId: mensagem.conversa_id || null,
        acao: 'agent.flood_detected',
        dadosNovos: {
          mensagem_id,
          conversa_id: mensagem.conversa_id || null,
          lead_id: mensagem.lead_id || null,
          total_mensagens_60s: recentInbounds.length,
          janela_ms: AGENT_FLOOD_WINDOW_MS,
          silencio_necessario_ms: AGENT_FLOOD_SILENCE_MS,
        },
      })

      if (latestInboundAgeMs < AGENT_FLOOD_SILENCE_MS) {
        return NextResponse.json(
          {
            queued: true,
            retryable: true,
            reason: 'waiting_for_quiet_window',
            retry_after_ms: AGENT_FLOOD_SILENCE_MS - latestInboundAgeMs,
          },
          { status: 202 },
        )
      }
    }

    if (rapidSequenceCount >= 3 && latestInboundAgeMs < AGENT_COALESCE_WAIT_MS) {
      return NextResponse.json(
        {
          queued: true,
          retryable: true,
          reason: 'coalescing_recent_messages',
          retry_after_ms: AGENT_COALESCE_WAIT_MS - latestInboundAgeMs,
          rapid_sequence_count: rapidSequenceCount,
        },
        { status: 202 },
      )
    }

    const leadPhone = normalizeComparablePhone(mensagem.telefone_remetente)
    const timeline = buildConversationTimelineRows([...inbounds].reverse(), leadPhone)

    timeline.forEach((msg) => {
      const text = String(msg.mensagem || '').trim()
      if (!text) return
      historico.push({
        role: msg.timeline_role === 'assistant' ? 'assistant' : 'user',
        content: text,
      })
    })

    const latestLeadMessage = buildCurrentLeadTurn(historico) || String(mensagem.mensagem || '').trim()
    const latestLeadIntent = classifyLatestLeadTurn(latestLeadMessage)
    const userTurns = historico.filter((entry) => entry.role === 'user').length
    const assistantTurns = historico.filter((entry) => entry.role === 'assistant').length
    const isFirstReplyAfterCampaign =
      Boolean(campanha_id) &&
      userTurns <= 1 &&
      assistantTurns <= 1

    claimToken = `__agent_processing__:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
    const { data: claimedMessage, error: claimError } = await supabase
      .from('mensagens_inbound')
      .update({
        resposta_agente: claimToken,
      })
      .eq('id', mensagem_id)
      .eq('respondido_por_agente', false)
      .eq('respondido_manualmente', false)
      .is('resposta_agente', null)
      .select('id')
      .maybeSingle()

    if (claimError) {
      throw claimError
    }

    if (!claimedMessage) {
      return NextResponse.json(
        {
          queued: false,
          reason: 'already_processing_or_answered',
        },
        { status: 202 },
      )
    }

    // 5. Montar system prompt com dados do lead
    const promptBase = config.agente_prompt_sistema || PROMPT_PADRAO
    const partes = [promptBase]
    const normalizedOperationProfile = normalizeOperationProfile(
      config.agente_perfil_operacao || agenteRow?.perfil_operacao || 'beneficios_previdenciarios',
    )
    const planningHumanHandoff = getPlanningHumanHandoffContext()
    if (config.agente_fluxo_qualificacao) partes.push(`\nFLUXO DE QUALIFICAÇÃO:\n${config.agente_fluxo_qualificacao}`)
    if (config.agente_exemplos_dialogo) partes.push(`\nEXEMPLOS DE DIÁLOGO:\n${config.agente_exemplos_dialogo}`)
    if (config.agente_gatilhos_escalada) partes.push(`\nGATILHOS DE ESCALADA — quando ocorrerem, encerre e informe que ${normalizedOperationProfile === 'planejamento_previdenciario' ? planningHumanHandoff.escalationContinuation : 'a equipe jurídica responsável continuará o atendimento'}:\n${config.agente_gatilhos_escalada}`)
    if (config.agente_frases_proibidas) partes.push(`\nFRASES ABSOLUTAMENTE PROIBIDAS:\n${config.agente_frases_proibidas}`)
    if (config.agente_objeccoes) partes.push(`\nCOMO LIDAR COM OBJEÇÕES:\n${config.agente_objeccoes}`)
    if (config.agente_fallback) partes.push(`\nFALLBACK — quando não entender a mensagem, responda: "${config.agente_fallback}"`)
    if (conversaAtual?.resumo_operacional?.trim()) {
      partes.push(`\nRESUMO OPERACIONAL DA CONVERSA:\n${conversaAtual.resumo_operacional.trim()}`)
    }
    partes.push(
      `\n${buildAgentContinuitySection({
        leadName: lead?.nome,
        currentAgentType: config.agente_tipo || agenteRow?.tipo || null,
        operationProfile: normalizedOperationProfile,
        activeAgentTypes,
        hasHistory: historico.length > 1,
        isFirstReplyAfterCampaign,
        planningPromptHint: config.agente_prompt_sistema || null,
      })}`,
    )
    partes.push(
      `\n${buildImmediateResponseDirective({
        latestLeadMessage,
        latestLeadIntent,
        operationProfile: normalizedOperationProfile,
        isFirstReplyAfterCampaign,
        planningPromptHint: config.agente_prompt_sistema || null,
      })}`,
    )
    if (normalizedOperationProfile === 'planejamento_previdenciario') {
      const planningKnowledge = await getPlanningKnowledgeBlock()
      if (planningKnowledge.warning && !KNOWLEDGE_WARNING_LOGGED.has(planningKnowledge.warning)) {
        console.warn('[agente] ', planningKnowledge.warning)
        KNOWLEDGE_WARNING_LOGGED.add(planningKnowledge.warning)
      }
      if (planningKnowledge.content) {
        partes.push(
          [
            '\nBASE DE CONHECIMENTO TÉCNICO — PLANEJAMENTO PREVIDENCIÁRIO:',
            planningKnowledge.content,
            'Use esta base para responder com precisão técnica, mas não para transformar a conversa em relatório. Prefira extrair o princípio aplicável em linguagem simples. Se a documentação trouxer números, percentuais, idades, tetos ou exemplos ilustrativos, só use isso quando for indispensável e não soar como cálculo individual ou recomendação pronta. Se a pergunta exigir análise individual de documentos do lead, escale para o consultor humano.',
          ].join('\n'),
        )
      }
    }
    if (normalizedOperationProfile === 'beneficios_previdenciarios') {
      partes.push(`\n${buildBenefitsOperationalKnowledge()}`)
      partes.push(
        '\nESTILO DE RESPOSTA PARA BENEFÍCIOS:\n- Responda em blocos curtos, como conversa normal de WhatsApp.\n- Evite textão técnico.\n- Não recomece a conversa.\n- Não use emojis.\n- Quando o lead já aceitou ouvir mais, explique e conduza para o próximo passo com a Dra. Jessica.',
      )
    }

    const systemPrompt = partes.join('\n')
      .replace(/\{nome\}/g, repairCommonMojibake(lead?.nome || 'Beneficiário'))
      .replace(/\{nb\}/g, lead?.nb || 'N/A')
      .replace(/\{banco\}/g, lead?.banco || 'N/A')
      .replace(/\{valor\}/g, lead?.valor_rma ? `${Number(lead.valor_rma).toFixed(2)}` : 'N/A')
      .replace(/\{ganho\}/g, lead?.ganho_potencial ? `${Number(lead.ganho_potencial).toFixed(2)}` : 'N/A')
      .replace(/\{nome_publico\}/g, config.agente_nome || 'Assistente')

    // 6. Chamar Claude
    let response: AnthropicResponse
    const modelName = config.agente_modelo || 'claude-sonnet-4-20250514'
    const configuredMaxTokens =
      config.agente_max_tokens ||
      (normalizedOperationProfile === 'planejamento_previdenciario'
        ? 460
        : 500)
    const maxTokens =
      normalizedOperationProfile === 'planejamento_previdenciario'
        ? isFirstReplyAfterCampaign
          ? Math.min(configuredMaxTokens, 260)
          : Math.min(configuredMaxTokens, 380)
        : configuredMaxTokens
    const llmStartedAt = Date.now()

    try {
      response = (await anthropic.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: historico,
      })) as AnthropicResponse

      if (tenantId) {
        const usage = getUsageSnapshot(response)
        logLlmUsage({
          tenantId,
          conversaId: mensagem.conversa_id || null,
          leadId: mensagem.lead_id || null,
          agenteId: agenteRow?.id || null,
          perfilOperacao: normalizedOperationProfile,
          modelo: modelName,
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
          latenciaMs: Date.now() - llmStartedAt,
          sucesso: true,
        }).catch((e) => console.warn('[agent-llm-log] falhou:', e))
      }
    } catch (modelError: unknown) {
      if (tenantId) {
        logLlmUsage({
          tenantId,
          conversaId: mensagem.conversa_id || null,
          leadId: mensagem.lead_id || null,
          agenteId: agenteRow?.id || null,
          perfilOperacao: normalizedOperationProfile,
          modelo: modelName,
          inputTokens: 0,
          outputTokens: 0,
          latenciaMs: Date.now() - llmStartedAt,
          sucesso: false,
          erroDescricao: getErrorMessage(modelError) || 'Erro desconhecido na chamada ao modelo',
        }).catch((e) => console.warn('[agent-llm-log] falhou:', e))
      }

      if (isAnthropicCreditError(modelError)) {
        const fallbackText = buildAnthropicCreditFallbackMessage({
          operationProfile: normalizedOperationProfile,
          planningHumanHandoff,
        })
        let fallbackSent = false

        if (config.agente_resposta_automatica && tenantId && mensagem.telefone_remetente) {
          try {
            const fallbackSendResult = await sendWhatsAppMessage({
              tenantId,
              to: mensagem.telefone_remetente,
              body: fallbackText,
            })

            if (fallbackSendResult.success) {
              fallbackSent = true

              await supabase
                .from('mensagens_inbound')
                .update({
                  respondido_por_agente: true,
                  respondido_manualmente: false,
                  resposta_agente: fallbackText,
                  agente_reprocessar_apos: null,
                  twilio_sid: fallbackSendResult.externalMessageId || null,
                  lido: true,
                  lido_em: new Date().toISOString(),
                })
                .eq('id', mensagem_id)
            }
          } catch (fallbackSendError) {
            console.warn('[agente] Falha ao enviar aviso de contingência por saldo Anthropic:', fallbackSendError)
          }
        }

        if (mensagem.conversa_id) {
          await supabase
            .from('conversas')
            .update({
              status: 'humano',
              ...(fallbackSent
                ? {
                    ultima_mensagem: fallbackText,
                    ultima_mensagem_at: new Date().toISOString(),
                  }
                : {}),
            })
            .eq('id', mensagem.conversa_id)
        }

        if (tenantId) {
          const nomeLead = lead?.nome || 'Lead sem nome'
          await supabase.from('notificacoes').insert({
            tenant_id: tenantId,
            tipo: 'escalada',
            titulo: `Agente indisponível — ${nomeLead}`,
            descricao: fallbackSent
              ? 'O agente não conseguiu responder porque o saldo da API Anthropic está insuficiente. O lead recebeu um aviso de continuidade com a equipe humana.'
              : 'O agente não conseguiu responder porque o saldo da API Anthropic está insuficiente. Assuma a conversa manualmente.',
            link: mensagem.conversa_id
              ? `/caixa-de-entrada?conversaId=${mensagem.conversa_id}&telefone=${encodeURIComponent(mensagem.telefone_remetente || '')}`
              : '/caixa-de-entrada',
            metadata: {
              motivo: 'anthropic_credit_low',
              conversa_id: mensagem.conversa_id || null,
              lead_id: mensagem.lead_id || null,
              mensagem_id,
              fallback_sent: fallbackSent,
            },
          })
        }

        return NextResponse.json(
          {
            queued: false,
            handled: true,
            reason: 'anthropic_credit_low_handled',
            fallback_sent: fallbackSent,
          },
          { status: 202 },
        )
      }

      throw modelError
    }

    const respostaTextoBruta = getAnthropicText(response)
    const stopReason = getStopReason(response)
    const wasCutByTokenLimit = stopReason === 'max_tokens'
    if (!respostaTextoBruta) {
      console.warn('[agente] Resposta do modelo sem conteúdo textual útil', {
        mensagem_id,
        tenantId,
        leadId: mensagem.lead_id || null,
        stop_reason: stopReason,
      })
    }
    const previousAssistantMessage = findPreviousAssistantMessage(historico)
    const planningPromptHint = config.agente_prompt_sistema || promptBase
    let respostaTexto = sanitizeWhatsAppResponseText(respostaTextoBruta)

    if (
      normalizedOperationProfile === 'planejamento_previdenciario' &&
      needsPlanningRewrite({
        text: respostaTexto,
        previousAssistant: previousAssistantMessage,
        isFirstReplyAfterCampaign,
        wasCutByTokenLimit,
      })
    ) {
      try {
        const rewritten = await rewritePlanningReplyForWhatsApp({
          anthropicClient: anthropic,
          latestLeadMessage,
          previousAssistant: previousAssistantMessage,
          draft: respostaTexto,
          isFirstReplyAfterCampaign,
        })

        if (rewritten) {
          respostaTexto = rewritten
        }
      } catch (rewriteError) {
        console.warn('[agente] Falha ao reescrever resposta de planejamento:', rewriteError)
      }
    }

    if (normalizedOperationProfile === 'planejamento_previdenciario') {
      respostaTexto = normalizePlanningHumanAttribution(respostaTexto, planningPromptHint)
      respostaTexto = softenPlanningGreeting({
        text: respostaTexto,
        latestLeadMessage,
        previousAssistant: previousAssistantMessage,
        isFirstReplyAfterCampaign,
      })
    }

    if (looksLikeRetiredPoliteDecline(latestLeadMessage) && isBareGreetingReply(respostaTexto)) {
      respostaTexto = buildPoliteRetiredClosure(normalizedOperationProfile)
    }

    if (!respostaTexto) {
      throw new Error('Resposta vazia do modelo')
    }

    const shouldMoveToAwaitingCustomer = shouldMoveBenefitsConversationToAwaitingCustomer({
      operationProfile: config.agente_perfil_operacao || agenteRow?.perfil_operacao || null,
      latestLeadIntent,
      latestLeadMessage,
      historico,
    })

    // 7. Marcar mensagem como respondida + rastrear agente (Fase D)
    await supabase
      .from('mensagens_inbound')
      .update({
        respondido_por_agente: true,
        resposta_agente: respostaTexto,
        agente_reprocessar_apos: null,
        lido: true,
        lido_em: new Date().toISOString(),
        agente_respondente_id: agenteRow?.id ?? null,
      })
      .eq('id', mensagem_id)

    const rowsForSummary = inbounds.map((row) =>
      row.id === mensagem_id
        ? {
            ...row,
            respondido_por_agente: true,
            resposta_agente: respostaTexto,
          }
        : row,
    )

    if (shouldMoveToAwaitingCustomer && mensagem.conversa_id) {
      await supabase
        .from('conversas')
        .update({
          status: 'aguardando_cliente',
          nao_lidas: 0,
        })
        .eq('id', mensagem.conversa_id)
    }

    // 8. Se resposta automática ativa, enviar via Twilio
    if (config.agente_resposta_automatica && mensagem.telefone_remetente) {
      if (AGENT_RESPONSE_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, AGENT_RESPONSE_DELAY_MS))
      }

      const result = await sendWhatsAppMessage({
        tenantId,
        to: mensagem.telefone_remetente,
        body: respostaTexto,
      })

      if (!result.success) {
        console.error('Falha ao enviar resposta automática via WhatsApp:', result.error)
      } else if (result.externalMessageId) {
        await supabase
          .from('mensagens_inbound')
          .update({
            twilio_sid: result.externalMessageId,
          })
          .eq('id', mensagem_id)
      }
    }

    await maybeRefreshOperationalSummary({
      supabase,
      anthropicClient: anthropic,
      conversaId: mensagem.conversa_id || null,
      currentSummary: conversaAtual?.resumo_operacional || null,
      summarizedMessageCount: conversaAtual?.resumo_operacional_mensagens || 0,
      leadName: lead?.nome || 'Lead sem nome',
      rows: rowsForSummary,
    })

    return NextResponse.json({
      success: true,
      resposta: respostaTexto,
      automatico: config.agente_resposta_automatica,
    })

  } catch (error: unknown) {
    if (claimedMessageId && claimToken) {
      try {
        const supabase = createAdminSupabase()
        await supabase
          .from('mensagens_inbound')
          .update({
            resposta_agente: null,
          })
          .eq('id', claimedMessageId)
          .eq('resposta_agente', claimToken)
          .eq('respondido_por_agente', false)
      } catch (releaseError) {
        console.warn('[agente] Falha ao liberar claim de processamento:', releaseError)
      }
    }

    console.error('Erro no agente:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
