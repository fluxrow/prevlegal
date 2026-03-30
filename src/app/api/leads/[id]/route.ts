import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

const ALLOWED_STATUS = new Set(['new', 'contacted', 'awaiting', 'scheduled', 'converted', 'lost'])

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

  const [leadRes, anotacoesRes, conversaRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase
      .from('lead_anotacoes')
      .select('id, texto, created_at, usuario_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('conversas')
      .select('id, status')
      .eq('lead_id', id)
      .limit(1)
      .maybeSingle(),
  ])

  if (leadRes.error) return NextResponse.json({ error: leadRes.error.message }, { status: 404 })

  return NextResponse.json({
    lead: leadRes.data,
    anotacoes: anotacoesRes.data || [],
    conversa: conversaRes.data || null,
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
  payload.email = normalizeTrimmed(body.email)
  payload.nb = normalizeTrimmed(body.nb)
  payload.nit = normalizeTrimmed(body.nit)
  payload.banco = normalizeTrimmed(body.banco)
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

  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}
