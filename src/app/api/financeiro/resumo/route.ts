import { calcularStatusContrato, getDataISO, getDataHojeISO } from '@/lib/financeiro'
import { hasRecentReauth } from '@/lib/session-security'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'

interface VencimentoItem {
  id: string
  valor: number
  contrato_id: string
  data_vencimento: string
}

interface OrigemCarteiraItem {
  chave: string
  label: string
  tipo: 'campanha' | 'lista' | 'manual'
  contratos: number
  valorTotal: number
}

async function getScopedLeadIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
) {
  if (!context.tenantId) return []

  let query = supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', context.tenantId)

  if (!context.isAdmin) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((lead) => lead.id)
}

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const hoje = getDataHojeISO()
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0]
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0]
  const daqui7Dias = getDataISO(new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000))
  const daqui30Dias = getDataISO(new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000))

  const scopedLeadIds = await getScopedLeadIds(supabase, context)

  const contratosQuery = supabase.from('contratos').select('id, lead_id, valor_total, status, honorario_sucumbencia, sucumbencia_status')
  const parcelasPagasQuery = supabase.from('parcelas').select('valor').eq('status', 'pago').gte('data_pagamento', inicioMes).lte('data_pagamento', fimMes)
  const parcelasAtrasadasQuery = supabase.from('parcelas').select('id, valor, data_vencimento, contrato_id').in('status', ['pendente', 'atrasado']).lt('data_vencimento', hoje)
  const parcelasHojeQuery = supabase.from('parcelas').select('id, valor, contrato_id, data_vencimento').eq('status', 'pendente').eq('data_vencimento', hoje)

  if (scopedLeadIds.length === 0) {
    return NextResponse.json({
      resumo: {
        totalContratos: 0,
        totalHonorariosContratuais: 0,
        totalAtivos: 0,
        totalQuitados: 0,
        totalInadimplentes: 0,
        recebidoMes: 0,
        atrasado: 0,
        qtdAtrasadas: 0,
        totalSucumbenciaPendente: 0,
        totalSucumbenciaRecebida: 0,
        vencendoHoje: [],
        previsto7d: 0,
        previsto30d: 0,
        recebivelAberto: 0,
        ticketMedioContrato: 0,
        proximasParcelas: [],
        origensCarteira: [],
        pipelineComercial: {
          contratosComCampanha: 0,
          contratosSemCampanha: 0,
          contratosComAgendamento: 0,
          contratosComAgendamentoRealizado: 0,
          valorViaCampanha: 0,
          valorViaOperacaoDireta: 0,
        },
        riscoFinanceiro: 'baixo',
        resumoCarteira: 'Sem contratos ativos ou visiveis para este tenant no momento.',
      },
    })
  }
  contratosQuery.in('lead_id', scopedLeadIds)

  const [
    contratosRes,
    recebidoMesRes,
    atrasadasRes,
    vencendoHojeRes,
  ] = await Promise.all([
    contratosQuery,
    parcelasPagasQuery,
    parcelasAtrasadasQuery,
    parcelasHojeQuery,
  ])

  if (contratosRes.error) return NextResponse.json({ error: contratosRes.error.message }, { status: 500 })
  if (recebidoMesRes.error) return NextResponse.json({ error: recebidoMesRes.error.message }, { status: 500 })
  if (atrasadasRes.error) return NextResponse.json({ error: atrasadasRes.error.message }, { status: 500 })
  if (vencendoHojeRes.error) return NextResponse.json({ error: vencendoHojeRes.error.message }, { status: 500 })

  const contratos = contratosRes.data || []
  const contratoIds = contratos.map((contrato) => contrato.id)
  const parcelasScope = contratoIds.length > 0 ? contratoIds : ['00000000-0000-0000-0000-000000000000']

  let recebidoMes = recebidoMesRes.data || []
  let atrasadas = atrasadasRes.data || []
  let vencendoHoje = vencendoHojeRes.data || []

  if (contratoIds.length > 0) {
    const [recebidoScoped, atrasadasScoped, vencendoHojeScoped, previstas7dScoped, previstas30dScoped, emAbertoScoped] = await Promise.all([
      supabase.from('parcelas').select('valor').eq('status', 'pago').gte('data_pagamento', inicioMes).lte('data_pagamento', fimMes).in('contrato_id', parcelasScope),
      supabase.from('parcelas').select('id, valor, data_vencimento, contrato_id').in('status', ['pendente', 'atrasado']).lt('data_vencimento', hoje).in('contrato_id', parcelasScope),
      supabase.from('parcelas').select('id, valor, contrato_id, data_vencimento').eq('status', 'pendente').eq('data_vencimento', hoje).in('contrato_id', parcelasScope),
      supabase.from('parcelas').select('id, valor, contrato_id, data_vencimento').eq('status', 'pendente').gte('data_vencimento', hoje).lte('data_vencimento', daqui7Dias).in('contrato_id', parcelasScope).order('data_vencimento', { ascending: true }),
      supabase.from('parcelas').select('id, valor, contrato_id, data_vencimento').eq('status', 'pendente').gte('data_vencimento', hoje).lte('data_vencimento', daqui30Dias).in('contrato_id', parcelasScope),
      supabase.from('parcelas').select('id, valor, contrato_id, data_vencimento, status').in('status', ['pendente', 'atrasado']).in('contrato_id', parcelasScope),
    ])
    recebidoMes = recebidoScoped.data || []
    atrasadas = atrasadasScoped.data || []
    vencendoHoje = vencendoHojeScoped.data || []

    const previstas7d = previstas7dScoped.data || []
    const previstas30d = previstas30dScoped.data || []
    const emAberto = emAbertoScoped.data || []

    if (atrasadas.length > 0) {
      const idsAtrasadas = atrasadas.map((parcela) => parcela.id)
      await supabase.from('parcelas').update({ status: 'atrasado' }).in('id', idsAtrasadas)

      const contratoIdsComAtraso = Array.from(new Set(atrasadas.map((parcela) => parcela.contrato_id)))
      const { data: parcelasPorContrato } = await supabase
        .from('parcelas')
        .select('contrato_id, status')
        .in('contrato_id', contratoIdsComAtraso)

      if (parcelasPorContrato && parcelasPorContrato.length > 0) {
        const statusMap = new Map<string, { status: string }[]>()
        parcelasPorContrato.forEach((parcela) => {
          const atual = statusMap.get(parcela.contrato_id) || []
          atual.push({ status: parcela.status })
          statusMap.set(parcela.contrato_id, atual)
        })

        for (const contratoId of contratoIdsComAtraso) {
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
        .filter((contrato) =>
          vencendoHoje.some((parcela) => parcela.contrato_id === contrato.id) ||
          previstas7d.some((parcela) => parcela.contrato_id === contrato.id)
        )
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

    const contratoLeadIds = Array.from(new Set(contratos.map((contrato) => contrato.lead_id).filter(Boolean)))

    let leadsOrigemMap = new Map<string, { campanha_id: string | null; lista_id: string | null }>()
    if (contratoLeadIds.length > 0) {
      const { data: leadsOrigem } = await supabase
        .from('leads')
        .select('id, campanha_id, lista_id')
        .in('id', contratoLeadIds)

      leadsOrigemMap = new Map((leadsOrigem || []).map((lead) => [
        lead.id,
        {
          campanha_id: lead.campanha_id || null,
          lista_id: lead.lista_id || null,
        },
      ]))
    }

    const campanhaIds = Array.from(new Set(Array.from(leadsOrigemMap.values()).map((lead) => lead.campanha_id).filter(Boolean))) as string[]
    const listaIds = Array.from(new Set(Array.from(leadsOrigemMap.values()).map((lead) => lead.lista_id).filter(Boolean))) as string[]

    let campanhasMap = new Map<string, string>()
    if (campanhaIds.length > 0) {
      const { data: campanhas } = await supabase
        .from('campanhas')
        .select('id, nome')
        .in('id', campanhaIds)

      campanhasMap = new Map((campanhas || []).map((campanha) => [campanha.id, campanha.nome || 'Campanha']))
    }

    let listasMap = new Map<string, string>()
    if (listaIds.length > 0) {
      const { data: listas } = await supabase
        .from('listas')
        .select('id, nome')
        .in('id', listaIds)

      listasMap = new Map((listas || []).map((lista) => [lista.id, lista.nome || 'Lista']))
    }

    const agendamentosMap = new Map<string, { total: number; realizados: number }>()
    if (contratoLeadIds.length > 0) {
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('lead_id, status')
        .in('lead_id', contratoLeadIds)

      for (const agendamento of agendamentos || []) {
        const atual = agendamentosMap.get(agendamento.lead_id) || { total: 0, realizados: 0 }
        atual.total += 1
        if (agendamento.status === 'realizado') atual.realizados += 1
        agendamentosMap.set(agendamento.lead_id, atual)
      }
    }

    const enrichParcelas = (items: VencimentoItem[]) => items.map((parcela: VencimentoItem) => {
      const contrato = contratos.find((item) => item.id === parcela.contrato_id)
      const lead = contrato?.lead_id ? leadsMap.get(contrato.lead_id) : null

      return {
        ...parcela,
        lead_nome: lead?.nome || 'Lead',
      }
    })

    const vencendoHojeComLead = enrichParcelas(vencendoHoje)
    const proximasParcelas = enrichParcelas(previstas7d.slice(0, 5))

    const totalContratos = contratos.reduce((acc, contrato) => acc + Number(contrato.valor_total), 0)
    const totalRecebidoMes = recebidoMes.reduce((acc, parcela) => acc + Number(parcela.valor), 0)
    const totalAtrasado = atrasadas.reduce((acc, parcela) => acc + Number(parcela.valor), 0)
    const totalSucumbenciaPendente = contratos
      .filter((contrato) => contrato.sucumbencia_status === 'pendente')
      .reduce((acc, contrato) => acc + Number(contrato.honorario_sucumbencia || 0), 0)
    const totalSucumbenciaRecebida = contratos
      .filter((contrato) => contrato.sucumbencia_status === 'recebido')
      .reduce((acc, contrato) => acc + Number(contrato.honorario_sucumbencia || 0), 0)
    const totalPrevisto7d = previstas7d.reduce((acc, parcela) => acc + Number(parcela.valor), 0)
    const totalPrevisto30d = previstas30d.reduce((acc, parcela) => acc + Number(parcela.valor), 0)
    const totalRecebivelAberto = emAberto.reduce((acc, parcela) => acc + Number(parcela.valor), 0)
    const ticketMedioContrato = contratos.length > 0 ? totalContratos / contratos.length : 0
    const riscoFinanceiro = totalRecebivelAberto === 0
      ? 'baixo'
      : totalAtrasado >= totalRecebivelAberto * 0.4
        ? 'alto'
        : totalAtrasado > 0
          ? 'medio'
          : 'baixo'

    const resumoCarteira =
      riscoFinanceiro === 'alto'
        ? 'Carteira com pressao financeira relevante: atrasos representam parte material do recebivel aberto.'
        : riscoFinanceiro === 'medio'
          ? 'Carteira com sinais de atencao: existe atraso, mas ainda ha previsao saudavel de recebimento no curto prazo.'
          : totalPrevisto30d > 0
            ? 'Carteira saudavel: ha previsao de caixa no curto prazo e baixo peso de inadimplencia.'
            : 'Carteira com baixo risco, mas sem previsao relevante de recebimento nos proximos 30 dias.'

    const origensMap = new Map<string, OrigemCarteiraItem>()
    let contratosComCampanha = 0
    let contratosSemCampanha = 0
    let contratosComAgendamento = 0
    let contratosComAgendamentoRealizado = 0
    let valorViaCampanha = 0
    let valorViaOperacaoDireta = 0

    for (const contrato of contratos) {
      const origemLead = contrato.lead_id ? leadsOrigemMap.get(contrato.lead_id) : null
      const agendamentoLead = contrato.lead_id ? agendamentosMap.get(contrato.lead_id) : null
      const valorContrato = Number(contrato.valor_total || 0)

      let chave = 'manual'
      let label = 'Operação direta / cadastro manual'
      let tipo: OrigemCarteiraItem['tipo'] = 'manual'

      if (origemLead?.campanha_id) {
        chave = `campanha:${origemLead.campanha_id}`
        label = campanhasMap.get(origemLead.campanha_id) || 'Campanha'
        tipo = 'campanha'
        contratosComCampanha += 1
        valorViaCampanha += valorContrato
      } else if (origemLead?.lista_id) {
        const listaNome = listasMap.get(origemLead.lista_id) || 'Lista'
        const listaNormalizada = listaNome.trim().toLowerCase()
        if (!listaNormalizada.includes('cadastro manual')) {
          chave = `lista:${origemLead.lista_id}`
          label = listaNome
          tipo = 'lista'
        }
        contratosSemCampanha += 1
        valorViaOperacaoDireta += valorContrato
      } else {
        contratosSemCampanha += 1
        valorViaOperacaoDireta += valorContrato
      }

      if (agendamentoLead?.total) contratosComAgendamento += 1
      if (agendamentoLead?.realizados) contratosComAgendamentoRealizado += 1

      const atual = origensMap.get(chave) || {
        chave,
        label,
        tipo,
        contratos: 0,
        valorTotal: 0,
      }

      atual.contratos += 1
      atual.valorTotal += valorContrato
      origensMap.set(chave, atual)
    }

    const origensCarteira = Array.from(origensMap.values())
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 6)

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
        previsto7d: totalPrevisto7d,
        previsto30d: totalPrevisto30d,
        recebivelAberto: totalRecebivelAberto,
        ticketMedioContrato,
        proximasParcelas,
        origensCarteira,
        pipelineComercial: {
          contratosComCampanha,
          contratosSemCampanha,
          contratosComAgendamento,
          contratosComAgendamentoRealizado,
          valorViaCampanha,
          valorViaOperacaoDireta,
        },
        riscoFinanceiro,
        resumoCarteira,
      },
    })
  }

  return NextResponse.json({
    resumo: {
      totalContratos: 0,
      totalHonorariosContratuais: 0,
      totalAtivos: 0,
      totalQuitados: 0,
      totalInadimplentes: 0,
      recebidoMes: 0,
      atrasado: 0,
      qtdAtrasadas: 0,
      totalSucumbenciaPendente: 0,
      totalSucumbenciaRecebida: 0,
      vencendoHoje: [],
      previsto7d: 0,
      previsto30d: 0,
      recebivelAberto: 0,
      ticketMedioContrato: 0,
      proximasParcelas: [],
      origensCarteira: [],
      pipelineComercial: {
        contratosComCampanha: 0,
        contratosSemCampanha: 0,
        contratosComAgendamento: 0,
        contratosComAgendamentoRealizado: 0,
        valorViaCampanha: 0,
        valorViaOperacaoDireta: 0,
      },
      riscoFinanceiro: 'baixo',
      resumoCarteira: 'Sem contratos ativos ou visiveis para este tenant no momento.',
    },
  })
}
