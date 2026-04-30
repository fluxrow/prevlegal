import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'
import { createAdminSupabase } from '@/lib/internal-collaboration'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import {
  blocksOpenConversationRecontact,
  buildCampaignNoReplyMessage,
  buildOpenConversationMessage,
  getRecontactAutomationConfig,
  type RecontactAutomationConfig,
  type RecontactAutomationType,
} from '@/lib/recontact-automation'

type AdminSupabase = ReturnType<typeof createAdminSupabase>
type ConfiguracoesSupabase = Parameters<typeof getConfiguracaoAtual>[0]

type CandidateRow = {
  id: string
  tenant_id: string
  lead_id: string
  conversa_id: string | null
  campanha_id: string | null
  whatsapp_number_id: string | null
  automation_type: RecontactAutomationType
  status: string
  mode_snapshot: string
  reason: string | null
  message_preview: string | null
  attempt_number: number
  eligible_at: string
  sent_at: string | null
  canceled_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type LeadRow = {
  id: string
  nome: string | null
  telefone: string | null
  status: string | null
  lgpd_optout?: boolean | null
}

type ConversationRow = {
  id: string
  lead_id: string | null
  status: string | null
  estado_operacional: string | null
  telefone: string | null
  whatsapp_number_id: string | null
  ultima_mensagem_at: string | null
}

type CampaignMessageRow = {
  id: string
  campanha_id: string | null
  lead_id: string | null
  whatsapp_number_id: string | null
  created_at: string
  status: string | null
}

type MessageRow = {
  id: string
  lead_id: string | null
  conversa_id: string | null
  created_at: string
  respondido_por_agente: boolean | null
  respondido_manualmente: boolean | null
}

type TenantConfigRow = Record<string, unknown> & { id?: string }

export type RecontactScanResult = {
  created: number
  skipped: number
  createdByType: Record<RecontactAutomationType, number>
}

export type RecontactDispatchResult = {
  candidateId: string
  status: 'sent' | 'skipped' | 'canceled'
  reason?: string
}

function isMissingRecontactFoundationError(error: unknown) {
  if (!(error instanceof Error)) return false
  const text = `${error.message}`.toLowerCase()
  return (
    text.includes('automation_recontact_candidates') ||
    text.includes('auto_recontact_') ||
    text.includes('does not exist') ||
    text.includes('column') ||
    text.includes('relation')
  )
}

async function getTenantConfig(admin: AdminSupabase, tenantId: string) {
  const { data, error } = await getConfiguracaoAtual<TenantConfigRow>(
    admin as unknown as ConfiguracoesSupabase,
    tenantId,
  )

  if (error) throw new Error(error.message || 'Falha ao carregar configurações')
  return getRecontactAutomationConfig(data || null)
}

async function getExistingCandidateState(admin: AdminSupabase, tenantId: string) {
  const { data, error } = await admin
    .from('automation_recontact_candidates')
    .select('lead_id, automation_type, status, attempt_number')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)

  const activeKeys = new Set<string>()
  const sentCounts = new Map<string, number>()

  for (const row of (data || []) as Array<{ lead_id: string | null; automation_type: string | null; status: string | null; attempt_number: number | null }>) {
    if (!row.lead_id || !row.automation_type) continue
    const key = `${row.lead_id}:${row.automation_type}`
    if (['detected', 'approved'].includes(String(row.status || ''))) {
      activeKeys.add(key)
    }
    if (row.status === 'sent') {
      sentCounts.set(key, Math.max(sentCounts.get(key) || 0, Number(row.attempt_number || 1)))
    }
  }

  return { activeKeys, sentCounts }
}

async function getLatestConversationsByLead(admin: AdminSupabase, tenantId: string, leadIds: string[]) {
  if (leadIds.length === 0) return new Map<string, ConversationRow>()

  const { data, error } = await admin
    .from('conversas')
    .select('id, lead_id, status, estado_operacional, telefone, whatsapp_number_id, ultima_mensagem_at')
    .eq('tenant_id', tenantId)
    .in('lead_id', leadIds)
    .order('ultima_mensagem_at', { ascending: false })

  if (error) throw new Error(error.message)

  const map = new Map<string, ConversationRow>()
  for (const row of (data || []) as ConversationRow[]) {
    if (!row.lead_id || map.has(row.lead_id)) continue
    map.set(row.lead_id, row)
  }
  return map
}

async function createCandidate(
  admin: AdminSupabase,
  payload: {
    tenantId: string
    leadId: string
    conversationId?: string | null
    campaignId?: string | null
    whatsappNumberId?: string | null
    type: RecontactAutomationType
    mode: RecontactAutomationConfig['mode']
    reason: string
    messagePreview: string
  },
) {
  const { error } = await admin.from('automation_recontact_candidates').insert({
    tenant_id: payload.tenantId,
    lead_id: payload.leadId,
    conversa_id: payload.conversationId || null,
    campanha_id: payload.campaignId || null,
    whatsapp_number_id: payload.whatsappNumberId || null,
    automation_type: payload.type,
    mode_snapshot: payload.mode,
    reason: payload.reason,
    message_preview: payload.messagePreview,
    status: 'detected',
  })

  if (error) throw new Error(error.message)
}

async function scanCampaignNoReplyCandidates(
  admin: AdminSupabase,
  tenantId: string,
  config: RecontactAutomationConfig,
  activeKeys: Set<string>,
  sentCounts: Map<string, number>,
) {
  if (!config.campaignNoReplyEnabled) return { created: 0, skipped: 0 }

  const thresholdIso = new Date(Date.now() - config.campaignDelayHours * 3600 * 1000).toISOString()
  const { data: campaigns, error: campaignsError } = await admin
    .from('campanhas')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['ativa', 'pausada', 'encerrada'])

  if (campaignsError) throw new Error(campaignsError.message)

  const campaignIds = (campaigns || []).map((row: { id: string }) => row.id)
  if (campaignIds.length === 0) return { created: 0, skipped: 0 }

  const { data: campaignMessages, error: campaignMessagesError } = await admin
    .from('campanha_mensagens')
    .select('id, campanha_id, lead_id, whatsapp_number_id, created_at, status')
    .in('campanha_id', campaignIds)
    .in('status', ['enviado', 'entregue', 'lido'])
    .lte('created_at', thresholdIso)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (campaignMessagesError) throw new Error(campaignMessagesError.message)

  const latestCampaignMessageByLead = new Map<string, CampaignMessageRow>()
  for (const row of (campaignMessages || []) as CampaignMessageRow[]) {
    if (!row.lead_id || latestCampaignMessageByLead.has(row.lead_id)) continue
    latestCampaignMessageByLead.set(row.lead_id, row)
  }

  const leadIds = [...latestCampaignMessageByLead.keys()]
  if (leadIds.length === 0) return { created: 0, skipped: 0 }

  const { data: leads, error: leadsError } = await admin
    .from('leads')
    .select('id, nome, telefone, status, lgpd_optout')
    .eq('tenant_id', tenantId)
    .in('id', leadIds)

  if (leadsError) throw new Error(leadsError.message)

  const leadsMap = new Map((leads || []).map((row) => [row.id, row as LeadRow]))
  const conversationsMap = await getLatestConversationsByLead(admin, tenantId, leadIds)

  const oldestSentAt = [...latestCampaignMessageByLead.values()]
    .map((row) => row.created_at)
    .sort()[0]

  const { data: inboundReplies, error: inboundError } = await admin
    .from('mensagens_inbound')
    .select('lead_id, created_at')
    .eq('tenant_id', tenantId)
    .in('lead_id', leadIds)
    .eq('respondido_por_agente', false)
    .eq('respondido_manualmente', false)
    .gte('created_at', oldestSentAt)

  if (inboundError) throw new Error(inboundError.message)

  const latestInboundByLead = new Map<string, string>()
  for (const row of (inboundReplies || []) as Array<{ lead_id: string | null; created_at: string }>) {
    if (!row.lead_id) continue
    const existing = latestInboundByLead.get(row.lead_id)
    if (!existing || new Date(row.created_at).getTime() > new Date(existing).getTime()) {
      latestInboundByLead.set(row.lead_id, row.created_at)
    }
  }

  let created = 0
  let skipped = 0

  for (const [leadId, campaignMessage] of latestCampaignMessageByLead.entries()) {
    const lead = leadsMap.get(leadId)
    const key = `${leadId}:campanha_sem_resposta`
    const sentAttempts = sentCounts.get(key) || 0

    if (!lead || !lead.telefone || lead.lgpd_optout || lead.status === 'converted') {
      skipped += 1
      continue
    }
    if (activeKeys.has(key) || sentAttempts >= config.maxAttempts) {
      skipped += 1
      continue
    }

    const latestInboundAt = latestInboundByLead.get(leadId)
    if (latestInboundAt && new Date(latestInboundAt).getTime() > new Date(campaignMessage.created_at).getTime()) {
      skipped += 1
      continue
    }

    const conversation = conversationsMap.get(leadId)
    if (conversation && blocksOpenConversationRecontact(conversation.estado_operacional, conversation.status)) {
      skipped += 1
      continue
    }

    await createCandidate(admin, {
      tenantId,
      leadId,
      conversationId: conversation?.id || null,
      campaignId: campaignMessage.campanha_id || null,
      whatsappNumberId: campaignMessage.whatsapp_number_id || conversation?.whatsapp_number_id || null,
      type: 'campanha_sem_resposta',
      mode: config.mode,
      reason: `Lead recebeu campanha e não respondeu após ${config.campaignDelayHours}h.`,
      messagePreview: buildCampaignNoReplyMessage(lead.nome),
    })

    created += 1
  }

  return { created, skipped }
}

async function scanOpenConversationCandidates(
  admin: AdminSupabase,
  tenantId: string,
  config: RecontactAutomationConfig,
  activeKeys: Set<string>,
  sentCounts: Map<string, number>,
) {
  if (!config.openConversationEnabled) return { created: 0, skipped: 0 }

  const thresholdIso = new Date(Date.now() - config.openConversationDelayHours * 3600 * 1000).toISOString()
  const { data: conversations, error: conversationsError } = await admin
    .from('conversas')
    .select('id, lead_id, status, estado_operacional, telefone, whatsapp_number_id, ultima_mensagem_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'agente')
    .lte('ultima_mensagem_at', thresholdIso)
    .order('ultima_mensagem_at', { ascending: true })
    .limit(500)

  if (conversationsError) throw new Error(conversationsError.message)

  const filteredConversations = (conversations || []) as ConversationRow[]
  const conversationIds = filteredConversations.map((row) => row.id)
  const leadIds = filteredConversations.map((row) => row.lead_id).filter(Boolean) as string[]

  if (conversationIds.length === 0 || leadIds.length === 0) {
    return { created: 0, skipped: 0 }
  }

  const { data: leads, error: leadsError } = await admin
    .from('leads')
    .select('id, nome, telefone, status, lgpd_optout')
    .eq('tenant_id', tenantId)
    .in('id', leadIds)

  if (leadsError) throw new Error(leadsError.message)

  const leadsMap = new Map((leads || []).map((row) => [row.id, row as LeadRow]))

  const { data: messages, error: messagesError } = await admin
    .from('mensagens_inbound')
    .select('id, lead_id, conversa_id, created_at, respondido_por_agente, respondido_manualmente')
    .eq('tenant_id', tenantId)
    .in('conversa_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (messagesError) throw new Error(messagesError.message)

  const latestMessageByConversation = new Map<string, MessageRow>()
  const hasLeadInboundByConversation = new Map<string, boolean>()

  for (const row of (messages || []) as MessageRow[]) {
    if (!row.conversa_id) continue
    if (!latestMessageByConversation.has(row.conversa_id)) {
      latestMessageByConversation.set(row.conversa_id, row)
    }
    if (!row.respondido_por_agente && !row.respondido_manualmente) {
      hasLeadInboundByConversation.set(row.conversa_id, true)
    }
  }

  let created = 0
  let skipped = 0

  for (const conversation of filteredConversations) {
    if (!conversation.lead_id) {
      skipped += 1
      continue
    }

    const lead = leadsMap.get(conversation.lead_id)
    const key = `${conversation.lead_id}:conversa_em_aberto`
    const sentAttempts = sentCounts.get(key) || 0

    if (!lead || !lead.telefone || lead.lgpd_optout || lead.status === 'converted') {
      skipped += 1
      continue
    }
    if (activeKeys.has(key) || sentAttempts >= config.maxAttempts) {
      skipped += 1
      continue
    }
    if (blocksOpenConversationRecontact(conversation.estado_operacional, conversation.status)) {
      skipped += 1
      continue
    }

    const latestMessage = latestMessageByConversation.get(conversation.id)
    if (!latestMessage) {
      skipped += 1
      continue
    }

    const assistantLast =
      latestMessage.respondido_por_agente === true || latestMessage.respondido_manualmente === true

    if (!assistantLast || !hasLeadInboundByConversation.get(conversation.id)) {
      skipped += 1
      continue
    }

    await createCandidate(admin, {
      tenantId,
      leadId: conversation.lead_id,
      conversationId: conversation.id,
      whatsappNumberId: conversation.whatsapp_number_id || null,
      type: 'conversa_em_aberto',
      mode: config.mode,
      reason: `Conversa ficou em aberto sem resposta do lead por ${config.openConversationDelayHours}h.`,
      messagePreview: buildOpenConversationMessage(lead.nome),
    })

    created += 1
  }

  return { created, skipped }
}

export async function scanRecontactCandidatesForTenant(
  admin: AdminSupabase,
  tenantId: string,
  config?: RecontactAutomationConfig,
): Promise<RecontactScanResult> {
  const tenantConfig = config || (await getTenantConfig(admin, tenantId))
  if (tenantConfig.mode === 'off') {
    return {
      created: 0,
      skipped: 0,
      createdByType: {
        campanha_sem_resposta: 0,
        conversa_em_aberto: 0,
      },
    }
  }

  const { activeKeys, sentCounts } = await getExistingCandidateState(admin, tenantId)
  const campaignNoReply = await scanCampaignNoReplyCandidates(admin, tenantId, tenantConfig, activeKeys, sentCounts)
  const openConversation = await scanOpenConversationCandidates(admin, tenantId, tenantConfig, activeKeys, sentCounts)

  return {
    created: campaignNoReply.created + openConversation.created,
    skipped: campaignNoReply.skipped + openConversation.skipped,
    createdByType: {
      campanha_sem_resposta: campaignNoReply.created,
      conversa_em_aberto: openConversation.created,
    },
  }
}

export async function listRecontactCandidates(admin: AdminSupabase, tenantId: string, limit = 100) {
  const { data, error } = await admin
    .from('automation_recontact_candidates')
    .select(`
      *,
      leads(id, nome, telefone, status),
      conversas(id, status, estado_operacional, telefone)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

async function leadRepliedSinceCandidate(
  admin: AdminSupabase,
  tenantId: string,
  leadId: string,
  candidateCreatedAt: string,
) {
  const { data, error } = await admin
    .from('mensagens_inbound')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .eq('respondido_por_agente', false)
    .eq('respondido_manualmente', false)
    .gte('created_at', candidateCreatedAt)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data?.id)
}

export async function dispatchRecontactCandidate(
  admin: AdminSupabase,
  tenantId: string,
  candidateId: string,
): Promise<RecontactDispatchResult> {
  const { data, error } = await admin
    .from('automation_recontact_candidates')
    .select(`
      *,
      leads(id, nome, telefone, status, lgpd_optout),
      conversas(id, status, estado_operacional, telefone, whatsapp_number_id)
    `)
    .eq('tenant_id', tenantId)
    .eq('id', candidateId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Candidato de recontato não encontrado')

  const candidate = data as CandidateRow & {
    leads: LeadRow | null
    conversas: ConversationRow | null
  }

  if (!['detected', 'approved'].includes(candidate.status)) {
    return { candidateId, status: 'skipped', reason: `Candidato em status ${candidate.status}` }
  }

  if (!candidate.leads || !candidate.leads.telefone || candidate.leads.lgpd_optout || candidate.leads.status === 'converted') {
    await admin
      .from('automation_recontact_candidates')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        reason: 'Lead sem telefone elegível ou convertido antes do envio.',
      })
      .eq('id', candidateId)

    return { candidateId, status: 'canceled', reason: 'Lead sem telefone elegível ou convertido.' }
  }

  if (
    candidate.automation_type === 'conversa_em_aberto' &&
    candidate.conversas &&
    blocksOpenConversationRecontact(candidate.conversas.estado_operacional, candidate.conversas.status)
  ) {
    await admin
      .from('automation_recontact_candidates')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        reason: 'Conversa saiu do contexto elegível antes do envio.',
      })
      .eq('id', candidateId)

    return { candidateId, status: 'canceled', reason: 'Conversa saiu do contexto elegível.' }
  }

  if (await leadRepliedSinceCandidate(admin, tenantId, candidate.lead_id, candidate.created_at)) {
    await admin
      .from('automation_recontact_candidates')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        reason: 'Lead respondeu antes do recontato automático.',
      })
      .eq('id', candidateId)

    return { candidateId, status: 'canceled', reason: 'Lead respondeu antes do envio.' }
  }

  const body =
    candidate.message_preview ||
    (candidate.automation_type === 'campanha_sem_resposta'
      ? buildCampaignNoReplyMessage(candidate.leads.nome)
      : buildOpenConversationMessage(candidate.leads.nome))

  const sendResult = await sendWhatsAppMessage({
    tenantId,
    to: candidate.conversas?.telefone || candidate.leads.telefone,
    body,
    preferredNumberId: candidate.whatsapp_number_id || candidate.conversas?.whatsapp_number_id || undefined,
  })

  if (!sendResult.success) {
    await admin
      .from('automation_recontact_candidates')
      .update({
        status: 'skipped',
        reason: sendResult.error || 'Falha ao enviar recontato',
        metadata: {
          ...(candidate.metadata || {}),
          dispatch_error: sendResult.error || 'Falha ao enviar recontato',
        },
      })
      .eq('id', candidateId)

    return { candidateId, status: 'skipped', reason: sendResult.error || 'Falha ao enviar recontato' }
  }

  await admin.from('mensagens_inbound').insert({
    tenant_id: tenantId,
    lead_id: candidate.lead_id,
    campanha_id: candidate.campanha_id,
    conversa_id: candidate.conversa_id,
    whatsapp_number_id: candidate.whatsapp_number_id || candidate.conversas?.whatsapp_number_id || null,
    telefone_remetente: sendResult.from || null,
    telefone_destinatario: candidate.conversas?.telefone || candidate.leads.telefone,
    mensagem: body,
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: body,
    twilio_sid: sendResult.externalMessageId || null,
  })

  if (candidate.conversa_id) {
    await admin
      .from('conversas')
      .update({
        ultima_mensagem: body,
        ultima_mensagem_at: new Date().toISOString(),
      })
      .eq('id', candidate.conversa_id)
  }

  await admin
    .from('automation_recontact_candidates')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        ...(candidate.metadata || {}),
        external_message_id: sendResult.externalMessageId || null,
      },
    })
    .eq('id', candidateId)

  return { candidateId, status: 'sent' }
}

export async function processLiveRecontactForTenant(
  admin: AdminSupabase,
  tenantId: string,
  config?: RecontactAutomationConfig,
) {
  const tenantConfig = config || (await getTenantConfig(admin, tenantId))
  if (tenantConfig.mode !== 'live') {
    return { scanned: false, dispatched: 0 }
  }

  await scanRecontactCandidatesForTenant(admin, tenantId, tenantConfig)

  const todayStartIso = new Date()
  todayStartIso.setHours(0, 0, 0, 0)

  const { data: sentToday, error: sentError } = await admin
    .from('automation_recontact_candidates')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .gte('sent_at', todayStartIso.toISOString())

  if (sentError) throw new Error(sentError.message)

  const remaining = Math.max(tenantConfig.dailyLimit - (sentToday || []).length, 0)
  if (remaining <= 0) return { scanned: true, dispatched: 0 }

  const { data: detected, error: detectedError } = await admin
    .from('automation_recontact_candidates')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'detected')
    .order('eligible_at', { ascending: true })
    .limit(remaining)

  if (detectedError) throw new Error(detectedError.message)

  let dispatched = 0
  for (const row of (detected || []) as Array<{ id: string }>) {
    const result = await dispatchRecontactCandidate(admin, tenantId, row.id)
    if (result.status === 'sent') dispatched += 1
  }

  return { scanned: true, dispatched }
}

export function isRecontactFoundationMissing(error: unknown) {
  return isMissingRecontactFoundationError(error)
}
