import { calcularStatusContrato, getDataHojeISO } from '@/lib/financeiro'
import { hasRecentReauth } from '@/lib/session-security'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'

async function getAccessibleParcela(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parcelaId: string,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
) {
  const { data: parcela, error: parcelaError } = await supabase
    .from('parcelas')
    .select('id, contrato_id')
    .eq('id', parcelaId)
    .maybeSingle()

  if (parcelaError) {
    throw new Error(parcelaError.message)
  }

  if (!parcela || !context.tenantId) return null

  let contratoQuery = supabase
    .from('contratos')
    .select('id, leads!inner(id, tenant_id, responsavel_id)')
    .eq('id', parcela.contrato_id)
    .eq('leads.tenant_id', context.tenantId)

  if (!context.isAdmin) {
    contratoQuery = contratoQuery.eq('leads.responsavel_id', context.usuarioId)
  }

  const { data: contrato, error: contratoError } = await contratoQuery.maybeSingle()

  if (contratoError) {
    throw new Error(contratoError.message)
  }

  if (!contrato) return null

  return parcela
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const { id } = await params
  const body = await request.json()
  const update = { ...body }
  const parcelaAcessivel = await getAccessibleParcela(supabase, id, context)

  if (!parcelaAcessivel) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (update.status === 'pago' && !update.data_pagamento) {
    update.data_pagamento = getDataHojeISO()
  }

  if (update.status !== 'pago') {
    update.data_pagamento = update.data_pagamento ?? null
  }

  const { data, error } = await supabase
    .from('parcelas')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: todasParcelas, error: parcelasErr } = await supabase
    .from('parcelas')
    .select('status')
    .eq('contrato_id', data.contrato_id)

  if (parcelasErr) return NextResponse.json({ error: parcelasErr.message }, { status: 500 })

  const { data: contratoAtual } = await supabase
    .from('contratos')
    .select('status')
    .eq('id', data.contrato_id)
    .single()

  const proximoStatus = calcularStatusContrato(todasParcelas || [], contratoAtual?.status)

  await supabase
    .from('contratos')
    .update({ status: proximoStatus, updated_at: new Date().toISOString() })
    .eq('id', data.contrato_id)

  return NextResponse.json({ parcela: data })
}
