import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await params
  const { data } = await supabase
    .from('portal_mensagens')
    .select('id, remetente, mensagem, lida, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if ((data || []).some(m => m.remetente === 'cliente' && !m.lida)) {
    await supabase
      .from('portal_mensagens')
      .update({ lida: true })
      .eq('lead_id', leadId)
      .eq('remetente', 'cliente')
      .eq('lida', false)
  }

  return NextResponse.json({ mensagens: data || [] })
}
