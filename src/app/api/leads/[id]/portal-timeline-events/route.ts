import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
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

  const { data, error } = await supabase
    .from('portal_timeline_events')
    .select('id, tipo, titulo, descricao, visivel_cliente, created_at, updated_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ events: [], foundationPending: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data || [], foundationPending: false })
}

export async function POST(
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
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  const descricao = typeof body.descricao === 'string' && body.descricao.trim() ? body.descricao.trim() : null
  const visivelCliente = body.visivel_cliente !== false

  if (!titulo) {
    return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('portal_timeline_events')
    .insert({
      tenant_id: context.tenantId,
      lead_id: id,
      tipo: 'atualizacao_manual',
      titulo,
      descricao,
      visivel_cliente: visivelCliente,
    })
    .select('id, tipo, titulo, descricao, visivel_cliente, created_at, updated_at')
    .single()

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: 'A foundation do portal mobile ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event: data })
}
