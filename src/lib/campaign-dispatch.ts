import { normalizeOperationProfile } from '@/lib/operation-profile'
import { processEventTriggers } from '@/lib/events/orchestrator'
import { resolveWhatsAppChannel, sendWhatsAppMessage } from '@/lib/whatsapp-provider'
import { repairCommonMojibake } from '@/lib/text-repair'
import {
  applyWarmupPolicyToThrottleSettings,
  getWhatsAppWarmupPolicy,
  type CampaignThrottleSettings,
  type WhatsAppWarmupPolicy,
} from '@/lib/whatsapp-warmup'

type QueryError = {
  message: string
}

type QueryResult = {
  data?: unknown
  error?: QueryError | null
  count?: number | null
}

type QueryBuilder = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => QueryBuilder
  eq: (...args: unknown[]) => QueryBuilder
  is: (...args: unknown[]) => QueryBuilder
  in: (...args: unknown[]) => QueryBuilder
  limit: (...args: unknown[]) => QueryBuilder
  maybeSingle: () => PromiseLike<QueryResult>
  single: () => PromiseLike<QueryResult>
  update: (values: Record<string, unknown>) => QueryBuilder
  insert: (values: unknown) => QueryBuilder
  order: (...args: unknown[]) => QueryBuilder
  gte: (...args: unknown[]) => QueryBuilder
}

type AdminClient = {
  from: (table: string) => QueryBuilder
}

type CampaignLeadRow = {
  id: string
  nome?: string | null
  nb?: string | null
  cpf?: string | null
  banco?: string | null
  valor_rma?: number | null
  ganho_potencial?: number | null
  telefone?: string | null
  telefone_enriquecido?: string | null
  conjuge_celular?: string | null
  conjuge_telefone?: string | null
  filho_celular?: string | null
  filho_telefone?: string | null
  irmao_celular?: string | null
  irmao_telefone?: string | null
  tem_whatsapp?: boolean | null
  contato_abordagem_tipo?: string | null
  contato_abordagem_origem?: string | null
  contato_alternativo_tipo?: string | null
  contato_alternativo_origem?: string | null
  status?: string | null
}

type CampaignLeadLinkRow = {
  lead_id: string | null
}

type ConversationLookupRow = {
  id: string
  whatsapp_number_id?: string | null
}

type ResolvedCampaignLead = CampaignLeadRow & {
  _targetPhone: string | null
  _targetType: string
  _targetVerified: boolean
}

type CampaignRow = {
  id: string
  tenant_id: string | null
  nome: string | null
  lista_id: string | null
  agente_id?: string | null
  whatsapp_number_id?: string | null
  mensagem_template: string
  status: string | null
  limite_diario: number | null
  tamanho_lote: number | null
  pausa_entre_lotes_s: number | null
  delay_min_ms: number | null
  delay_max_ms: number | null
  apenas_verificados: boolean | null
  contato_alvo_tipo?: string | null
  total_enviados?: number | null
  total_falhos?: number | null
  total_contatados?: number | null
}

export type CampaignDispatchDiagnostics = {
  totalLeadsBrutos: number
  semContatoResolvido: number
  filtradosNaoVerificados: number
  elegiveisAntesDeLimite: number
  jaTentados: number
  pendentesElegiveis: number
  limiteDiarioEfetivo: number
  loteEfetivo: number
  pausaEntreLotesEfetivaS: number
  delayEfetivoMinMs: number
  delayEfetivoMaxMs: number
  tentadosHoje: number
  disponivelHoje: number
  limitadosHoje: number
  apenasVerificados: boolean
  canal: {
    id: string | null
    provider: 'twilio' | 'zapi'
    from: string
  }
  warmup: WhatsAppWarmupPolicy | null
}

export type CampaignDispatchStepResult = {
  status:
    | 'sent'
    | 'failed'
    | 'completed'
    | 'no_eligible_leads'
    | 'daily_limit_reached'
    | 'inactive'
  leadId?: string
  phone?: string | null
  error?: string
  nextRunAt?: string | null
  diagnostics: CampaignDispatchDiagnostics
}

function normalizePhone(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length === 11) return '+55' + digits
  if (digits.length === 10) return '+55' + digits.slice(0, 2) + '9' + digits.slice(2)
  if (digits.length === 13 && digits.startsWith('55')) return '+' + digits
  if (digits.length === 12 && digits.startsWith('55')) {
    return '+' + digits.slice(0, 4) + '9' + digits.slice(4)
  }
  return null
}

function buildMessage(
  template: string,
  lead: CampaignLeadRow,
  operationProfile?: string | null,
): string {
  const normalizedProfile = normalizeOperationProfile(operationProfile)
  const fullName = repairCommonMojibake(String(lead.nome || '').trim())
  const firstName = fullName.split(/\s+/)[0] || ''
  const campaignName =
    normalizedProfile === 'beneficios_previdenciarios'
      ? fullName || 'Prezado(a)'
      : firstName || 'Prezado(a)'

  return template
    .replace(/\{nome\}/gi, campaignName)
    .replace(/\{nome_completo\}/gi, fullName)
    .replace(/\{nb\}/gi, lead.nb || '')
    .replace(/\{banco\}/gi, lead.banco || '')
    .replace(/\{valor\}/gi, lead.valor_rma ? `R$ ${Number(lead.valor_rma).toFixed(2)}` : '')
    .replace(
      /\{ganho\}/gi,
      lead.ganho_potencial ? `R$ ${Number(lead.ganho_potencial).toFixed(2)}` : '',
    )
}

function normalizeContactType(value: string | null | undefined) {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized || 'titular'
}

function sourceLooksWhatsAppCapable(source: string | null | undefined) {
  const normalized = String(source || '').trim().toUpperCase()
  if (!normalized) return false
  return (
    normalized.includes('WHATSAPP') ||
    normalized.includes('CELULAR') ||
    normalized.includes('MOBILE')
  )
}

function chooseRelatedPhone(celular: string | null | undefined) {
  return {
    phone: celular || null,
    verified: Boolean(celular),
  }
}

function resolveCampaignContactForLead(
  lead: CampaignLeadRow,
  targetType?: string | null,
) {
  const normalizedTarget = String(targetType || '').trim().toLowerCase()

  if (normalizedTarget === 'conjuge') {
    const resolved = chooseRelatedPhone(lead.conjuge_celular)
    return resolved.phone
      ? { phone: resolved.phone, type: 'conjuge', verified: resolved.verified }
      : null
  }

  if (normalizedTarget === 'filho') {
    const resolved = chooseRelatedPhone(lead.filho_celular)
    return resolved.phone
      ? { phone: resolved.phone, type: 'filho', verified: resolved.verified }
      : null
  }

  if (normalizedTarget === 'irmao') {
    const resolved = chooseRelatedPhone(lead.irmao_celular)
    return resolved.phone
      ? { phone: resolved.phone, type: 'irmao', verified: resolved.verified }
      : null
  }

  const candidates = [
    {
      phone: lead.telefone || null,
      type: normalizeContactType(lead.contato_abordagem_tipo),
      verified:
        lead.tem_whatsapp === true ||
        sourceLooksWhatsAppCapable(lead.contato_abordagem_origem),
    },
    {
      phone: lead.telefone_enriquecido || null,
      type: normalizeContactType(lead.contato_alternativo_tipo),
      verified: sourceLooksWhatsAppCapable(lead.contato_alternativo_origem),
    },
  ].filter((candidate) => Boolean(candidate.phone))

  if (!normalizedTarget) {
    return candidates.find((candidate) => candidate.verified) || candidates[0] || null
  }

  return (
    candidates.find(
      (candidate) => candidate.type === normalizedTarget && candidate.verified,
    ) ||
    candidates.find((candidate) => candidate.type === normalizedTarget) ||
    null
  )
}

async function resolveCampaignOperationProfile(
  adminClient: AdminClient,
  tenantId: string | null,
  agenteId: string | null | undefined,
) {
  let query = adminClient
    .from('agentes')
    .select('perfil_operacao')
    .eq('ativo', true)
    .limit(1)

  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)

  if (agenteId) {
    query = query.eq('id', agenteId)
  } else {
    query = query.eq('is_default', true)
  }

  const { data } = await query.maybeSingle()
  return normalizeOperationProfile((data as { perfil_operacao?: string | null } | null)?.perfil_operacao)
}

async function ensureConversationForCampaignLead(
  adminClient: AdminClient,
  {
    tenantId,
    leadId,
    phone,
    whatsappNumberId,
    lastMessage,
  }: {
    tenantId: string | null
    leadId: string
    phone: string
    whatsappNumberId: string | null
    lastMessage: string
  },
) {
  let query = adminClient
    .from('conversas')
    .select('id, status, whatsapp_number_id')
    .eq('lead_id', leadId)
    .limit(1)

  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)

  const { data: existenteData } = await query.maybeSingle()
  const existente = existenteData as ConversationLookupRow | null
  const agora = new Date().toISOString()

  if (existente) {
    await adminClient
      .from('conversas')
      .update({
        telefone: phone,
        whatsapp_number_id: existente.whatsapp_number_id || whatsappNumberId,
        ultima_mensagem: lastMessage,
        ultima_mensagem_at: agora,
      })
      .eq('id', existente.id)

    return existente.id as string
  }

  const { data: criadaData, error } = await adminClient
    .from('conversas')
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      telefone: phone,
      status: 'agente',
      ultima_mensagem: lastMessage,
      ultima_mensagem_at: agora,
      nao_lidas: 0,
      whatsapp_number_id: whatsappNumberId,
    })
    .select('id')
    .single()

  const criada = criadaData as { id?: string | null } | null

  if (error || !criada?.id) {
    throw new Error(error?.message || 'Falha ao criar conversa da campanha')
  }

  return criada.id as string
}

async function promoteLeadToContactedIfNew(
  adminClient: AdminClient,
  tenantId: string | null,
  leadId: string,
) {
  let currentLeadQuery = adminClient
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .limit(1)

  currentLeadQuery = tenantId
    ? currentLeadQuery.eq('tenant_id', tenantId)
    : currentLeadQuery.is('tenant_id', null)

  const { data: currentLeadData } = await currentLeadQuery.maybeSingle()
  const currentLead = currentLeadData as { status?: string | null } | null
  if (!currentLead || currentLead.status !== 'new' || !tenantId) return

  await adminClient
    .from('leads')
    .update({ status: 'contacted', updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('tenant_id', tenantId)

  await processEventTriggers(tenantId, leadId, 'lead_status_mudou', 'contacted').catch((err) =>
    console.error('[Orquestrador] Erro ao disparar gatilho após envio de campanha:', err),
  )
}

async function loadCampaignLeads(
  adminClient: AdminClient,
  campaign: CampaignRow,
) {
  let query = adminClient
    .from('leads')
    .select(
      'id, nome, nb, cpf, telefone, telefone_enriquecido, conjuge_celular, conjuge_telefone, filho_celular, filho_telefone, irmao_celular, irmao_telefone, banco, valor_rma, ganho_potencial, tem_whatsapp, contato_abordagem_tipo, contato_abordagem_origem, contato_alternativo_tipo, contato_alternativo_origem, status',
    )
    .eq('lgpd_optout', false)

  query = campaign.tenant_id ? query.eq('tenant_id', campaign.tenant_id) : query.is('tenant_id', null)

  const { data: selectedLeadRows, error: selectedLeadRowsError } = await adminClient
    .from('campanha_leads')
    .select('lead_id')
    .eq('tenant_id', campaign.tenant_id)
    .eq('campanha_id', campaign.id)

  if (selectedLeadRowsError) {
    throw new Error(selectedLeadRowsError.message)
  }

  const selectedLeadIds = ((selectedLeadRows || []) as CampaignLeadLinkRow[])
    .map((row: CampaignLeadLinkRow) => row.lead_id)
    .filter((leadId): leadId is string => Boolean(leadId))

  if (selectedLeadIds.length > 0) {
    query = query.in('id', selectedLeadIds)
  } else {
    query = query.eq('lista_id', campaign.lista_id)
  }

  const { data: leadsDaLista, error } = await query
  if (error) throw new Error(error.message)

  return (leadsDaLista || []) as CampaignLeadRow[]
}

async function loadCampaignAttemptedLeadIds(adminClient: AdminClient, campaignId: string) {
  const { data, error } = await adminClient
    .from('campanha_mensagens')
    .select('lead_id')
    .eq('campanha_id', campaignId)

  if (error) throw new Error(error.message)
  return new Set(
    ((data || []) as CampaignLeadLinkRow[])
      .map((row: CampaignLeadLinkRow) => row.lead_id)
      .filter((leadId): leadId is string => Boolean(leadId)),
  )
}

async function countCampaignAttemptsToday(adminClient: AdminClient, campaignId: string) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { count, error } = await adminClient
    .from('campanha_mensagens')
    .select('id', { count: 'exact', head: true })
    .eq('campanha_id', campaignId)
    .gte('created_at', start.toISOString())

  if (error) throw new Error(error.message)
  return count || 0
}

async function countCampaignAttemptsTotal(adminClient: AdminClient, campaignId: string) {
  const { count, error } = await adminClient
    .from('campanha_mensagens')
    .select('id', { count: 'exact', head: true })
    .eq('campanha_id', campaignId)

  if (error) throw new Error(error.message)
  return count || 0
}

function nextLocalMidnightIso() {
  const now = new Date()
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 5, 0, 0)
  return next.toISOString()
}

function getRandomDelayMs(settings: CampaignThrottleSettings) {
  const { delayMinMs, delayMaxMs } = settings
  return Math.floor(Math.random() * (delayMaxMs - delayMinMs + 1)) + delayMinMs
}

async function buildCampaignContext(adminClient: AdminClient, campaign: CampaignRow) {
  const operationProfile = await resolveCampaignOperationProfile(
    adminClient,
    campaign.tenant_id,
    campaign.agente_id,
  )
  const channel = await resolveWhatsAppChannel(
    campaign.tenant_id,
    campaign.whatsapp_number_id || null,
  )
  const warmup = getWhatsAppWarmupPolicy(channel.metadata)
  const throttleSettings = applyWarmupPolicyToThrottleSettings(
    {
      limitDaily: campaign.limite_diario || undefined,
      batchSize: campaign.tamanho_lote || undefined,
      pauseBetweenBatchesS: campaign.pausa_entre_lotes_s || undefined,
      delayMinMs: campaign.delay_min_ms || undefined,
      delayMaxMs: campaign.delay_max_ms || undefined,
    },
    warmup,
  )

  const rawLeads = await loadCampaignLeads(adminClient, campaign)
  const attemptedLeadIds = await loadCampaignAttemptedLeadIds(adminClient, campaign.id)

  let semContatoResolvido = 0
  let filtradosNaoVerificados = 0
  const eligibleLeads: ResolvedCampaignLead[] = []

  for (const lead of rawLeads) {
    const resolvedContact = resolveCampaignContactForLead(lead, campaign.contato_alvo_tipo)
    if (!resolvedContact) {
      semContatoResolvido++
      continue
    }

    if (campaign.apenas_verificados && resolvedContact.verified !== true) {
      filtradosNaoVerificados++
      continue
    }

    eligibleLeads.push({
      ...lead,
      _targetPhone: resolvedContact.phone,
      _targetType: resolvedContact.type,
      _targetVerified: resolvedContact.verified,
    })
  }

  const pendingEligibleLeads = eligibleLeads.filter((lead) => !attemptedLeadIds.has(lead.id))
  const tentadosHoje = await countCampaignAttemptsToday(adminClient, campaign.id)
  const disponivelHoje = Math.max(0, throttleSettings.limitDaily - tentadosHoje)

  const diagnostics: CampaignDispatchDiagnostics = {
    totalLeadsBrutos: rawLeads.length,
    semContatoResolvido,
    filtradosNaoVerificados,
    elegiveisAntesDeLimite: eligibleLeads.length,
    jaTentados: attemptedLeadIds.size,
    pendentesElegiveis: pendingEligibleLeads.length,
    limiteDiarioEfetivo: throttleSettings.limitDaily,
    loteEfetivo: throttleSettings.batchSize,
    pausaEntreLotesEfetivaS: throttleSettings.pauseBetweenBatchesS,
    delayEfetivoMinMs: throttleSettings.delayMinMs,
    delayEfetivoMaxMs: throttleSettings.delayMaxMs,
    tentadosHoje,
    disponivelHoje,
    limitadosHoje: Math.max(0, pendingEligibleLeads.length - disponivelHoje),
    apenasVerificados: Boolean(campaign.apenas_verificados),
    canal: {
      id: channel.id,
      provider: channel.provider,
      from: channel.from,
    },
    warmup,
  }

  return {
    channel,
    operationProfile,
    throttleSettings,
    diagnostics,
    pendingEligibleLeads,
  }
}

async function updateCampaignProgress(
  adminClient: AdminClient,
  campaign: CampaignRow,
  updates: Partial<CampaignRow> & Record<string, unknown>,
) {
  const { error } = await adminClient
    .from('campanhas')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaign.id)
    .eq('tenant_id', campaign.tenant_id)

  if (error) throw new Error(error.message)
}

export async function getCampaignDispatchDiagnostics(
  adminClient: AdminClient,
  campaign: CampaignRow,
) {
  const context = await buildCampaignContext(adminClient, campaign)
  return context.diagnostics
}

export async function processCampaignDispatchStep(
  adminClient: AdminClient,
  campaign: CampaignRow,
): Promise<CampaignDispatchStepResult> {
  if (campaign.status !== 'ativa') {
    const diagnostics = await getCampaignDispatchDiagnostics(adminClient, campaign)
    return { status: 'inactive', diagnostics }
  }

  const {
    channel,
    operationProfile,
    throttleSettings,
    diagnostics,
    pendingEligibleLeads,
  } = await buildCampaignContext(adminClient, campaign)

  if (pendingEligibleLeads.length === 0) {
    await updateCampaignProgress(adminClient, campaign, {
      status: 'encerrada',
      concluido_em: new Date().toISOString(),
      agendado_para: null,
    })
    return { status: 'completed', diagnostics }
  }

  if (diagnostics.disponivelHoje <= 0) {
    const nextRunAt = nextLocalMidnightIso()
    await updateCampaignProgress(adminClient, campaign, {
      agendado_para: nextRunAt,
    })
    return { status: 'daily_limit_reached', nextRunAt, diagnostics }
  }

  const lead = pendingEligibleLeads[0]
  const phone = normalizePhone(lead._targetPhone || '')
  const mensagem = buildMessage(campaign.mensagem_template, lead, operationProfile)

  let success = false
  let errorDetail = 'Telefone inválido'
  let nextRunAt: string | null = null

  if (!phone) {
    await adminClient.from('campanha_mensagens').insert({
      campanha_id: campaign.id,
      lead_id: lead.id,
      whatsapp_number_id: channel.id,
      telefone: null,
      mensagem,
      status: 'falhou',
      erro_detalhe: errorDetail,
    })
  } else {
    const result = await sendWhatsAppMessage({
      tenantId: campaign.tenant_id,
      to: phone,
      body: mensagem,
      preferredNumberId: channel.id,
    })

    if (result.success) {
      const conversaId = await ensureConversationForCampaignLead(adminClient, {
        tenantId: campaign.tenant_id,
        leadId: lead.id,
        phone,
        whatsappNumberId: channel.id,
        lastMessage: mensagem,
      })

      await adminClient.from('campanha_mensagens').insert({
        campanha_id: campaign.id,
        lead_id: lead.id,
        whatsapp_number_id: channel.id,
        telefone: phone,
        mensagem,
        status: 'enviado',
        twilio_sid: result.externalMessageId,
        enviado_at: new Date().toISOString(),
      })

      await adminClient.from('mensagens_inbound').insert({
        tenant_id: campaign.tenant_id,
        lead_id: lead.id,
        campanha_id: campaign.id,
        conversa_id: conversaId,
        whatsapp_number_id: channel.id,
        telefone_remetente: result.from || null,
        telefone_destinatario: phone,
        mensagem,
        respondido_por_agente: true,
        respondido_manualmente: false,
        resposta_agente: mensagem,
        twilio_sid: result.externalMessageId,
      })

      await promoteLeadToContactedIfNew(adminClient, campaign.tenant_id, lead.id)
      success = true
    } else {
      errorDetail = result.error || 'Falha no envio WhatsApp'
      await adminClient.from('campanha_mensagens').insert({
        campanha_id: campaign.id,
        lead_id: lead.id,
        whatsapp_number_id: channel.id,
        telefone: phone,
        mensagem,
        status: 'falhou',
        erro_detalhe: errorDetail,
      })
    }
  }

  const attemptedTotal = await countCampaignAttemptsTotal(adminClient, campaign.id)
  const sentTotal = Number(campaign.total_enviados || 0) + (success ? 1 : 0)
  const failedTotal = Number(campaign.total_falhos || 0) + (success ? 0 : 1)
  const attemptedPendingAfter = pendingEligibleLeads.length - 1

  if (attemptedPendingAfter <= 0) {
    await updateCampaignProgress(adminClient, campaign, {
      status: 'encerrada',
      total_enviados: sentTotal,
      total_falhos: failedTotal,
      total_contatados: sentTotal,
      concluido_em: new Date().toISOString(),
      agendado_para: null,
    })

    return {
      status: success ? 'sent' : 'failed',
      leadId: lead.id,
      phone,
      error: success ? undefined : errorDetail,
      diagnostics,
    }
  }

  const nextDelayMs =
    attemptedTotal % throttleSettings.batchSize === 0
      ? throttleSettings.pauseBetweenBatchesS * 1000
      : getRandomDelayMs(throttleSettings)
  nextRunAt = new Date(Date.now() + nextDelayMs).toISOString()

  await updateCampaignProgress(adminClient, campaign, {
    status: 'ativa',
    total_enviados: sentTotal,
    total_falhos: failedTotal,
    total_contatados: sentTotal,
    agendado_para: nextRunAt,
  })

  return {
    status: success ? 'sent' : 'failed',
    leadId: lead.id,
    phone,
    error: success ? undefined : errorDetail,
    nextRunAt,
    diagnostics,
  }
}
