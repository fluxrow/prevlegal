export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { resolveWhatsAppChannel } from '@/lib/whatsapp-provider'
import {
  applyWarmupPolicyToThrottleSettings,
  getWhatsAppWarmupPolicy,
} from '@/lib/whatsapp-warmup'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

const LISTA_SELECAO_PERSONALIZADA_NOME = 'Seleção personalizada'
const LISTA_SELECAO_PERSONALIZADA_FORNECEDOR = 'sistema'
const ALLOWED_CONTACT_TARGET_TYPES = new Set(['titular', 'conjuge', 'filho', 'irmao'])

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
    query = applyTenantFilter(query, context.tenantId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campanhas: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const body = await request.json()
    const {
      nome,
      lista_id,
      target_mode,
      lead_ids,
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

    const selectedLeadIds = Array.isArray(lead_ids)
      ? lead_ids.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
      : []
    const campaignTargetMode = target_mode === 'selecionados' ? 'selecionados' : 'lista'

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

    if (!resolvedAgenteId) {
      const { data: defaultAgent } = await adminClient
        .from('agentes')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('ativo', true)
        .eq('is_default', true)
        .maybeSingle()

      resolvedAgenteId = defaultAgent?.id || null
    }

    let resolvedListaId = lista_id
    let totalLeads = 0

    if (campaignTargetMode === 'lista') {
      let listaQuery = adminClient
        .from('listas')
        .select('id')
        .eq('id', lista_id)
      listaQuery = applyTenantFilter(listaQuery, context.tenantId)
      const { data: lista } = await listaQuery.maybeSingle()

      if (!lista) {
        return NextResponse.json({ error: 'Lista não encontrada para este tenant' }, { status: 404 })
      }

      let countQuery = adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('lista_id', lista_id)
        .eq('lgpd_optout', false)
      countQuery = applyTenantFilter(countQuery, context.tenantId)
      const { count } = await countQuery
      totalLeads = count || 0
    } else {
      resolvedListaId = await getOrCreateSelectionList(adminClient, context.tenantId, context.usuarioId)
      const { data: selectedLeads, error: selectedLeadsError } = await adminClient
        .from('leads')
        .select('id')
        .eq('tenant_id', context.tenantId)
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
    }

    let channel

    if (typeof whatsapp_number_id === 'string' && whatsapp_number_id.trim()) {
      const { data: selectedChannel, error: selectedChannelError } = await adminClient
        .from('whatsapp_numbers')
        .select('id, ativo, metadata')
        .eq('tenant_id', context.tenantId)
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
      channel = await resolveWhatsAppChannel(context.tenantId)
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
        tenant_id: context.tenantId,
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
        apenas_verificados: apenas_verificados ?? true,
        agendado_para: agendado_para || null,
        agente_id: resolvedAgenteId,
        contato_alvo_tipo: normalizedContatoAlvoTipo,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (campaignTargetMode === 'selecionados' && selectedLeadIds.length > 0) {
      const { error: selectedInsertError } = await adminClient
        .from('campanha_leads')
        .insert(
          selectedLeadIds.map((leadId: string) => ({
            campanha_id: data.id,
            lead_id: leadId,
            tenant_id: context.tenantId,
          })),
        )

      if (selectedInsertError) {
        await adminClient.from('campanhas').delete().eq('id', data.id)
        return NextResponse.json({ error: selectedInsertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ campanha: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
