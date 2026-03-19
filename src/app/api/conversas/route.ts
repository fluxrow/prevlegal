import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('conversas')
    .select('*, leads!inner(nome, nb, status, responsavel_id)')
    .order('ultima_mensagem_at', { ascending: false })

  if (!context.isAdmin) {
    query = query.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
