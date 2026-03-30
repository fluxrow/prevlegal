import { createClient } from '@/lib/supabase/server'
import { gerarParcelasContrato, normalizarNumero } from '@/lib/financeiro'
import { hasRecentReauth } from '@/lib/session-security'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'

async function getScopedLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  leadId: string,
) {
  if (!context.tenantId) return null

  let query = supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')

  let query = supabase
    .from('contratos')
    .select(`
      *,
      leads!inner(nome, cpf, telefone, status, responsavel_id, tenant_id),
      parcelas(id, numero, valor, data_vencimento, data_pagamento, status, forma_pagamento, observacao)
    `)
    .order('created_at', { ascending: false })

  if (context.tenantId) {
    query = query.eq('leads.tenant_id', context.tenantId)
  }

  if (!context.isAdmin) {
    query = query.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data, error } = await (leadId ? query.eq('lead_id', leadId) : query)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contratos: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const body = await request.json()

  const leadId = body.lead_id as string | undefined
  const valorTotal = normalizarNumero(body.valor_total)
  const valorEntrada = Math.max(0, normalizarNumero(body.valor_entrada))
  const numParcelas = Math.max(0, Math.trunc(normalizarNumero(body.num_parcelas, 1)))
  const tipoCobranca = typeof body.tipo_cobranca === 'string' ? body.tipo_cobranca : 'exito'
  const percentualExito = body.percentual_exito === null || body.percentual_exito === undefined || body.percentual_exito === ''
    ? null
    : normalizarNumero(body.percentual_exito)
  const percentualSucumbencia = body.percentual_sucumbencia === null || body.percentual_sucumbencia === undefined || body.percentual_sucumbencia === ''
    ? null
    : normalizarNumero(body.percentual_sucumbencia)
  const honorarioSucumbencia = body.honorario_sucumbencia === null || body.honorario_sucumbencia === undefined || body.honorario_sucumbencia === ''
    ? null
    : normalizarNumero(body.honorario_sucumbencia)

  if (!leadId || valorTotal <= 0) {
    return NextResponse.json({ error: 'lead_id e valor_total são obrigatórios' }, { status: 400 })
  }

  const lead = await getScopedLead(supabase, context, leadId)
  if (!lead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      percentual_sucumbencia: percentualSucumbencia,
      honorario_sucumbencia: honorarioSucumbencia,
      sucumbencia_status: body.sucumbencia_status || 'pendente',
      sucumbencia_data: body.sucumbencia_data || null,
      sucumbencia_observacoes: body.sucumbencia_observacoes || null,
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
