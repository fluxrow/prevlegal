import { calcularStatusContrato, getDataHojeISO } from '@/lib/financeiro'
import { hasRecentReauth } from '@/lib/session-security'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface VencimentoItem {
  id: string
  valor: number
  contrato_id: string
  data_vencimento: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const hoje = getDataHojeISO()
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0]
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    contratosRes,
    recebidoMesRes,
    atrasadasRes,
    vencendoHojeRes,
  ] = await Promise.all([
    supabase.from('contratos').select('id, lead_id, valor_total, status, honorario_sucumbencia, sucumbencia_status'),
    supabase.from('parcelas').select('valor').eq('status', 'pago').gte('data_pagamento', inicioMes).lte('data_pagamento', fimMes),
    supabase.from('parcelas').select('id, valor, data_vencimento, contrato_id').in('status', ['pendente', 'atrasado']).lt('data_vencimento', hoje),
    supabase.from('parcelas').select('id, valor, contrato_id, data_vencimento').eq('status', 'pendente').eq('data_vencimento', hoje),
  ])

  if (contratosRes.error) return NextResponse.json({ error: contratosRes.error.message }, { status: 500 })
  if (recebidoMesRes.error) return NextResponse.json({ error: recebidoMesRes.error.message }, { status: 500 })
  if (atrasadasRes.error) return NextResponse.json({ error: atrasadasRes.error.message }, { status: 500 })
  if (vencendoHojeRes.error) return NextResponse.json({ error: vencendoHojeRes.error.message }, { status: 500 })

  const contratos = contratosRes.data || []
  const atrasadas = atrasadasRes.data || []
  const vencendoHoje = vencendoHojeRes.data || []

  if (atrasadas.length > 0) {
    const idsAtrasadas = atrasadas.map((parcela) => parcela.id)
    await supabase.from('parcelas').update({ status: 'atrasado' }).in('id', idsAtrasadas)

    const contratoIds = Array.from(new Set(atrasadas.map((parcela) => parcela.contrato_id)))
    const { data: parcelasPorContrato } = await supabase
      .from('parcelas')
      .select('contrato_id, status')
      .in('contrato_id', contratoIds)

    if (parcelasPorContrato && parcelasPorContrato.length > 0) {
      const statusMap = new Map<string, { status: string }[]>()
      parcelasPorContrato.forEach((parcela) => {
        const atual = statusMap.get(parcela.contrato_id) || []
        atual.push({ status: parcela.status })
        statusMap.set(parcela.contrato_id, atual)
      })

      for (const contratoId of contratoIds) {
        const statusAtual = contratos.find((contrato) => contrato.id === contratoId)?.status
        const status = calcularStatusContrato(statusMap.get(contratoId) || [], statusAtual)
        await supabase
          .from('contratos')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', contratoId)
      }
    }
  }

  const leadIds = Array.from(new Set(
    contratos
      .filter((contrato) => vencendoHoje.some((parcela) => parcela.contrato_id === contrato.id))
      .map((contrato) => contrato.lead_id)
      .filter(Boolean)
  ))

  let leadsMap = new Map<string, { nome: string | null }>()
  if (leadIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, nome')
      .in('id', leadIds)

    leadsMap = new Map((leads || []).map((lead) => [lead.id, { nome: lead.nome }]))
  }

  const vencendoHojeComLead = vencendoHoje.map((parcela: VencimentoItem) => {
    const contrato = contratos.find((item) => item.id === parcela.contrato_id)
    const lead = contrato?.lead_id ? leadsMap.get(contrato.lead_id) : null

    return {
      ...parcela,
      lead_nome: lead?.nome || 'Lead',
    }
  })

  const totalContratos = contratos.reduce((acc, contrato) => acc + Number(contrato.valor_total), 0)
  const totalRecebidoMes = (recebidoMesRes.data || []).reduce((acc, parcela) => acc + Number(parcela.valor), 0)
  const totalAtrasado = atrasadas.reduce((acc, parcela) => acc + Number(parcela.valor), 0)
  const totalSucumbenciaPendente = contratos
    .filter((contrato) => contrato.sucumbencia_status === 'pendente')
    .reduce((acc, contrato) => acc + Number(contrato.honorario_sucumbencia || 0), 0)
  const totalSucumbenciaRecebida = contratos
    .filter((contrato) => contrato.sucumbencia_status === 'recebido')
    .reduce((acc, contrato) => acc + Number(contrato.honorario_sucumbencia || 0), 0)

  return NextResponse.json({
    resumo: {
      totalContratos,
      totalHonorariosContratuais: totalContratos,
      totalAtivos: contratos.filter((contrato) => contrato.status === 'ativo').length,
      totalQuitados: contratos.filter((contrato) => contrato.status === 'quitado').length,
      totalInadimplentes: contratos.filter((contrato) => contrato.status === 'inadimplente').length,
      recebidoMes: totalRecebidoMes,
      atrasado: totalAtrasado,
      qtdAtrasadas: atrasadas.length,
      totalSucumbenciaPendente,
      totalSucumbenciaRecebida,
      vencendoHoje: vencendoHojeComLead,
    },
  })
}
