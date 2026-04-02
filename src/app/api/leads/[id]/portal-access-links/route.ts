import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
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
  const portalUserId = typeof body.portal_user_id === 'string' ? body.portal_user_id : ''

  if (!portalUserId) {
    return NextResponse.json({ error: 'Selecione um acesso do portal para gerar o link' }, { status: 400 })
  }

  const { data: portalUser, error: portalUserError } = await supabase
    .from('portal_users')
    .select('id, nome, lead_id')
    .eq('id', portalUserId)
    .eq('lead_id', id)
    .single()

  if (portalUserError || !portalUser) {
    if (isMissingRelation(portalUserError)) {
      return NextResponse.json({ error: 'A foundation de identidade do portal ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Acesso do portal não encontrado' }, { status: 404 })
  }

  const rawToken = randomBytes(24).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()

  const { error } = await supabase
    .from('portal_access_links')
    .insert({
      tenant_id: context.tenantId,
      portal_user_id: portalUser.id,
      lead_id: id,
      token_hash: tokenHash,
      tipo: 'magic_link',
      expira_em: expiraEm,
    })

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({ error: 'A foundation de identidade do portal ainda não foi aplicada no banco.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'
  const url = `${baseUrl}/portal/acesso/${rawToken}`

  return NextResponse.json({
    url,
    expira_em: expiraEm,
    portal_user: {
      id: portalUser.id,
      nome: portalUser.nome,
    },
  })
}
