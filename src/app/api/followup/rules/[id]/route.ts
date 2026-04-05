import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const body = await request.json() as { nome?: string; descricao?: string; ativo?: boolean }
  const service = createAdminSupabase()

  const { data, error } = await service
    .from('followup_rules')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const service = createAdminSupabase()

  // Bloqueia se houver runs ativas
  const { count } = await service
    .from('followup_runs')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', id)
    .eq('status', 'ativo')

  if (count && count > 0) {
    return NextResponse.json({ error: 'Existem runs ativas para esta regra. Cancele-as antes de remover.' }, { status: 409 })
  }

  const { error } = await service
    .from('followup_rules')
    .delete()
    .eq('id', id)
    .eq('tenant_id', context.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
