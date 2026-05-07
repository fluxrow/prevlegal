import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { canViewConversationForInbox } from '@/lib/inbox-visibility'
import { mergeLeadDocumentsWithProcessing } from '@/lib/document-processing'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: conversa } = await supabase
    .from('conversas')
    .select('id, lead_id, assumido_por, leads(responsavel_id)')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

  if (!canViewConversationForInbox(context, conversa)) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  if (!conversa?.lead_id) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from('lead_documentos')
    .select('*')
    .eq('lead_id', conversa.lead_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await mergeLeadDocumentsWithProcessing(supabase, data || [])
  return NextResponse.json(enriched)
}
