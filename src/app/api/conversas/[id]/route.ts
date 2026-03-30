import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

const CONVERSA_STATUS = new Set([
  'agente',
  'humano',
  'aguardando_cliente',
  'resolvido',
  'encerrado',
])

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
    .select('id, status, assumido_por, assumido_em, leads!inner(responsavel_id)')
    .eq('id', id)

  if (!context.isAdmin) {
    conversaQuery = conversaQuery.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data: conversa } = await conversaQuery.maybeSingle()
  if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const now = new Date().toISOString()
  let payload: Record<string, unknown> | null = null

  switch (body.action) {
    case 'assume':
      payload = {
        status: 'humano',
        assumido_por: context.usuarioId,
        assumido_em: conversa.assumido_em || now,
        nao_lidas: 0,
      }
      break
    case 'return_to_agent':
      payload = {
        status: 'agente',
        assumido_por: null,
        assumido_em: null,
        nao_lidas: 0,
      }
      break
    case 'awaiting_customer':
      payload = {
        status: 'aguardando_cliente',
        assumido_por: conversa.assumido_por || context.usuarioId,
        assumido_em: conversa.assumido_em || now,
      }
      break
    case 'resolve':
      payload = {
        status: 'resolvido',
        assumido_por: conversa.assumido_por || context.usuarioId,
        assumido_em: conversa.assumido_em || now,
        nao_lidas: 0,
      }
      break
    case 'reopen':
      payload = {
        status: 'humano',
        assumido_por: conversa.assumido_por || context.usuarioId,
        assumido_em: conversa.assumido_em || now,
        nao_lidas: 0,
      }
      break
    case 'mark_read':
      payload = { nao_lidas: 0 }
      break
    default:
      if (typeof body.status === 'string' && CONVERSA_STATUS.has(body.status)) {
        payload = { status: body.status }

        if (body.status === 'humano') {
          payload.assumido_por = context.usuarioId
          payload.assumido_em = conversa.assumido_em || now
          payload.nao_lidas = 0
        }

        if (body.status === 'agente') {
          payload.assumido_por = null
          payload.assumido_em = null
          payload.nao_lidas = 0
        }
      }
      break
  }

  if (!payload) {
    return NextResponse.json({ error: 'Atualização de conversa inválida' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conversas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
