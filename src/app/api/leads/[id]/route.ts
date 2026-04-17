import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

const ALLOWED_STATUS = new Set(['new', 'contacted', 'awaiting', 'scheduled', 'converted', 'lost'])

function normalizePhoneDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '')
}

function buildPhoneVariants(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const digits = normalizePhoneDigits(value)
  const variants = new Set<string>()

  if (raw) variants.add(raw)
  if (digits) {
    variants.add(digits)
    variants.add(`+${digits}`)
    variants.add(`whatsapp:${digits}`)
    variants.add(`whatsapp:+${digits}`)

    if (digits.startsWith('55') && digits.length > 2) {
      const withoutCountry = digits.slice(2)
      variants.add(withoutCountry)
      variants.add(`+${withoutCountry}`)
      variants.add(`whatsapp:${withoutCountry}`)
      variants.add(`whatsapp:+${withoutCountry}`)
    } else {
      variants.add(`55${digits}`)
      variants.add(`+55${digits}`)
      variants.add(`whatsapp:55${digits}`)
      variants.add(`whatsapp:+55${digits}`)
    }
  }

  return Array.from(variants).filter(Boolean)
}

function buildLeadPhoneVariants(lead: Record<string, unknown>) {
  const phones = [
    lead['telefone'],
    lead['telefone_enriquecido'],
    lead['conjuge_celular'],
    lead['conjuge_telefone'],
    lead['filho_celular'],
    lead['filho_telefone'],
    lead['irmao_celular'],
    lead['irmao_telefone'],
  ]

  const variants = new Set<string>()

  for (const phone of phones) {
    for (const variant of buildPhoneVariants(phone)) {
      variants.add(variant)
    }
  }

  return Array.from(variants)
}

function normalizeTrimmed(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeRequiredName(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeDate(value: unknown) {
  const normalized = normalizeTrimmed(value)
  return normalized || null
}

function normalizeNumeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'sim', 'yes'].includes(normalized)) return true
    if (['false', '0', 'nao', 'não', 'no'].includes(normalized)) return false
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const [leadRes, anotacoesRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase
      .from('lead_anotacoes')
      .select('id, texto, created_at, usuario_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (leadRes.error) return NextResponse.json({ error: leadRes.error.message }, { status: 404 })

  const lead = leadRes.data
  const phoneVariants = buildLeadPhoneVariants(lead)

  let conversa = await supabase
    .from('conversas')
    .select('id, status, telefone, ultima_mensagem_at')
    .eq('lead_id', id)
    .order('ultima_mensagem_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if ((!conversa.data || conversa.error) && phoneVariants.length > 0) {
    const orConditions = phoneVariants.map((phone) => `telefone.eq.${phone}`).join(',')
    conversa = await supabase
      .from('conversas')
      .select('id, status, telefone, ultima_mensagem_at')
      .eq('tenant_id', context.tenantId)
      .or(orConditions)
      .order('ultima_mensagem_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  }

  const messageClauses = [`lead_id.eq.${id}`]
  if (conversa.data?.id) {
    messageClauses.push(`conversa_id.eq.${conversa.data.id}`)
  }
  for (const phone of phoneVariants) {
    messageClauses.push(`telefone_remetente.eq.${phone}`)
    messageClauses.push(`telefone_destinatario.eq.${phone}`)
  }

  const mensagensWhatsappRes = await supabase
    .from('mensagens_inbound')
    .select(`
      id,
      mensagem,
      telefone_remetente,
      telefone_destinatario,
      resposta_agente,
      respondido_por_agente,
      respondido_manualmente,
      created_at,
      conversa_id
    `)
    .eq('tenant_id', context.tenantId)
    .or(messageClauses.join(','))
    .order('created_at', { ascending: true })
    .limit(200)

  return NextResponse.json({
    lead,
    anotacoes: anotacoesRes.data || [],
    conversa: conversa.data || null,
    mensagensWhatsapp: mensagensWhatsappRes.data || [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const nome = normalizeRequiredName(body.nome)
  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  payload.nome = nome

  const status = normalizeTrimmed(body.status)
  if (status && !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  payload.status = status || 'new'
  payload.cpf = normalizeTrimmed(body.cpf)
  payload.telefone = normalizeTrimmed(body.telefone)
  payload.telefone_enriquecido = normalizeTrimmed(body.telefone_enriquecido)
  payload.conjuge_nome = normalizeTrimmed(body.conjuge_nome)
  payload.conjuge_celular = normalizeTrimmed(body.conjuge_celular)
  payload.conjuge_telefone = normalizeTrimmed(body.conjuge_telefone)
  payload.filho_nome = normalizeTrimmed(body.filho_nome)
  payload.filho_celular = normalizeTrimmed(body.filho_celular)
  payload.filho_telefone = normalizeTrimmed(body.filho_telefone)
  payload.irmao_nome = normalizeTrimmed(body.irmao_nome)
  payload.irmao_celular = normalizeTrimmed(body.irmao_celular)
  payload.irmao_telefone = normalizeTrimmed(body.irmao_telefone)
  payload.contato_abordagem_tipo = normalizeTrimmed(body.contato_abordagem_tipo)
  payload.contato_abordagem_origem = normalizeTrimmed(body.contato_abordagem_origem)
  payload.contato_alternativo_tipo = normalizeTrimmed(body.contato_alternativo_tipo)
  payload.contato_alternativo_origem = normalizeTrimmed(body.contato_alternativo_origem)
  payload.nb = normalizeTrimmed(body.nb)
  payload.nit = normalizeTrimmed(body.nit)
  payload.banco = normalizeTrimmed(body.banco)
  payload.anotacao = normalizeTrimmed(body.anotacao)
  payload.tipo_beneficio = normalizeTrimmed(body.tipo_beneficio)
  payload.aps = normalizeTrimmed(body.aps)
  payload.sexo = normalizeTrimmed(body.sexo)
  payload.categoria_profissional = normalizeTrimmed(body.categoria_profissional)
  payload.forma_pagamento = normalizeTrimmed(body.forma_pagamento)
  payload.isencao_ir = normalizeTrimmed(body.isencao_ir)
  payload.pensionista = normalizeTrimmed(body.pensionista)
  payload.data_nascimento = normalizeDate(body.data_nascimento)
  payload.dib = normalizeDate(body.dib)
  payload.der = normalizeDate(body.der)

  const bloqueado = normalizeBoolean(body.bloqueado)
  if (bloqueado !== null) {
    payload.bloqueado = bloqueado
  }

  const ganhoPotencial = normalizeNumeric(body.ganho_potencial)
  if (body.ganho_potencial !== undefined) {
    payload.ganho_potencial = ganhoPotencial
  }

  const valorRma = normalizeNumeric(body.valor_rma)
  if (body.valor_rma !== undefined) {
    payload.valor_rma = valorRma
  }

  const { data: oldLead } = await supabase.from('leads').select('status').eq('id', id).single()

  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Se o status mudou, dispara a orquestração via background (assíncrono)
  if (oldLead && payload.status && oldLead.status !== payload.status) {
    // Importa dinamicamente para não bloquear a inicialização ou apenas importa no topo
    const { processEventTriggers } = await import('@/lib/events/orchestrator')
    
    // Executa e "esquece" (sem await estrito atrapalhando o tempo de resposta se não for necessário)
    // Usamos await para não ser abortado no Vercel Edge/Serverless prematuramente, mas é rápido.
    await processEventTriggers(context.tenantId, id, 'lead_status_mudou', payload.status as string)
      .catch(err => console.error('[Orquestrador] Erro ao disparar gatilho:', err))
  }

  return NextResponse.json({ lead: data })
}
