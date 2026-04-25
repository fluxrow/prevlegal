import { NextRequest, NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })
  if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const supabase = createAdminSupabase()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(`
      id,
      nome,
      telefone,
      telefone_enriquecido,
      conjuge_celular,
      conjuge_telefone,
      filho_celular,
      filho_telefone,
      irmao_celular,
      irmao_telefone
    `)
    .eq('tenant_id', context.tenantId)
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message || 'Lead não encontrado' }, { status: 404 })
  }

  const phoneVariants = buildLeadPhoneVariants(lead)

  const conversationIds = new Set<string>()

  const { data: leadConversations, error: leadConversationsError } = await supabase
    .from('conversas')
    .select('id')
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)

  if (leadConversationsError) {
    return NextResponse.json({ error: leadConversationsError.message }, { status: 500 })
  }

  for (const conversa of leadConversations || []) {
    conversationIds.add(conversa.id)
  }

  if (phoneVariants.length > 0) {
    const orConditions = phoneVariants.map((phone) => `telefone.eq.${phone}`).join(',')
    const { data: phoneConversations, error: phoneConversationsError } = await supabase
      .from('conversas')
      .select('id')
      .eq('tenant_id', context.tenantId)
      .or(orConditions)

    if (phoneConversationsError) {
      return NextResponse.json({ error: phoneConversationsError.message }, { status: 500 })
    }

    for (const conversa of phoneConversations || []) {
      conversationIds.add(conversa.id)
    }
  }

  const { data: thread } = await supabase
    .from('lead_threads_internas')
    .select('id')
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)
    .maybeSingle()

  const { data: followupRuns, error: followupRunsError } = await supabase
    .from('followup_runs')
    .select('id')
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)

  if (followupRunsError) {
    return NextResponse.json({ error: followupRunsError.message }, { status: 500 })
  }

  const followupRunIds = (followupRuns || []).map((run) => run.id)

  if (followupRunIds.length > 0) {
    const { error } = await supabase
      .from('followup_events')
      .delete()
      .eq('tenant_id', context.tenantId)
      .in('run_id', followupRunIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const cleanupCounts = {
    mensagens: 0,
    conversas: conversationIds.size,
    notificacoes: 0,
    followupRuns: followupRunIds.length,
    campanhaMensagens: 0,
    mensagensInternas: 0,
    tasks: 0,
    handoffs: 0,
  }

  const { count: campaignMessagesCount } = await supabase
    .from('campanha_mensagens')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', id)

  cleanupCounts.campanhaMensagens = campaignMessagesCount || 0

  const messageDeleteConditions = [`lead_id.eq.${id}`]
  for (const conversaId of conversationIds) {
    messageDeleteConditions.push(`conversa_id.eq.${conversaId}`)
  }
  for (const phone of phoneVariants) {
    messageDeleteConditions.push(`telefone_remetente.eq.${phone}`)
    messageDeleteConditions.push(`telefone_destinatario.eq.${phone}`)
  }

  if (messageDeleteConditions.length > 0) {
    const { count: messageCount, error: countError } = await supabase
      .from('mensagens_inbound')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId)
      .or(messageDeleteConditions.join(','))

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    cleanupCounts.mensagens = messageCount || 0

    const { error } = await supabase
      .from('mensagens_inbound')
      .delete()
      .eq('tenant_id', context.tenantId)
      .or(messageDeleteConditions.join(','))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notificationIds = new Set<string>()

  for (const conversaId of conversationIds) {
    const { data: rows, error } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('tenant_id', context.tenantId)
      .contains('metadata', { conversa_id: conversaId })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const row of rows || []) notificationIds.add(row.id)
  }

  for (const phone of phoneVariants) {
    const { data: rows, error } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('tenant_id', context.tenantId)
      .contains('metadata', { telefone: phone })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const row of rows || []) notificationIds.add(row.id)
  }

  cleanupCounts.notificacoes = notificationIds.size

  if (notificationIds.size > 0) {
    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('tenant_id', context.tenantId)
      .in('id', Array.from(notificationIds))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (thread?.id) {
    const { count: internalMessagesCount } = await supabase
      .from('lead_mensagens_internas')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', thread.id)

    cleanupCounts.mensagensInternas = internalMessagesCount || 0

    const { error: deleteInternalMessagesError } = await supabase
      .from('lead_mensagens_internas')
      .delete()
      .eq('thread_id', thread.id)

    if (deleteInternalMessagesError) {
      return NextResponse.json({ error: deleteInternalMessagesError.message }, { status: 500 })
    }

    const { error: deleteThreadError } = await supabase
      .from('lead_threads_internas')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('lead_id', id)

    if (deleteThreadError) {
      return NextResponse.json({ error: deleteThreadError.message }, { status: 500 })
    }
  }

  const { count: tasksCount } = await supabase
    .from('lead_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)

  cleanupCounts.tasks = tasksCount || 0

  const { error: deleteTasksError } = await supabase
    .from('lead_tasks')
    .delete()
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)

  if (deleteTasksError) return NextResponse.json({ error: deleteTasksError.message }, { status: 500 })

  const { count: handoffsCount } = await supabase
    .from('lead_handoffs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)

  cleanupCounts.handoffs = handoffsCount || 0

  const { error: deleteHandoffsError } = await supabase
    .from('lead_handoffs')
    .delete()
    .eq('tenant_id', context.tenantId)
    .eq('lead_id', id)

  if (deleteHandoffsError) return NextResponse.json({ error: deleteHandoffsError.message }, { status: 500 })

  if (followupRunIds.length > 0) {
    const { error } = await supabase
      .from('followup_runs')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('lead_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (campaignMessagesCount && campaignMessagesCount > 0) {
    const { error } = await supabase
      .from('campanha_mensagens')
      .delete()
      .eq('lead_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (conversationIds.size > 0) {
    const { error } = await supabase
      .from('conversas')
      .delete()
      .eq('tenant_id', context.tenantId)
      .in('id', Array.from(conversationIds))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: leadResetError } = await supabase
    .from('leads')
    .update({
      status: 'new',
      campanha_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', context.tenantId)
    .eq('id', id)

  if (leadResetError) return NextResponse.json({ error: leadResetError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    lead_id: id,
    lead_nome: lead.nome,
    cleanup: cleanupCounts,
  })
}
