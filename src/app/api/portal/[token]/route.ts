import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: lead } = await supabase
    .from('leads')
    .select('id, nome, status, created_at, portal_ativo, portal_ultimo_acesso, nb, banco, valor_rma, ganho_potencial')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })

  // Atualiza último acesso
  await supabase.from('leads').update({ portal_ultimo_acesso: new Date().toISOString() }).eq('id', lead.id)

  // Documentos compartilhados
  const { data: documentos } = await supabase
    .from('lead_documentos')
    .select('id, nome, tipo, arquivo_url, gerado_por_ia, tipo_documento, created_at')
    .eq('lead_id', lead.id)
    .eq('compartilhado_cliente', true)
    .order('created_at', { ascending: false })

  // Mensagens do portal
  const { data: mensagens } = await supabase
    .from('portal_mensagens')
    .select('id, remetente, mensagem, lida, created_at')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true })

  // Marca mensagens do escritório como lidas pelo cliente
  await supabase
    .from('portal_mensagens')
    .update({ lida: true })
    .eq('lead_id', lead.id)
    .eq('remetente', 'escritorio')
    .eq('lida', false)

  return NextResponse.json({
    lead: { id: lead.id, nome: lead.nome, status: lead.status, created_at: lead.created_at },
    documentos: documentos || [],
    mensagens: mensagens || [],
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { mensagem } = await request.json()
  if (!mensagem?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('portal_mensagens')
    .insert({ lead_id: lead.id, remetente: 'cliente', mensagem: mensagem.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mensagem: data })
}
