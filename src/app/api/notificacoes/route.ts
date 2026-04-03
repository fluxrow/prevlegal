import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json([])

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('notificacoes')
    .select('id, tipo, titulo, descricao, lida, link, created_at')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
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
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('tenant_id', context.tenantId)
      .eq('lida', false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (Array.isArray(ids) && ids.length > 0) {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('tenant_id', context.tenantId)
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    return NextResponse.json({ error: 'Atualização de notificações inválida' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
