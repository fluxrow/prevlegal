import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await params
  const allowed = await canAccessLeadId(supabase, context, leadId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: lead } = await supabase
    .from('leads')
    .select('portal_token, nome')
    .eq('id', leadId)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'
  const url = `${baseUrl}/portal/${lead.portal_token}`
  return NextResponse.json({ url, token: lead.portal_token, nome: lead.nome })
}
