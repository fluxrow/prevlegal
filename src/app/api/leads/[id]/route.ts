import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [leadRes, anotacoesRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase
      .from('lead_anotacoes')
      .select('id, texto, created_at, usuario_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
  ])

  if (leadRes.error) return NextResponse.json({ error: leadRes.error.message }, { status: 404 })

  return NextResponse.json({ lead: leadRes.data, anotacoes: anotacoesRes.data || [] })
}
