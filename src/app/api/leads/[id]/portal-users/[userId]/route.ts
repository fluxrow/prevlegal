import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

const ALLOWED_ROLES = new Set(['cliente', 'familiar', 'cuidador'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.nome === 'string' && body.nome.trim()) payload.nome = body.nome.trim()
  if (body.email !== undefined) payload.email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  if (body.telefone !== undefined) payload.telefone = typeof body.telefone === 'string' && body.telefone.trim() ? body.telefone.trim() : null
  if (body.ativo !== undefined) payload.ativo = Boolean(body.ativo)
  if (typeof body.papel === 'string') {
    const papel = body.papel.trim()
    if (!ALLOWED_ROLES.has(papel)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
    }
    payload.papel = papel
  }

  const { data, error } = await supabase
    .from('portal_users')
    .update(payload)
    .eq('id', userId)
    .eq('lead_id', id)
    .select('id, nome, email, telefone, papel, ativo, ultimo_acesso_em, created_at, updated_at')
    .single()

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: 'A foundation de identidade do portal ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { error } = await supabase
    .from('portal_users')
    .delete()
    .eq('id', userId)
    .eq('lead_id', id)

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: 'A foundation de identidade do portal ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
