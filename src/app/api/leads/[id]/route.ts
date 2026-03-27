import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

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

  const [leadRes, anotacoesRes, conversaRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase
      .from('lead_anotacoes')
      .select('id, texto, created_at, usuario_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('conversas')
      .select('id, status')
      .eq('lead_id', id)
      .limit(1)
      .maybeSingle(),
  ])

  if (leadRes.error) return NextResponse.json({ error: leadRes.error.message }, { status: 404 })

  return NextResponse.json({
    lead: leadRes.data,
    anotacoes: anotacoesRes.data || [],
    conversa: conversaRes.data || null,
  })
}
