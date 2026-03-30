import { createClient } from '@/lib/supabase/server'
import { hasRecentReauth } from '@/lib/session-security'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'

async function canAccessContrato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contratoId: string,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
) {
  if (!context.tenantId) return false

  let query = supabase
    .from('contratos')
    .select('id, lead_id, leads!inner(id, tenant_id, responsavel_id)')
    .eq('id', contratoId)
    .eq('leads.tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const { id } = await params
  const body = await request.json()
  const allowed = await canAccessContrato(supabase, id, context)

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('contratos')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contrato: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const { id } = await params
  const allowed = await canAccessContrato(supabase, id, context)

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('contratos').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
