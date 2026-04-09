import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { getZApiRoutingContextByInstanceId } from '@/lib/whatsapp-provider'
import { normalizeWhatsAppRecipient } from '@/lib/twilio'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function parseJsonIfPossible(value: unknown) {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (!trimmed) return value

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }

  return value
}

function normalizeParsedPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeParsedPayload(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeParsedPayload(parseJsonIfPossible(entry)),
      ]),
    )
  }

  return value
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const entries = Array.from(searchParams.entries())
  const grouped = new Map<string, string[]>()

  for (const [key, value] of entries) {
    grouped.set(key, [...(grouped.get(key) || []), value])
  }

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([key, values]) => [
      key,
      values.length === 1 ? values[0] : values,
    ]),
  )
}

async function parseWebhookPayload(request: NextRequest) {
  const rawBody = await request.text().catch(() => '')
  const contentType = (request.headers.get('content-type') || '').toLowerCase()

  if (!rawBody.trim()) {
    return searchParamsToObject(request.nextUrl.searchParams)
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return normalizeParsedPayload(searchParamsToObject(new URLSearchParams(rawBody)))
  }

  if (contentType.includes('application/json')) {
    try {
      return normalizeParsedPayload(JSON.parse(rawBody))
    } catch {
      return { raw: rawBody }
    }
  }

  try {
    return normalizeParsedPayload(JSON.parse(rawBody))
  } catch {
    const asParams = new URLSearchParams(rawBody)
    if (Array.from(asParams.keys()).length > 0) {
      return normalizeParsedPayload(searchParamsToObject(asParams))
    }
  }

  return { raw: rawBody }
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

function getNestedValue(source: unknown, path: string[]) {
  let current = source as any
  for (const segment of path) {
    if (current == null || typeof current !== 'object' || !(segment in current)) {
      return undefined
    }
    current = current[segment]
  }
  return current
}

function pickFirstString(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = getNestedValue(source, path)
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function pickFirstBoolean(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = getNestedValue(source, path)
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false
    }
  }
  return false
}

function getCandidateSources(payload: unknown) {
  const candidates: unknown[] = [payload]
  const data = getNestedValue(payload, ['data'])
  const message = getNestedValue(payload, ['message'])
  const messages = getNestedValue(payload, ['messages'])
  const dataMessages = getNestedValue(payload, ['data', 'messages'])

  if (data) candidates.push(data)
  if (message) candidates.push(message)
  if (Array.isArray(messages) && messages[0]) candidates.push(messages[0])
  if (Array.isArray(dataMessages) && dataMessages[0]) candidates.push(dataMessages[0])

  return candidates
}

function pickFirstStringFromSources(sources: unknown[], paths: string[][]) {
  for (const source of sources) {
    const value = pickFirstString(source, paths)
    if (value) return value
  }
  return ''
}

function pickFirstBooleanFromSources(sources: unknown[], paths: string[][]) {
  for (const source of sources) {
    const value = pickFirstBoolean(source, paths)
    if (value) return true
  }
  return false
}

function normalizeStoredPhone(value?: string | null) {
  const normalized = normalizeWhatsAppRecipient(value)
  return normalized || ''
}

function getPhoneDigits(value?: string | null) {
  return normalizeStoredPhone(value).replace(/\D/g, '')
}

function buildInboundLeadNb(phoneDigits: string) {
  return `WHATSAPP-${phoneDigits || Date.now().toString()}`
}

function getNormalizedPhoneVariants(value: string) {
  const normalized = normalizeStoredPhone(value)
  const digits = normalized.replace(/\D/g, '')
  const local = digits.startsWith('55') ? digits.slice(2) : digits

  return Array.from(
    new Set(
      [normalized, digits, local]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

async function ensureManualListId(
  supabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string,
  responsavelId?: string | null,
) {
  const { data: existing } = await supabase
    .from('listas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('nome', LISTA_MANUAL_NOME)
    .eq('fornecedor', LISTA_MANUAL_FORNECEDOR)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: created, error } = await supabase
    .from('listas')
    .insert({
      tenant_id: tenantId,
      nome: LISTA_MANUAL_NOME,
      fornecedor: LISTA_MANUAL_FORNECEDOR,
      arquivo_original: null,
      total_registros: 0,
      total_ativos: 0,
      total_cessados: 0,
      total_duplicados: 0,
      ganho_potencial_total: 0,
      ganho_potencial_medio: 0,
      percentual_com_telefone: 0,
      importado_por: responsavelId || null,
    })
    .select('id')
    .single()

  if (error || !created?.id) {
    throw new Error(error?.message || 'Erro ao criar lista manual para inbound Z-API')
  }

  return created.id as string
}

async function ensureLeadForInbound(
  supabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string,
  from: string,
  body: string,
) {
  const phoneDigits = getPhoneDigits(from)
  const phone10or11 = phoneDigits.startsWith('55') ? phoneDigits.slice(2) : phoneDigits
  const phoneVariants = getNormalizedPhoneVariants(from)

  const exactConditions = phoneVariants.flatMap((value) => [
    `telefone.eq.${value}`,
    `telefone_enriquecido.eq.${value}`,
  ])

  let leadQuery = supabase
    .from('leads')
    .select('id, nome, status, campanha_id, tenant_id, telefone, telefone_enriquecido')
    .or(exactConditions.join(','))
    .eq('tenant_id', tenantId)
    .limit(2)

  const { data: leadMatches } = await leadQuery
  const exactLead = (leadMatches || []).length === 1 ? leadMatches?.[0] : null
  if (exactLead) return exactLead

  const suffix = phone10or11.slice(-8) || phoneDigits.slice(-8)
  if (suffix) {
    const { data: candidateMatches } = await supabase
      .from('leads')
      .select('id, nome, status, campanha_id, tenant_id, telefone, telefone_enriquecido')
      .or(`telefone.like.*${suffix}*,telefone_enriquecido.like.*${suffix}*`)
      .eq('tenant_id', tenantId)
      .limit(25)

    const normalizedCandidates = (candidateMatches || []).filter((candidate) => {
      const candidateVariants = [
        ...getNormalizedPhoneVariants(candidate.telefone || ''),
        ...getNormalizedPhoneVariants(candidate.telefone_enriquecido || ''),
      ]

      return candidateVariants.some((variant) => phoneVariants.includes(variant))
    })

    if (normalizedCandidates.length === 1) {
      return normalizedCandidates[0]
    }
  }

  const { data: fallbackUsuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const listaId = await ensureManualListId(supabase, tenantId, fallbackUsuario?.id || null)
  const inboundNb = buildInboundLeadNb(phoneDigits)

  const { data: novoLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      tenant_id: tenantId,
      lista_id: listaId,
      nome: `Lead WhatsApp ${phone10or11 || phoneDigits || from}`,
      telefone: phone10or11 || phoneDigits || from,
      nb: inboundNb,
      status: 'awaiting',
      tem_whatsapp: true,
      origem: 'manual',
      responsavel_id: fallbackUsuario?.id || null,
      enriquecido: false,
      lgpd_optout: false,
    })
    .select('id, nome, status, campanha_id, tenant_id')
    .single()

  if (leadError || !novoLead) {
    throw new Error(leadError?.message || 'Erro ao criar lead automático para inbound Z-API')
  }

  return novoLead
}

function extractInboundPayload(payload: unknown) {
  const sources = getCandidateSources(payload)

  const externalId = pickFirstStringFromSources(sources, [
    ['messageId'],
    ['id'],
    ['zaapId'],
    ['key', 'id'],
  ])

  const from = pickFirstStringFromSources(sources, [
    ['phone'],
    ['from'],
    ['senderPhone'],
    ['fromPhone'],
    ['author'],
    ['chatId'],
    ['sender', 'phone'],
    ['sender', 'id'],
    ['participantPhone'],
  ])

  const to = pickFirstStringFromSources(sources, [
    ['connectedPhone'],
    ['to'],
    ['toPhone'],
    ['instancePhone'],
    ['ownerPhone'],
    ['connectedNumber'],
  ])

  const message = pickFirstStringFromSources(sources, [
    ['text', 'message'],
    ['text', 'body'],
    ['message'],
    ['body'],
    ['caption'],
    ['content'],
    ['extendedTextMessage', 'text'],
  ])

  const fromMe = pickFirstBooleanFromSources(sources, [
    ['fromMe'],
    ['isSentByMe'],
    ['fromApi'],
    ['key', 'fromMe'],
  ])

  return {
    externalId,
    from,
    to,
    message,
    fromMe,
  }
}

async function handleReceiveEvent(request: NextRequest, event: string) {
  const supabase = createAdminSupabase()
  const payload = await parseWebhookPayload(request)

  const instanceId =
    request.nextUrl.searchParams.get('instance_id') ||
    pickFirstString(payload, [['instanceId'], ['instance', 'id'], ['data', 'instanceId']])

  const routing = await getZApiRoutingContextByInstanceId(instanceId)
  if (!routing.tenantId || !routing.channelId) {
    return NextResponse.json(
      { ok: false, ignored: true, reason: 'Canal Z-API não encontrado para a instância' },
      { status: 202 },
    )
  }

  const inbound = extractInboundPayload(payload)
  const from = normalizeStoredPhone(inbound.from)
  const to = normalizeStoredPhone(inbound.to || routing.from)
  const body = inbound.message.trim()

  if (inbound.fromMe) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'Mensagem originada pelo próprio canal' })
  }

  if (!from || !body) {
    console.warn('Webhook inbound Z-API ignorado por payload incompleto', {
      instanceId,
      extracted: inbound,
      topLevelKeys:
        payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>) : [],
    })

    return NextResponse.json(
      { ok: false, ignored: true, reason: 'Payload inbound sem telefone ou mensagem textual' },
      { status: 202 },
    )
  }

  const externalId = inbound.externalId
  if (externalId) {
    let duplicateQuery = supabase
      .from('mensagens_inbound')
      .select('id')
      .eq('twilio_message_sid', externalId)
      .eq('whatsapp_number_id', routing.channelId)

    duplicateQuery = applyTenantFilter(duplicateQuery, routing.tenantId)

    const { data: duplicate } = await duplicateQuery.maybeSingle()
    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true })
    }
  }

  let lead = null as Awaited<ReturnType<typeof ensureLeadForInbound>> | null
  let tenantId = routing.tenantId

  try {
    if (routing.tenantId) {
      lead = await ensureLeadForInbound(supabase, routing.tenantId, from, body)
      tenantId = lead?.tenant_id || routing.tenantId
    }
  } catch (error) {
    console.error('Erro ao garantir lead para inbound Z-API:', error)
  }

  const { data: mensagemInserida, error: insertError } = await supabase
    .from('mensagens_inbound')
    .insert({
      tenant_id: tenantId,
      lead_id: lead?.id || null,
      campanha_id: lead?.campanha_id || null,
      conversa_id: null,
      whatsapp_number_id: routing.channelId,
      telefone_remetente: from,
      telefone_destinatario: to || routing.from,
      mensagem: body,
      twilio_message_sid: externalId || null,
      twilio_sid: event,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Erro ao salvar mensagem inbound Z-API:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  let conversaQuery = supabase
    .from('conversas')
    .select('id, nao_lidas, status')
    .eq('telefone', from)
    .eq('whatsapp_number_id', routing.channelId)

  conversaQuery = applyTenantFilter(conversaQuery, tenantId)
  const { data: conversaExistente } = await conversaQuery.maybeSingle()

  let conversaId: string | null = null
  let shouldResumeHuman = false

  if (conversaExistente) {
    conversaId = conversaExistente.id
    shouldResumeHuman =
      conversaExistente.status === 'aguardando_cliente' ||
      conversaExistente.status === 'resolvido'

    await supabase
      .from('conversas')
      .update({
        status: shouldResumeHuman ? 'humano' : (conversaExistente.status || 'agente'),
        ultima_mensagem: body,
        ultima_mensagem_at: new Date().toISOString(),
        nao_lidas: (conversaExistente.nao_lidas || 0) + 1,
      })
      .eq('id', conversaExistente.id)
  } else {
    const { data: novaConversa, error: conversaError } = await supabase
      .from('conversas')
      .insert({
        tenant_id: tenantId,
        lead_id: lead?.id || null,
        telefone: from,
        status: 'agente',
        ultima_mensagem: body,
        ultima_mensagem_at: new Date().toISOString(),
        nao_lidas: 1,
        whatsapp_number_id: routing.channelId,
      })
      .select('id')
      .single()

    if (conversaError) {
      console.error('Erro ao criar conversa inbound Z-API:', conversaError)
    }

    conversaId = novaConversa?.id || null
  }

  if (conversaId) {
    await supabase
      .from('mensagens_inbound')
      .update({ conversa_id: conversaId })
      .eq('id', mensagemInserida.id)

    const nomeRemetente = lead?.nome || from
    await supabase.from('notificacoes').insert({
      tenant_id: tenantId,
      tipo: 'mensagem',
      titulo: `Nova mensagem de ${nomeRemetente}`,
      descricao: body.slice(0, 100),
      link: '/caixa-de-entrada',
      whatsapp_number_id: routing.channelId,
      metadata: {
        provider: 'zapi',
        conversa_id: conversaId,
        telefone: from,
        instance_id: instanceId,
      },
    })

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

      const msgLower = body.toLowerCase()
      const gatilhoAtivado = gatilhos.find((g: string) => msgLower.includes(g))

      if (gatilhoAtivado) {
        await supabase.from('notificacoes').insert({
          tenant_id: tenantId,
          tipo: 'escalada',
          titulo: `⚠️ Escalada detectada — ${nomeRemetente}`,
          descricao: `Gatilho: "${gatilhoAtivado}" — Mensagem: ${body.slice(0, 80)}`,
          link: '/caixa-de-entrada',
          whatsapp_number_id: routing.channelId,
          metadata: {
            provider: 'zapi',
            conversa_id: conversaId,
            telefone: from,
            gatilho: gatilhoAtivado,
          },
        })
      }
    }
  }

  if (lead?.id) {
    if (lead.status === 'contacted') {
      await supabase
        .from('leads')
        .update({ status: 'awaiting' })
        .eq('id', lead.id)
    }

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
        metadata: {
          provider: 'zapi',
          mensagem: body.slice(0, 200),
          instance_id: instanceId,
        },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    event,
    tenantId,
    conversaId,
    leadId: lead?.id || null,
  })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    provider: 'zapi',
    event: request.nextUrl.searchParams.get('event') || 'health',
  })
}

export async function POST(request: NextRequest) {
  const event = (request.nextUrl.searchParams.get('event') || '').trim().toLowerCase()

  if (event === 'on-receive') {
    return handleReceiveEvent(request, event)
  }

  const payload = await parseWebhookPayload(request)
  return NextResponse.json({
    ok: true,
    ignored: true,
    event: event || 'unknown',
    received: Boolean(payload),
  })
}
