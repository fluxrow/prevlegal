import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  createPortalSession,
  getPortalSessionCookieOptions,
  hashPortalSecret,
  PORTAL_SESSION_COOKIE,
} from '@/lib/portal-auth'

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params
  const tokenHash = hashPortalSecret(token)

  const { data: accessLink } = await adminSupabase
    .from('portal_access_links')
    .select('id, lead_id, tenant_id, portal_user_id, expira_em')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!accessLink) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (accessLink.expira_em && new Date(accessLink.expira_em).getTime() < Date.now()) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const [{ data: lead }, { error: updateLinkError }, sessionResult] = await Promise.all([
    adminSupabase
      .from('leads')
      .select('portal_token')
      .eq('id', accessLink.lead_id)
      .maybeSingle(),
    adminSupabase
      .from('portal_access_links')
      .update({ usado_em: new Date().toISOString() })
      .eq('id', accessLink.id),
    createPortalSession(adminSupabase, {
      tenantId: accessLink.tenant_id,
      leadId: accessLink.lead_id,
      portalUserId: accessLink.portal_user_id,
    }),
  ])

  if (accessLink.portal_user_id) {
    await adminSupabase
      .from('portal_users')
      .update({ ultimo_acesso_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', accessLink.portal_user_id)
  }

  if (!lead?.portal_token || updateLinkError) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.redirect(new URL(`/portal/${lead.portal_token}`, request.url))
  if (!sessionResult.error) {
    response.cookies.set(
      PORTAL_SESSION_COOKIE,
      sessionResult.rawToken,
      getPortalSessionCookieOptions(),
    )
  } else if (!isMissingRelation(sessionResult.error)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
