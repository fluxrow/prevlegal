import { calcularStatusContrato, getDataHojeISO } from '@/lib/financeiro'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update = { ...body }

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
