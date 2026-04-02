import { createHash, randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const PORTAL_SESSION_COOKIE = 'prevlegal_portal_session'
export const PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type PortalUserSession = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  papel: 'cliente' | 'familiar' | 'cuidador'
  ativo: boolean
  ultimo_acesso_em: string | null
}

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

export function hashPortalSecret(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getPortalSessionCookieOptions(maxAgeSeconds = PORTAL_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export async function createPortalSession(
  adminSupabase: SupabaseClient,
  {
    tenantId,
    leadId,
    portalUserId,
  }: {
    tenantId: string | null
    leadId: string
    portalUserId: string
  },
) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashPortalSecret(rawToken)
  const expiraEm = new Date(Date.now() + PORTAL_SESSION_MAX_AGE_SECONDS * 1000).toISOString()

  const { error } = await adminSupabase.from('portal_sessions').insert({
    tenant_id: tenantId,
    portal_user_id: portalUserId,
    lead_id: leadId,
    token_hash: tokenHash,
    expira_em: expiraEm,
    ultimo_acesso_em: new Date().toISOString(),
  })

  return {
    rawToken,
    expiraEm,
    error,
  }
}

export async function resolvePortalViewer(
  adminSupabase: SupabaseClient,
  request: NextRequest,
  leadId: string,
): Promise<{
  viewer: PortalUserSession | null
  foundationPending: boolean
}> {
  const rawToken = request.cookies.get(PORTAL_SESSION_COOKIE)?.value
  if (!rawToken) {
    return { viewer: null, foundationPending: false }
  }

  const tokenHash = hashPortalSecret(rawToken)
  const { data, error } = await adminSupabase
    .from('portal_sessions')
    .select(`
      id,
      expira_em,
      portal_user_id,
      portal_users (
        id,
        nome,
        email,
        telefone,
        papel,
        ativo,
        ultimo_acesso_em
      )
    `)
    .eq('token_hash', tokenHash)
    .eq('lead_id', leadId)
    .maybeSingle()

  if (error) {
    if (isMissingRelation(error)) {
      return { viewer: null, foundationPending: true }
    }
    return { viewer: null, foundationPending: false }
  }

  if (!data?.portal_users) {
    return { viewer: null, foundationPending: false }
  }

  if (data.expira_em && new Date(data.expira_em).getTime() < Date.now()) {
    return { viewer: null, foundationPending: false }
  }

  const viewer = Array.isArray(data.portal_users) ? data.portal_users[0] : data.portal_users

  if (!viewer?.ativo) {
    return { viewer: null, foundationPending: false }
  }

  await Promise.all([
    adminSupabase
      .from('portal_sessions')
      .update({ ultimo_acesso_em: new Date().toISOString() })
      .eq('id', data.id),
    adminSupabase
      .from('portal_users')
      .update({ ultimo_acesso_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', data.portal_user_id),
  ])

  return {
    viewer: {
      id: viewer.id,
      nome: viewer.nome,
      email: viewer.email,
      telefone: viewer.telefone,
      papel: viewer.papel,
      ativo: viewer.ativo,
      ultimo_acesso_em: viewer.ultimo_acesso_em,
    },
    foundationPending: false,
  }
}
