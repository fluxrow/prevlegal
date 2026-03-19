import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let conversaQuery = supabase
    .from('conversas')
    .select('id, leads!inner(responsavel_id)')
    .eq('id', id)

  if (!context.isAdmin) {
    conversaQuery = conversaQuery.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data: conversa } = await conversaQuery.maybeSingle()
  if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('mensagens_inbound')
    .select('*')
    .eq('conversa_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  let conversaQuery = supabase
    .from('conversas')
    .select('id, leads!inner(responsavel_id)')
    .eq('id', id)

  if (!context.isAdmin) {
    conversaQuery = conversaQuery.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data: conversa } = await conversaQuery.maybeSingle()
  if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('conversas')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
