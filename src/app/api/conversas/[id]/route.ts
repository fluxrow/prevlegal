import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { createAdminSupabase } from '@/lib/internal-collaboration'
import { canViewConversationForInbox } from '@/lib/inbox-visibility'

const CONVERSA_STATUS = new Set([
  'agente',
  'humano',
  'aguardando_cliente',
  'resolvido',
  'encerrado',
])

type ConversationMessageRow = {
  id: string
  created_at: string
  twilio_message_sid?: string | null
  twilio_sid?: string | null
  resposta_agente?: string | null
}

function scoreConversationMessage(row: ConversationMessageRow) {
  let score = 0

  if (row.resposta_agente?.trim()) score += 4
  if (row.twilio_sid && row.twilio_sid !== 'on-receive') score += 2
  if (row.twilio_sid === 'on-receive') score -= 1

  return score
}

function dedupeConversationMessages<T extends ConversationMessageRow>(rows: T[]) {
  const byExternalInboundId = new Map<string, T>()
  const fallbackRows: T[] = []

  for (const row of rows) {
    const externalInboundId = String(row.twilio_message_sid || '').trim()

    if (!externalInboundId) {
      fallbackRows.push(row)
      continue
    }

    const existing = byExternalInboundId.get(externalInboundId)
    if (!existing) {
      byExternalInboundId.set(externalInboundId, row)
      continue
    }

    const existingScore = scoreConversationMessage(existing)
    const currentScore = scoreConversationMessage(row)

    if (currentScore > existingScore) {
      byExternalInboundId.set(externalInboundId, row)
      continue
    }

    if (currentScore === existingScore && new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      byExternalInboundId.set(externalInboundId, row)
    }
  }

  return [...fallbackRows, ...byExternalInboundId.values()].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { data: conversa } = await supabase
    .from('conversas')
    .select('id, assumido_por, leads(responsavel_id)')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()
  if (!canViewConversationForInbox(context, conversa)) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('mensagens_inbound')
    .select('*')
    .eq('conversa_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(dedupeConversationMessages((data || []) as ConversationMessageRow[]))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  if (body.action && !contextHasPermission(context, 'inbox_humana_manage')) {
    return NextResponse.json({ error: 'Você não tem permissão para operar a fila humana' }, { status: 403 })
  }

  const { data: conversa } = await supabase
    .from('conversas')
    .select('id, status, assumido_por, assumido_em, leads(responsavel_id)')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()
  if (!canViewConversationForInbox(context, conversa)) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const conversaAtual = conversa!

  const now = new Date().toISOString()
  let payload: Record<string, unknown> | null = null

  switch (body.action) {
    case 'assume':
      payload = {
        status: 'humano',
        assumido_por: context.usuarioId,
        assumido_em: conversaAtual.assumido_em || now,
        nao_lidas: 0,
      }
      break
    case 'return_to_agent':
      payload = {
        status: 'agente',
        assumido_por: null,
        assumido_em: null,
        nao_lidas: 0,
      }
      break
    case 'awaiting_customer':
      payload = {
        status: 'aguardando_cliente',
        assumido_por: conversaAtual.assumido_por || context.usuarioId,
        assumido_em: conversaAtual.assumido_em || now,
      }
      break
    case 'resolve':
      payload = {
        status: 'resolvido',
        assumido_por: conversaAtual.assumido_por || context.usuarioId,
        assumido_em: conversaAtual.assumido_em || now,
        nao_lidas: 0,
      }
      break
    case 'reopen':
      payload = {
        status: 'humano',
        assumido_por: conversaAtual.assumido_por || context.usuarioId,
        assumido_em: conversaAtual.assumido_em || now,
        nao_lidas: 0,
      }
      break
    case 'mark_read':
      payload = { nao_lidas: 0 }
      break
    default:
      if (typeof body.status === 'string' && CONVERSA_STATUS.has(body.status)) {
        payload = { status: body.status }

        if (body.status === 'humano') {
          payload.assumido_por = context.usuarioId
          payload.assumido_em = conversaAtual.assumido_em || now
          payload.nao_lidas = 0
        }

        if (body.status === 'agente') {
          payload.assumido_por = null
          payload.assumido_em = null
          payload.nao_lidas = 0
        }
      }
      break
  }

  if (!payload) {
    return NextResponse.json({ error: 'Atualização de conversa inválida' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conversas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Stop automático de follow-up quando humano assume a conversa
  const assumindo = body.action === 'assume' ||
    (body.status === 'humano' && payload?.assumido_por)

  if (assumindo && data.lead_id && context.tenantId) {
    const admin = createAdminSupabase()
    const { data: runAtiva } = await admin
      .from('followup_runs')
      .select('id, tenant_id')
      .eq('lead_id', data.lead_id)
      .eq('tenant_id', context.tenantId)
      .eq('status', 'ativo')
      .maybeSingle()

    if (runAtiva) {
      await admin
        .from('followup_runs')
        .update({ status: 'stop_automatico', motivo_parada: 'Humano assumiu a conversa' })
        .eq('id', runAtiva.id)

      await admin.from('followup_events').insert({
        tenant_id: runAtiva.tenant_id,
        run_id: runAtiva.id,
        lead_id: data.lead_id,
        tipo: 'stop_humano_assumiu',
        metadata: { assumido_por: context.usuarioId, conversa_id: id },
      })
    }
  }

  return NextResponse.json(data)
}
