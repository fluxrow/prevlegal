import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { getPersonalInboxLeadIds } from '@/lib/inbox-visibility'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessibleLeadIds = await getPersonalInboxLeadIds(supabase, context)
  if (accessibleLeadIds.length === 0) {
    return NextResponse.json({ total: 0 })
  }

  const { count } = await supabase
    .from('portal_mensagens')
    .select('*', { count: 'exact', head: true })
    .in('lead_id', accessibleLeadIds)
    .eq('remetente', 'cliente')
    .eq('lida', false)

  return NextResponse.json({ total: count || 0 })
}
