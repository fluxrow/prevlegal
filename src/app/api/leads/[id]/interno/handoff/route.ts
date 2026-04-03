import { NextRequest, NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import {
  createAdminSupabase,
  getOrCreateLeadThread,
  getTenantUsuarioById,
  getTenantUsuariosMap,
} from '@/lib/internal-collaboration'

const ALLOWED_STATUS = new Set(['agente', 'humano', 'aguardando_cliente', 'resolvido', 'financeiro', 'juridico'])

function normalizeTrimmed(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const toUsuarioId = normalizeTrimmed(body.to_usuario_id)
  const motivo = normalizeTrimmed(body.motivo)
  const statusDestino = normalizeTrimmed(body.status_destino) || 'humano'

  if (!toUsuarioId) return NextResponse.json({ error: 'Destino obrigatório' }, { status: 400 })
  if (!ALLOWED_STATUS.has(statusDestino)) {
    return NextResponse.json({ error: 'Status de destino inválido' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const usuarioDestino = await getTenantUsuarioById(supabase, context.tenantId, toUsuarioId)
  if (!usuarioDestino?.ativo) {
    return NextResponse.json({ error: 'Destino inválido para este tenant' }, { status: 400 })
  }

  const { data: conversa, error: conversaError } = await supabase
    .from('conversas')
    .select('id, status, assumido_por, assumido_em')
    .eq('lead_id', id)
    .eq('tenant_id', context.tenantId)
    .limit(1)
    .maybeSingle()

  if (conversaError) return NextResponse.json({ error: conversaError.message }, { status: 500 })

  const thread = await getOrCreateLeadThread(supabase, {
    tenantId: context.tenantId,
    leadId: id,
    usuarioId: context.usuarioId,
    currentOwnerUsuarioId: toUsuarioId,
  })

  const now = new Date().toISOString()

  const { error: threadError } = await supabase
    .from('lead_threads_internas')
    .update({
      current_owner_usuario_id: toUsuarioId,
      updated_at: now,
    })
    .eq('id', thread.id)
    .eq('tenant_id', context.tenantId)

  if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 })

  const { data: handoff, error: handoffError } = await supabase
    .from('lead_handoffs')
    .insert({
      tenant_id: context.tenantId,
      lead_id: id,
      conversa_id: conversa?.id || null,
      thread_id: thread.id,
      from_usuario_id: context.usuarioId,
      to_usuario_id: toUsuarioId,
      motivo,
      status_destino: statusDestino,
    })
    .select('id, from_usuario_id, to_usuario_id, motivo, status_destino, created_at')
    .single()

  if (handoffError || !handoff) return NextResponse.json({ error: handoffError?.message || 'Erro ao registrar handoff' }, { status: 500 })

  const messageText = motivo
    ? `Responsabilidade transferida. Motivo: ${motivo}`
    : 'Responsabilidade transferida internamente.'

  const { error: messageError } = await supabase
    .from('lead_mensagens_internas')
    .insert({
      tenant_id: context.tenantId,
      thread_id: thread.id,
      lead_id: id,
      autor_usuario_id: context.usuarioId,
      tipo: 'handoff',
      mensagem: messageText,
      metadata: {
        from_usuario_id: context.usuarioId,
        to_usuario_id: toUsuarioId,
        status_destino: statusDestino,
      },
    })

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })

  if (conversa?.id && ['humano', 'aguardando_cliente', 'resolvido', 'agente'].includes(statusDestino)) {
    const conversaPayload: Record<string, unknown> = { assumido_por: toUsuarioId }

    if (statusDestino === 'agente') {
      conversaPayload.status = 'agente'
      conversaPayload.assumido_por = null
      conversaPayload.assumido_em = null
      conversaPayload.nao_lidas = 0
    } else {
      conversaPayload.status = statusDestino
      conversaPayload.assumido_em = conversa.assumido_em || now
    }

    const { error: updateConversaError } = await supabase
      .from('conversas')
      .update(conversaPayload)
      .eq('id', conversa.id)
      .eq('tenant_id', context.tenantId)

    if (updateConversaError) return NextResponse.json({ error: updateConversaError.message }, { status: 500 })
  }

  const usuariosMap = await getTenantUsuariosMap(supabase, context.tenantId, [
    handoff.from_usuario_id,
    handoff.to_usuario_id,
    toUsuarioId,
  ])

  return NextResponse.json({
    handoff: {
      ...handoff,
      from_usuario: handoff.from_usuario_id ? usuariosMap.get(handoff.from_usuario_id) || null : null,
      to_usuario: handoff.to_usuario_id ? usuariosMap.get(handoff.to_usuario_id) || null : null,
    },
    current_owner: usuariosMap.get(toUsuarioId) || null,
  })
}
