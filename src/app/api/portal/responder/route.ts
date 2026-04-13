import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { canAccessPersonalInboxLeadId } from '@/lib/inbox-visibility'

export async function POST(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, mensagem } = await request.json()
  const allowed = await canAccessPersonalInboxLeadId(supabase, context, lead_id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: markReadError } = await supabase
    .from('portal_mensagens')
    .update({ lida: true })
    .eq('lead_id', lead_id)
    .eq('remetente', 'cliente')
    .eq('lida', false)

  if (markReadError) {
    return NextResponse.json({ error: markReadError.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('portal_mensagens')
    .insert({ lead_id, remetente: 'escritorio', mensagem })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mensagem: data })
}
