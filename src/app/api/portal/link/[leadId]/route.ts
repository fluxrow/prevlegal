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
  const { data: lead } = await supabase
    .from('leads')
    .select('portal_token, nome')
    .eq('id', leadId)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prevlegal.vercel.app'
  const url = `${baseUrl}/portal/${lead.portal_token}`
  return NextResponse.json({ url, token: lead.portal_token, nome: lead.nome })
}
