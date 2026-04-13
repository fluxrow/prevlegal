import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import {
  canAccessPersonalInboxLeadId,
  getVisibleConversationIds,
} from '@/lib/inbox-visibility'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type NotificationRecord = {
  id: string
  tipo: string
  titulo: string
  descricao?: string | null
  lida: boolean
  link?: string | null
  created_at: string
  metadata?: Record<string, any> | null
}

async function filterVisibleNotifications(
  supabase: ReturnType<typeof createAdminSupabase>,
  authSupabase: Awaited<ReturnType<typeof createClient>>,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  notifications: NotificationRecord[],
) {
  const visibleConversationIds = new Set(await getVisibleConversationIds(authSupabase, context))
  const leadAccessCache = new Map<string, boolean>()

  async function canAccessLead(leadId: string) {
    if (!leadAccessCache.has(leadId)) {
      leadAccessCache.set(
        leadId,
        await canAccessPersonalInboxLeadId(authSupabase, context, leadId),
      )
    }
    return leadAccessCache.get(leadId) === true
  }

  const filtered: NotificationRecord[] = []
  for (const notification of notifications) {
    const metadata = notification.metadata || {}
    const conversaId =
      typeof metadata.conversa_id === 'string' ? metadata.conversa_id : null
    const leadId = typeof metadata.lead_id === 'string' ? metadata.lead_id : null

    if (conversaId) {
      if (visibleConversationIds.has(conversaId)) {
        filtered.push(notification)
      }
      continue
    }

    if (leadId) {
      if (await canAccessLead(leadId)) {
        filtered.push(notification)
      }
      continue
    }

    if (notification.link?.startsWith('/agendamentos')) {
      filtered.push(notification)
      continue
    }

    filtered.push(notification)
  }

  return filtered
}

export async function GET() {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json([])

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('notificacoes')
    .select('id, tipo, titulo, descricao, lida, link, created_at, metadata')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const filtered = await filterVisibleNotifications(
    supabase,
    authSupabase,
    context,
    data || [],
  )

  return NextResponse.json(filtered.slice(0, 50))
}

export async function PATCH(request: NextRequest) {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const supabase = createAdminSupabase()
  const body = await request.json().catch(() => null)
  const { ids, marcar_todas } = body || {}

  if (marcar_todas) {
    const { data, error: fetchError } = await supabase
      .from('notificacoes')
      .select('id, tipo, titulo, descricao, lida, link, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(100)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const visible = await filterVisibleNotifications(
      supabase,
      authSupabase,
      context,
      data || [],
    )
    const visibleIds = visible.map((notification) => notification.id)

    if (visibleIds.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('tenant_id', context.tenantId)
      .in('id', visibleIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (Array.isArray(ids) && ids.length > 0) {
    const { data, error: fetchError } = await supabase
      .from('notificacoes')
      .select('id, tipo, titulo, descricao, lida, link, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .in('id', ids)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const visible = await filterVisibleNotifications(
      supabase,
      authSupabase,
      context,
      data || [],
    )
    const visibleIds = visible.map((notification) => notification.id)

    if (visibleIds.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('tenant_id', context.tenantId)
      .in('id', visibleIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    return NextResponse.json({ error: 'Atualização de notificações inválida' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
