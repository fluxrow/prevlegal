import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

const ALLOWED_ROLES = new Set(['cliente', 'familiar', 'cuidador'])

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
    .from('portal_users')
    .select('id, nome, email, telefone, papel, ativo, ultimo_acesso_em, created_at, updated_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ users: [], foundationPending: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data || [], foundationPending: false })
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
  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  const telefone = typeof body.telefone === 'string' && body.telefone.trim() ? body.telefone.trim() : null
  const papel = typeof body.papel === 'string' ? body.papel.trim() : 'cliente'

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  if (!email && !telefone) {
    return NextResponse.json({ error: 'Informe e-mail ou telefone para o acesso do portal' }, { status: 400 })
  }

  if (!ALLOWED_ROLES.has(papel)) {
    return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('portal_users')
    .insert({
      tenant_id: context.tenantId,
      lead_id: id,
      nome,
      email,
      telefone,
      papel,
      ativo: true,
    })
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
