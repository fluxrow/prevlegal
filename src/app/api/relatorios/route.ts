import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAccessibleLeadIds, getTenantContext } from '@/lib/tenant-context'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const accessibleLeadIds = await getAccessibleLeadIds(supabase, context)

    // 1. KPIs de leads
    let leadsQuery = supabase
      .from('leads')
      .select('status, ganho_potencial, tem_whatsapp, created_at')

    if (accessibleLeadIds.length === 0) {
      return NextResponse.json({
        kpis: {
          totalLeads: 0,
          totalConvertidos: 0,
          totalAgendados: 0,
          totalContatados: 0,
          totalComWhatsapp: 0,
          ganhoTotal: 0,
          ganhoConvertidos: 0,
          taxaWhatsapp: 0,
          taxaConversao: 0,
        },
        campanhas: {
          totalEnviados: 0,
          totalEntregues: 0,
          totalLidos: 0,
          totalRespondidos: 0,
          totalFalhos: 0,
          taxaEntrega: 0,
          taxaLeitura: 0,
          taxaResposta: 0,
          lista: [],
        },
        funil: [
          { etapa: 'Total Leads', valor: 0, cor: '#4f7aff' },
          { etapa: 'Com WhatsApp', valor: 0, cor: '#2dd4a0' },
          { etapa: 'Contatados', valor: 0, cor: '#f5c842' },
          { etapa: 'Responderam', valor: 0, cor: '#ff8c42' },
          { etapa: 'Agendados', valor: 0, cor: '#a78bfa' },
          { etapa: 'Convertidos', valor: 0, cor: '#2dd4a0' },
        ],
        evolucao: [],
        topBancos: [],
        agente: {
          totalMensagens: 0,
          respondidoAgente: 0,
          respondidoManual: 0,
          taxaAutomacao: 0,
        },
        pipelineOperacional: {
          leadsComConversa: 0,
          leadsEmFilaHumana: 0,
          leadsAguardandoCliente: 0,
          leadsResolvidos: 0,
          leadsComAgendamento: 0,
          leadsConfirmados: 0,
          leadsRealizados: 0,
          leadsComContrato: 0,
          valorEmContratos: 0,
          ticketMedioLeadContratado: 0,
          resumo: 'Sem leads visiveis para montar o pipeline operacional neste tenant.',
        },
      })
    }
    leadsQuery = leadsQuery.in('id', accessibleLeadIds)

    const { data: leads } = await leadsQuery

    const totalLeads = leads?.length ?? 0
    const totalConvertidos = leads?.filter(l => l.status === 'converted').length ?? 0
    const totalAgendados = leads?.filter(l => l.status === 'scheduled').length ?? 0
    const totalContatados = leads?.filter(l => l.status === 'contacted').length ?? 0
    const totalComWhatsapp = leads?.filter(l => l.tem_whatsapp === true).length ?? 0
    const ganhoTotal = leads?.reduce((acc, l) => acc + (l.ganho_potencial ?? 0), 0) ?? 0
    const ganhoConvertidos = leads?.filter(l => l.status === 'converted').reduce((acc, l) => acc + (l.ganho_potencial ?? 0), 0) ?? 0

    // 2. KPIs de campanhas
    let campanhasQuery = supabase
      .from('campanhas')
      .select('nome, status, total_enviados, total_entregues, total_lidos, total_respondidos, total_falhos, created_at')

    if (!context.isAdmin) {
      campanhasQuery = campanhasQuery.eq('responsavel_id', context.usuarioId)
    }

    const { data: campanhas } = await campanhasQuery

    const totalEnviados = campanhas?.reduce((acc, c) => acc + (c.total_enviados ?? 0), 0) ?? 0
    const totalEntregues = campanhas?.reduce((acc, c) => acc + (c.total_entregues ?? 0), 0) ?? 0
    const totalLidos = campanhas?.reduce((acc, c) => acc + (c.total_lidos ?? 0), 0) ?? 0
    const totalRespondidos = campanhas?.reduce((acc, c) => acc + (c.total_respondidos ?? 0), 0) ?? 0
    const totalFalhos = campanhas?.reduce((acc, c) => acc + (c.total_falhos ?? 0), 0) ?? 0

    // 3. Agente IA
    let mensagensInboundQuery = supabase
      .from('mensagens_inbound')
      .select('respondido_por_agente')

    mensagensInboundQuery = mensagensInboundQuery.in('lead_id', accessibleLeadIds)

    const { data: mensagensInbound } = await mensagensInboundQuery

    const totalMensagens = mensagensInbound?.length ?? 0
    const respondidoAgente = mensagensInbound?.filter(m => m.respondido_por_agente === true).length ?? 0
    const respondidoManual = totalMensagens - respondidoAgente

    const [conversasRes, agendamentosRes, contratosRes] = await Promise.all([
      supabase
        .from('conversas')
        .select('lead_id, status')
        .in('lead_id', accessibleLeadIds),
      supabase
        .from('agendamentos')
        .select('lead_id, status')
        .in('lead_id', accessibleLeadIds),
      supabase
        .from('contratos')
        .select('lead_id, valor_total, status')
        .in('lead_id', accessibleLeadIds),
    ])

    if (conversasRes.error) return NextResponse.json({ error: conversasRes.error.message }, { status: 500 })
    if (agendamentosRes.error) return NextResponse.json({ error: agendamentosRes.error.message }, { status: 500 })
    if (contratosRes.error) return NextResponse.json({ error: contratosRes.error.message }, { status: 500 })

    const conversas = conversasRes.data || []
    const agendamentos = agendamentosRes.data || []
    const contratosPipeline = contratosRes.data || []

    const uniqLeadCount = (items: Array<{ lead_id: string | null | undefined }>) =>
      new Set(items.map((item) => item.lead_id).filter(Boolean)).size

    const leadsComConversa = uniqLeadCount(conversas)
    const leadsEmFilaHumana = uniqLeadCount(
      conversas.filter((conversa) => ['humano', 'aguardando_cliente'].includes(conversa.status)),
    )
    const leadsAguardandoCliente = uniqLeadCount(
      conversas.filter((conversa) => conversa.status === 'aguardando_cliente'),
    )
    const leadsResolvidos = uniqLeadCount(
      conversas.filter((conversa) => conversa.status === 'resolvido'),
    )
    const leadsComAgendamento = uniqLeadCount(agendamentos)
    const leadsConfirmados = uniqLeadCount(
      agendamentos.filter((agendamento) => ['confirmado', 'realizado'].includes(agendamento.status)),
    )
    const leadsRealizados = uniqLeadCount(
      agendamentos.filter((agendamento) => agendamento.status === 'realizado'),
    )
    const contratosAtivosOuQuitados = contratosPipeline.filter((contrato) => contrato.status !== 'cancelado')
    const leadsComContrato = uniqLeadCount(contratosAtivosOuQuitados)
    const valorEmContratos = contratosAtivosOuQuitados.reduce((acc, contrato) => acc + Number(contrato.valor_total || 0), 0)
    const ticketMedioLeadContratado = leadsComContrato > 0 ? valorEmContratos / leadsComContrato : 0

    const resumoPipeline =
      leadsComContrato > 0
        ? `${leadsComContrato} lead(s) ja viraram contrato, com ${leadsConfirmados} confirmados e ${leadsEmFilaHumana} ainda exigindo operacao humana.`
        : `${leadsComAgendamento} lead(s) ja passaram por agendamento e ${leadsEmFilaHumana} ainda estao na fila humana.`

    // 4. Evolução mensal (últimos 6 meses)
    const agora = new Date()
    const evolucao = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0)
      const mesLabel = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
      const leadsNoMes = leads?.filter(l => {
        const created = new Date(l.created_at)
        return created >= d && created <= fim
      }) ?? []
      const potencialMes = leadsNoMes.reduce((acc, l) => acc + (l.ganho_potencial ?? 0), 0)
      evolucao.push({ mes: mesLabel, leads: leadsNoMes.length, potencial: potencialMes })
    }

    // 5. Top bancos por ganho potencial
    let leadsComBancoQuery = supabase
      .from('leads')
      .select('banco, ganho_potencial')
      .not('banco', 'is', null)

    leadsComBancoQuery = leadsComBancoQuery.in('id', accessibleLeadIds)

    const { data: leadsComBanco } = await leadsComBancoQuery

    const bancosMap: Record<string, number> = {}
    leadsComBanco?.forEach(l => {
      if (l.banco) {
        bancosMap[l.banco] = (bancosMap[l.banco] ?? 0) + (l.ganho_potencial ?? 0)
      }
    })
    const topBancos = Object.entries(bancosMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([banco, ganho]) => ({ banco, ganho }))

    return NextResponse.json({
      kpis: {
        totalLeads,
        totalConvertidos,
        totalAgendados,
        totalContatados,
        totalComWhatsapp,
        ganhoTotal,
        ganhoConvertidos,
        taxaWhatsapp: totalLeads > 0 ? Math.round((totalComWhatsapp / totalLeads) * 100) : 0,
        taxaConversao: totalLeads > 0 ? Math.round((totalConvertidos / totalLeads) * 100) : 0,
      },
      campanhas: {
        totalEnviados,
        totalEntregues,
        totalLidos,
        totalRespondidos,
        totalFalhos,
        taxaEntrega: totalEnviados > 0 ? Math.round((totalEntregues / totalEnviados) * 100) : 0,
        taxaLeitura: totalEntregues > 0 ? Math.round((totalLidos / totalEntregues) * 100) : 0,
        taxaResposta: totalLidos > 0 ? Math.round((totalRespondidos / totalLidos) * 100) : 0,
        lista: campanhas?.map(c => ({
          nome: c.nome,
          status: c.status,
          enviados: c.total_enviados ?? 0,
          entregues: c.total_entregues ?? 0,
          lidos: c.total_lidos ?? 0,
          respondidos: c.total_respondidos ?? 0,
          falhos: c.total_falhos ?? 0,
        })) ?? [],
      },
      funil: [
        { etapa: 'Total Leads', valor: totalLeads, cor: '#4f7aff' },
        { etapa: 'Com WhatsApp', valor: totalComWhatsapp, cor: '#2dd4a0' },
        { etapa: 'Contatados', valor: totalContatados, cor: '#f5c842' },
        { etapa: 'Responderam', valor: totalRespondidos, cor: '#ff8c42' },
        { etapa: 'Agendados', valor: totalAgendados, cor: '#a78bfa' },
        { etapa: 'Convertidos', valor: totalConvertidos, cor: '#2dd4a0' },
      ],
      evolucao,
      topBancos,
      agente: {
        totalMensagens,
        respondidoAgente,
        respondidoManual,
        taxaAutomacao: totalMensagens > 0 ? Math.round((respondidoAgente / totalMensagens) * 100) : 0,
      },
      pipelineOperacional: {
        leadsComConversa,
        leadsEmFilaHumana,
        leadsAguardandoCliente,
        leadsResolvidos,
        leadsComAgendamento,
        leadsConfirmados,
        leadsRealizados,
        leadsComContrato,
        valorEmContratos,
        ticketMedioLeadContratado,
        resumo: resumoPipeline,
      },
    })
  } catch (error) {
    console.error('Erro relatórios:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
