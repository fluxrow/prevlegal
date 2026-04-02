import { createHash } from 'crypto'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export default async function PortalAccessPage(
  { params }: { params: Promise<{ token: string }> }
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params
  const tokenHash = hashToken(token)

  const { data: accessLink } = await adminSupabase
    .from('portal_access_links')
    .select('id, lead_id, portal_user_id, expira_em, usado_em')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!accessLink) {
    redirect('/login')
  }

  if (accessLink.expira_em && new Date(accessLink.expira_em).getTime() < Date.now()) {
    redirect('/login')
  }

  const [{ data: lead }, { error: updateLinkError }] = await Promise.all([
    adminSupabase
      .from('leads')
      .select('portal_token')
      .eq('id', accessLink.lead_id)
      .maybeSingle(),
    adminSupabase
      .from('portal_access_links')
      .update({ usado_em: new Date().toISOString() })
      .eq('id', accessLink.id),
  ])

  if (accessLink.portal_user_id) {
    await adminSupabase
      .from('portal_users')
      .update({ ultimo_acesso_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', accessLink.portal_user_id)
  }

  if (!lead?.portal_token || updateLinkError) {
    redirect('/login')
  }

  redirect(`/portal/${lead.portal_token}`)
}
