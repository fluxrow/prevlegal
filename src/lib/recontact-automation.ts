export const RECONTACT_AUTOMATION_MODES = ['off', 'shadow', 'manual_review', 'live'] as const
export type RecontactAutomationMode = (typeof RECONTACT_AUTOMATION_MODES)[number]

export const RECONTACT_AUTOMATION_TYPES = ['campanha_sem_resposta', 'conversa_em_aberto'] as const
export type RecontactAutomationType = (typeof RECONTACT_AUTOMATION_TYPES)[number]

export const RECONTACT_CANDIDATE_STATUSES = ['detected', 'approved', 'sent', 'skipped', 'canceled'] as const
export type RecontactCandidateStatus = (typeof RECONTACT_CANDIDATE_STATUSES)[number]

export type RecontactAutomationConfig = {
  mode: RecontactAutomationMode
  campaignNoReplyEnabled: boolean
  openConversationEnabled: boolean
  campaignDelayHours: number
  openConversationDelayHours: number
  maxAttempts: number
  dailyLimit: number
}

export const DEFAULT_RECONTACT_AUTOMATION_CONFIG: RecontactAutomationConfig = {
  mode: 'off',
  campaignNoReplyEnabled: false,
  openConversationEnabled: false,
  campaignDelayHours: 24,
  openConversationDelayHours: 24,
  maxAttempts: 1,
  dailyLimit: 20,
}

export const RECONTACT_MODE_LABELS: Record<RecontactAutomationMode, string> = {
  off: 'Desligado',
  shadow: 'Shadow',
  manual_review: 'Revisão manual',
  live: 'Automático',
}

export const RECONTACT_TYPE_LABELS: Record<RecontactAutomationType, string> = {
  campanha_sem_resposta: 'Campanha sem resposta',
  conversa_em_aberto: 'Conversa em aberto',
}

export const RECONTACT_STATUS_LABELS: Record<RecontactCandidateStatus, string> = {
  detected: 'Detectado',
  approved: 'Aprovado',
  sent: 'Enviado',
  skipped: 'Ignorado',
  canceled: 'Cancelado',
}

export function normalizeRecontactAutomationMode(value: string | null | undefined): RecontactAutomationMode {
  return RECONTACT_AUTOMATION_MODES.includes(value as RecontactAutomationMode)
    ? (value as RecontactAutomationMode)
    : 'off'
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export function getRecontactAutomationConfig(
  raw: Record<string, unknown> | null | undefined,
): RecontactAutomationConfig {
  return {
    mode: normalizeRecontactAutomationMode(String(raw?.auto_recontact_mode || 'off')),
    campaignNoReplyEnabled:
      raw?.auto_recontact_campaign_no_reply_enabled === true ||
      raw?.auto_recontact_campaign_no_reply_enabled === 'true',
    openConversationEnabled:
      raw?.auto_recontact_open_conversation_enabled === true ||
      raw?.auto_recontact_open_conversation_enabled === 'true',
    campaignDelayHours: toPositiveInteger(
      raw?.auto_recontact_campaign_delay_hours,
      DEFAULT_RECONTACT_AUTOMATION_CONFIG.campaignDelayHours,
    ),
    openConversationDelayHours: toPositiveInteger(
      raw?.auto_recontact_open_conversation_delay_hours,
      DEFAULT_RECONTACT_AUTOMATION_CONFIG.openConversationDelayHours,
    ),
    maxAttempts: toPositiveInteger(
      raw?.auto_recontact_max_attempts,
      DEFAULT_RECONTACT_AUTOMATION_CONFIG.maxAttempts,
    ),
    dailyLimit: toPositiveInteger(
      raw?.auto_recontact_daily_limit,
      DEFAULT_RECONTACT_AUTOMATION_CONFIG.dailyLimit,
    ),
  }
}

export function buildCampaignNoReplyMessage(name: string | null | undefined) {
  const firstName = String(name || '').trim().split(/\s+/)[0] || 'cliente'
  return `Oi, ${firstName}. Passando por aqui porque minha mensagem anterior ficou em aberto. Se fizer sentido para você, posso te explicar em poucas linhas.`
}

export function buildOpenConversationMessage(name: string | null | undefined) {
  const firstName = String(name || '').trim().split(/\s+/)[0] || 'cliente'
  return `Oi, ${firstName}. Passando por aqui porque nossa conversa ficou em aberto. Se fizer sentido, posso retomar com você.`
}

const BLOCKED_OPERATIONAL_STATES = new Set([
  'agendado',
  'aguardando_documentos',
  'aguardando_contrato',
  'em_atendimento_humano',
  'convertido',
  'encerrado',
])

export function blocksOpenConversationRecontact(
  operationalState: string | null | undefined,
  conversationStatus: string | null | undefined,
) {
  const normalizedOperationalState = String(operationalState || '').trim()
  if (BLOCKED_OPERATIONAL_STATES.has(normalizedOperationalState)) return true

  return ['humano', 'resolvido', 'encerrado'].includes(String(conversationStatus || '').trim())
}
