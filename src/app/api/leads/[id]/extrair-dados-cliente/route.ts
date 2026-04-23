import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractClientDataFromConversation } from '@/lib/extract-client-data'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { data: conversa } = await supabase
    .from('conversas')
    .select('id')
    .eq('lead_id', id)
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  try {
    const extracted = await extractClientDataFromConversation({
      tenantId: context.tenantId,
      leadId: id,
      conversaId: conversa?.id || null,
    })

    return NextResponse.json(extracted)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível extrair os dados do cliente da conversa.',
      },
      { status: 500 },
    )
  }
}
