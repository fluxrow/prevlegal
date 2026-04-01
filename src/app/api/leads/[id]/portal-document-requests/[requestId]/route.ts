import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

const ALLOWED_STATUS = new Set(['pendente', 'enviado', 'aprovado', 'rejeitado'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, requestId } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.titulo === 'string' && body.titulo.trim()) payload.titulo = body.titulo.trim()
  if (body.descricao !== undefined) payload.descricao = typeof body.descricao === 'string' && body.descricao.trim() ? body.descricao.trim() : null
  if (typeof body.status === 'string') {
    const status = body.status.trim()
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }
    payload.status = status
  }

  const { data, error } = await supabase
    .from('portal_document_requests')
    .update(payload)
    .eq('id', requestId)
    .eq('lead_id', id)
    .select('id, titulo, descricao, status, created_at, updated_at')
    .single()

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: 'A foundation do portal mobile ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ request: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, requestId } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { error } = await supabase
    .from('portal_document_requests')
    .delete()
    .eq('id', requestId)
    .eq('lead_id', id)

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: 'A foundation do portal mobile ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
