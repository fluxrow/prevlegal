import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count } = await supabase
    .from('portal_mensagens')
    .select('*', { count: 'exact', head: true })
    .eq('remetente', 'cliente')
    .eq('lida', false)

  return NextResponse.json({ total: count || 0 })
}
