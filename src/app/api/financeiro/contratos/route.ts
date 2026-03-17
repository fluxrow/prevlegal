import { createClient } from '@/lib/supabase/server'
import { gerarParcelasContrato, normalizarNumero } from '@/lib/financeiro'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')

  const query = supabase
    .from('contratos')
    .select(`
      *,
      leads(nome, cpf, telefone, status),
      parcelas(id, numero, valor, data_vencimento, data_pagamento, status, forma_pagamento, observacao)
    `)
    .order('created_at', { ascending: false })

  const { data, error } = await (leadId ? query.eq('lead_id', leadId) : query)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contratos: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const leadId = body.lead_id as string | undefined
  const valorTotal = normalizarNumero(body.valor_total)
  const valorEntrada = Math.max(0, normalizarNumero(body.valor_entrada))
  const numParcelas = Math.max(0, Math.trunc(normalizarNumero(body.num_parcelas, 1)))
  const tipoCobranca = typeof body.tipo_cobranca === 'string' ? body.tipo_cobranca : 'exito'
  const percentualExito = body.percentual_exito === null || body.percentual_exito === undefined || body.percentual_exito === ''
    ? null
    : normalizarNumero(body.percentual_exito)

  if (!leadId || valorTotal <= 0) {
    return NextResponse.json({ error: 'lead_id e valor_total são obrigatórios' }, { status: 400 })
  }

  const { data: contrato, error: contratoErr } = await supabase
    .from('contratos')
    .insert({
      lead_id: leadId,
      numero: body.numero || null,
      descricao: body.descricao || null,
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      num_parcelas: numParcelas,
      tipo_cobranca: tipoCobranca,
      percentual_exito: percentualExito,
      data_assinatura: body.data_assinatura || null,
      observacoes: body.observacoes || null,
    })
    .select()
    .single()

  if (contratoErr) return NextResponse.json({ error: contratoErr.message }, { status: 500 })

  const parcelas = gerarParcelasContrato({
    contratoId: contrato.id,
    valorTotal,
    valorEntrada,
    numParcelas,
  })

  if (parcelas.length > 0) {
    const { error: parcelasErr } = await supabase.from('parcelas').insert(parcelas)
    if (parcelasErr) {
      await supabase.from('contratos').delete().eq('id', contrato.id)
      return NextResponse.json({ error: parcelasErr.message }, { status: 500 })
    }
  }

  await supabase.from('leads').update({ status: 'converted' }).eq('id', leadId)

  return NextResponse.json({ contrato })
}
