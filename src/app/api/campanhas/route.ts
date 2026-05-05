export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { resolveWhatsAppChannel } from '@/lib/whatsapp-provider'
import { normalizeOperationProfile } from '@/lib/operation-profile'
import {
  applyWarmupPolicyToThrottleSettings,
  getWhatsAppWarmupPolicy,
} from '@/lib/whatsapp-warmup'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Erro desconhecido')
}

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const LISTA_SELECAO_PERSONALIZADA_NOME = 'Seleção personalizada'
const LISTA_SELECAO_PERSONALIZADA_FORNECEDOR = 'sistema'
const ALLOWED_CONTACT_TARGET_TYPES = new Set(['titular', 'conjuge', 'filho', 'irmao'])
const ALLOWED_LEAD_STATUSES = new Set(['new', 'contacted', 'awaiting', 'scheduled', 'converted', 'lost'])

async function getOrCreateSelectionList(adminClient: ReturnType<typeof createAdminClient>, tenantId: string, usuarioId: string) {
  const { data: existing, error: existingError } = await adminClient
    .from('listas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('nome', LISTA_SELECAO_PERSONALIZADA_NOME)
    .eq('fornecedor', LISTA_SELECAO_PERSONALIZADA_FORNECEDOR)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.id) return existing.id

  const { data: created, error: createdError } = await adminClient
    .from('listas')
    .insert({
      tenant_id: tenantId,
      nome: LISTA_SELECAO_PERSONALIZADA_NOME,
      fornecedor: LISTA_SELECAO_PERSONALIZADA_FORNECEDOR,
      arquivo_original: null,
      total_registros: 0,
      total_ativos: 0,
      total_cessados: 0,
      total_duplicados: 0,
      ganho_potencial_total: 0,
      ganho_potencial_medio: 0,
      percentual_com_telefone: 0,
      importado_por: usuarioId,
    })
    .select('id')
    .single()

  if (createdError || !created?.id) {
    throw new Error(createdError?.message || 'Falha ao criar lista técnica para seleção personalizada')
  }

  return created.id
}

async function insertCampaignLeadLinks(
  adminClient: ReturnType<typeof createAdminClient>,
  campaignId: string,
  tenantId: string,
  leadIds: string[],
) {
  const chunkSize = 500

  for (let index = 0; index < leadIds.length; index += chunkSize) {
    const chunk = leadIds.slice(index, index + chunkSize)
    const { error } = await adminClient
      .from('campanha_leads')
      .insert(
        chunk.map((leadId) => ({
          campanha_id: campaignId,
          lead_id: leadId,
          tenant_id: tenantId,
        })),
      )

    if (error) throw new Error(error.message)
  }
}

export async function GET() {
  try {
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    let query = adminClient
      .from('campanhas')
      .select('*, listas(nome), agentes(id, nome_interno, nome_publico)')
      .order('created_at', { ascending: false })
    query = context.tenantId ? query.eq('tenant_id', context.tenantId) : query.is('tenant_id', null)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const campaigns = data || []
    const campaignIds = campaigns.map((campaign) => campaign.id).filter(Boolean)

    if (campaignIds.length === 0) {
      return NextResponse.json({ campanhas: campaigns })
    }

    const earliestCampaignCreatedAt = campaigns.reduce<string | null>((earliest, campaign) => {
      if (!campaign.created_at) return earliest
      if (!earliest || campaign.created_at < earliest) return campaign.created_at
      return earliest
    }, null)

    const [campaignMessageResponsesResult, inboundResponsesResult, campaignLeadLinksResult] = await Promise.all([
      adminClient
        .from('campanha_mensagens')
        .select('campanha_id, lead_id')
        .in('campanha_id', campaignIds)
        .eq('status', 'respondido'),
      adminClient
        .from('mensagens_inbound')
        .select('campanha_id, lead_id, respondido_por_agente, respondido_manualmente')
        .in('campanha_id', campaignIds)
        .eq('respondido_por_agente', false)
        .eq('respondido_manualmente', false),
      adminClient
        .from('campanha_leads')
        .select('campanha_id, lead_id')
        .in('campanha_id', campaignIds),
    ])

    if (campaignMessageResponsesResult.error) {
      return NextResponse.json({ error: campaignMessageResponsesResult.error.message }, { status: 500 })
    }

    if (inboundResponsesResult.error) {
      return NextResponse.json({ error: inboundResponsesResult.error.message }, { status: 500 })
    }

    if (campaignLeadLinksResult.error) {
      return NextResponse.json({ error: campaignLeadLinksResult.error.message }, { status: 500 })
    }

    const campaignMessageResponseMap = new Map<string, Set<string>>()
    for (const row of campaignMessageResponsesResult.data || []) {
      if (!row.campanha_id || !row.lead_id) continue
      const campaignLeadSet = campaignMessageResponseMap.get(row.campanha_id) || new Set<string>()
      campaignLeadSet.add(row.lead_id)
      campaignMessageResponseMap.set(row.campanha_id, campaignLeadSet)
    }

    const inboundResponseMap = new Map<string, Set<string>>()
    for (const row of inboundResponsesResult.data || []) {
      if (!row.campanha_id || !row.lead_id) continue
      const campaignLeadSet = inboundResponseMap.get(row.campanha_id) || new Set<string>()
      campaignLeadSet.add(row.lead_id)
      inboundResponseMap.set(row.campanha_id, campaignLeadSet)
    }

    const campaignLeadIdsMap = new Map<string, Set<string>>()
    const selectedLeadIds = new Set<string>()
    for (const row of campaignLeadLinksResult.data || []) {
      if (!row.campanha_id || !row.lead_id) continue
      const campaignLeadSet = campaignLeadIdsMap.get(row.campanha_id) || new Set<string>()
      campaignLeadSet.add(row.lead_id)
      campaignLeadIdsMap.set(row.campanha_id, campaignLeadSet)
      selectedLeadIds.add(row.lead_id)
    }

    const fallbackInboundByLeadMap = new Map<string, string[]>()
    if (selectedLeadIds.size > 0 && earliestCampaignCreatedAt) {
      const { data: fallbackInboundRows, error: fallbackInboundError } = await adminClient
        .from('mensagens_inbound')
        .select('lead_id, created_at')
        .in('lead_id', Array.from(selectedLeadIds))
        .eq('respondido_por_agente', false)
        .eq('respondido_manualmente', false)
        .gte('created_at', earliestCampaignCreatedAt)

      if (fallbackInboundError) {
        return NextResponse.json({ error: fallbackInboundError.message }, { status: 500 })
      }

      for (const row of fallbackInboundRows || []) {
        if (!row.lead_id || !row.created_at) continue
        const timestamps = fallbackInboundByLeadMap.get(row.lead_id) || []
        timestamps.push(row.created_at)
        fallbackInboundByLeadMap.set(row.lead_id, timestamps)
      }
    }

    const hydratedCampaigns = campaigns.map((campaign) => {
      const respondedByCounter = Number(campaign.total_respondidos || 0)
      const respondedByCampaignMessages =
        campaignMessageResponseMap.get(campaign.id)?.size || 0
      const respondedByInboxInbound =
        inboundResponseMap.get(campaign.id)?.size || 0
      const respondedBySelectedLeadsFallback = Array.from(
        campaignLeadIdsMap.get(campaign.id) || [],
      ).filter((leadId) => {
        const timestamps = fallbackInboundByLeadMap.get(leadId) || []
        return timestamps.some((timestamp) => timestamp >= campaign.created_at)
      }).length

      return {
        ...campaign,
        total_respondidos: Math.max(
          respondedByCounter,
          respondedByCampaignMessages,
          respondedByInboxInbound,
          respondedBySelectedLeadsFallback,
        ),
      }
    })

    return NextResponse.json({ campanhas: hydratedCampaigns })
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!context.tenantId) {
      return NextResponse.json({ error: 'Tenant não resolvido para este usuário' }, { status: 400 })
    }
    if (!context.usuarioId) {
      return NextResponse.json({ error: 'Usuário atual não resolvido para este tenant' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const tenantId = context.tenantId
    const usuarioId = context.usuarioId
    const body = await request.json()
    const {
      nome,
      lista_id,
      target_mode,
      lead_ids,
      lead_status,
      mensagem_template,
      delay_min_ms,
      delay_max_ms,
      tamanho_lote,
      pausa_entre_lotes_s,
      limite_diario,
      apenas_verificados,
      agendado_para,
      agente_id,
      whatsapp_number_id,
      contato_alvo_tipo,
    } = body

    let resolvedAgenteId =
      typeof agente_id === 'string' && agente_id.trim()
        ? agente_id.trim()
        : null
    let resolvedOperationProfile: string | null = null

    const selectedLeadIds = Array.isArray(lead_ids)
      ? lead_ids.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
      : []
    const campaignTargetMode =
      target_mode === 'selecionados'
        ? 'selecionados'
        : target_mode === 'status'
          ? 'status'
          : 'lista'
    const normalizedLeadStatus =
      typeof lead_status === 'string' && lead_status.trim()
        ? lead_status.trim().toLowerCase()
        : null

    if (!nome || !mensagem_template) {
      return NextResponse.json({ error: 'nome e mensagem_template são obrigatórios' }, { status: 400 })
    }

    const normalizedContatoAlvoTipo =
      typeof contato_alvo_tipo === 'string' && contato_alvo_tipo.trim()
        ? contato_alvo_tipo.trim().toLowerCase()
        : null

    if (normalizedContatoAlvoTipo && !ALLOWED_CONTACT_TARGET_TYPES.has(normalizedContatoAlvoTipo)) {
      return NextResponse.json({ error: 'contato_alvo_tipo inválido' }, { status: 400 })
    }

    if (campaignTargetMode === 'lista' && !lista_id) {
      return NextResponse.json({ error: 'lista_id é obrigatório para campanhas por lista' }, { status: 400 })
    }

    if (campaignTargetMode === 'selecionados' && selectedLeadIds.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos um contato para a campanha personalizada' }, { status: 400 })
    }

    if (campaignTargetMode === 'status' && (!normalizedLeadStatus || !ALLOWED_LEAD_STATUSES.has(normalizedLeadStatus))) {
      return NextResponse.json({ error: 'Selecione um status válido para a campanha por status' }, { status: 400 })
    }

    if (!resolvedAgenteId) {
      const { data: defaultAgent } = await adminClient
        .from('agentes')
        .select('id, perfil_operacao')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .eq('is_default', true)
        .maybeSingle()

      resolvedAgenteId = defaultAgent?.id || null
      resolvedOperationProfile = defaultAgent?.perfil_operacao || null
    }

    if (resolvedAgenteId && !resolvedOperationProfile) {
      const { data: selectedAgent, error: selectedAgentError } = await adminClient
        .from('agentes')
        .select('perfil_operacao')
        .eq('tenant_id', tenantId)
        .eq('id', resolvedAgenteId)
        .maybeSingle()

      if (selectedAgentError) {
        return NextResponse.json({ error: selectedAgentError.message }, { status: 500 })
      }

      resolvedOperationProfile = selectedAgent?.perfil_operacao || null
    }

    const normalizedOperationProfile = normalizeOperationProfile(resolvedOperationProfile)
    const defaultOnlyVerified =
      normalizedOperationProfile === 'planejamento_previdenciario' ? false : true

    let resolvedListaId = lista_id
    let totalLeads = 0
    let resolvedLeadIdsForCampaign: string[] = selectedLeadIds

    if (campaignTargetMode === 'lista') {
      let listaQuery = adminClient
        .from('listas')
        .select('id')
        .eq('id', lista_id)
      listaQuery = tenantId ? listaQuery.eq('tenant_id', tenantId) : listaQuery.is('tenant_id', null)
      const { data: lista } = await listaQuery.maybeSingle()

      if (!lista) {
        return NextResponse.json({ error: 'Lista não encontrada para este tenant' }, { status: 404 })
      }

      let countQuery = adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('lista_id', lista_id)
        .eq('lgpd_optout', false)
      countQuery = tenantId ? countQuery.eq('tenant_id', tenantId) : countQuery.is('tenant_id', null)
      const { count } = await countQuery
      totalLeads = count || 0
    } else if (campaignTargetMode === 'selecionados') {
      resolvedListaId = await getOrCreateSelectionList(adminClient, tenantId, usuarioId)
      const { data: selectedLeads, error: selectedLeadsError } = await adminClient
        .from('leads')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('id', selectedLeadIds)
        .eq('lgpd_optout', false)

      if (selectedLeadsError) {
        return NextResponse.json({ error: selectedLeadsError.message }, { status: 500 })
      }

      const validLeadIds = new Set((selectedLeads || []).map((lead) => lead.id))
      const missingIds = selectedLeadIds.filter((id: string) => !validLeadIds.has(id))
      if (missingIds.length > 0) {
        return NextResponse.json({ error: 'Alguns contatos selecionados não pertencem ao tenant atual' }, { status: 400 })
      }

      totalLeads = validLeadIds.size
      resolvedLeadIdsForCampaign = selectedLeadIds
    } else {
      resolvedListaId = await getOrCreateSelectionList(adminClient, tenantId, usuarioId)
      const { data: statusLeads, error: statusLeadsError } = await adminClient
        .from('leads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', normalizedLeadStatus as string)
        .eq('lgpd_optout', false)

      if (statusLeadsError) {
        return NextResponse.json({ error: statusLeadsError.message }, { status: 500 })
      }

      resolvedLeadIdsForCampaign = (statusLeads || []).map((lead) => lead.id).filter(Boolean)

      if (resolvedLeadIdsForCampaign.length === 0) {
        return NextResponse.json({ error: 'Nenhum lead elegível foi encontrado para o status selecionado' }, { status: 400 })
      }

      totalLeads = resolvedLeadIdsForCampaign.length
    }

    let channel

    if (typeof whatsapp_number_id === 'string' && whatsapp_number_id.trim()) {
      const { data: selectedChannel, error: selectedChannelError } = await adminClient
        .from('whatsapp_numbers')
        .select('id, ativo, metadata')
        .eq('tenant_id', tenantId)
        .eq('id', whatsapp_number_id.trim())
        .maybeSingle()

      if (selectedChannelError) {
        return NextResponse.json({ error: selectedChannelError.message }, { status: 500 })
      }

      if (!selectedChannel) {
        return NextResponse.json({ error: 'Canal WhatsApp não encontrado para este escritório' }, { status: 404 })
      }

      if (!selectedChannel.ativo) {
        return NextResponse.json({ error: 'O canal WhatsApp selecionado está pausado' }, { status: 400 })
      }

      channel = selectedChannel
    } else {
      channel = await resolveWhatsAppChannel(tenantId)
    }

    const throttleSettings = applyWarmupPolicyToThrottleSettings(
      {
        limitDaily: limite_diario,
        batchSize: tamanho_lote,
        pauseBetweenBatchesS: pausa_entre_lotes_s,
        delayMinMs: delay_min_ms,
        delayMaxMs: delay_max_ms,
      },
      getWhatsAppWarmupPolicy(channel.metadata),
    )

    const { data, error } = await adminClient
      .from('campanhas')
      .insert({
        tenant_id: tenantId,
        whatsapp_number_id: channel.id,
        nome,
        lista_id: resolvedListaId,
        mensagem_template,
        status: 'rascunho',
        total_leads: totalLeads,
        total_contatados: 0,
        total_responderam: 0,
        total_agendados: 0,
        total_convertidos: 0,
        honorarios_gerados: 0,
        total_enviados: 0,
        total_entregues: 0,
        total_lidos: 0,
        total_respondidos: 0,
        total_falhos: 0,
        delay_min_ms: throttleSettings.delayMinMs,
        delay_max_ms: throttleSettings.delayMaxMs,
        tamanho_lote: throttleSettings.batchSize,
        pausa_entre_lotes_s: throttleSettings.pauseBetweenBatchesS,
        limite_diario: throttleSettings.limitDaily,
        apenas_verificados: apenas_verificados ?? defaultOnlyVerified,
        agendado_para: agendado_para || null,
        agente_id: resolvedAgenteId,
        contato_alvo_tipo: normalizedContatoAlvoTipo,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if ((campaignTargetMode === 'selecionados' || campaignTargetMode === 'status') && resolvedLeadIdsForCampaign.length > 0) {
      try {
        await insertCampaignLeadLinks(adminClient, data.id, tenantId, resolvedLeadIdsForCampaign)
      } catch (selectedInsertError) {
        await adminClient.from('campanhas').delete().eq('id', data.id)
        return NextResponse.json({ error: getErrorMessage(selectedInsertError) }, { status: 500 })
      }
    }

    return NextResponse.json({ campanha: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
