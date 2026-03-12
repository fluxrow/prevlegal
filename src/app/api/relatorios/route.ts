import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. KPIs de leads
    const { data: leads } = await supabase
      .from('leads')
      .select('status, ganho_potencial, tem_whatsapp, created_at')

    const totalLeads = leads?.length ?? 0
    const totalConvertidos = leads?.filter(l => l.status === 'converted').length ?? 0
    const totalAgendados = leads?.filter(l => l.status === 'scheduled').length ?? 0
    const totalContatados = leads?.filter(l => l.status === 'contacted').length ?? 0
    const totalComWhatsapp = leads?.filter(l => l.tem_whatsapp === true).length ?? 0
    const ganhoTotal = leads?.reduce((acc, l) => acc + (l.ganho_potencial ?? 0), 0) ?? 0
    const ganhoConvertidos = leads?.filter(l => l.status === 'converted').reduce((acc, l) => acc + (l.ganho_potencial ?? 0), 0) ?? 0

    // 2. KPIs de campanhas
    const { data: campanhas } = await supabase
      .from('campanhas')
      .select('nome, status, total_enviados, total_entregues, total_lidos, total_respondidos, total_falhos, created_at')

    const totalEnviados = campanhas?.reduce((acc, c) => acc + (c.total_enviados ?? 0), 0) ?? 0
    const totalEntregues = campanhas?.reduce((acc, c) => acc + (c.total_entregues ?? 0), 0) ?? 0
    const totalLidos = campanhas?.reduce((acc, c) => acc + (c.total_lidos ?? 0), 0) ?? 0
    const totalRespondidos = campanhas?.reduce((acc, c) => acc + (c.total_respondidos ?? 0), 0) ?? 0
    const totalFalhos = campanhas?.reduce((acc, c) => acc + (c.total_falhos ?? 0), 0) ?? 0

    // 3. Agente IA
    const { data: mensagensInbound } = await supabase
      .from('mensagens_inbound')
      .select('respondido_por_agente')

    const totalMensagens = mensagensInbound?.length ?? 0
    const respondidoAgente = mensagensInbound?.filter(m => m.respondido_por_agente === true).length ?? 0
    const respondidoManual = totalMensagens - respondidoAgente

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
    const { data: leadsComBanco } = await supabase
      .from('leads')
      .select('banco, ganho_potencial')
      .not('banco', 'is', null)

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
    })
  } catch (error) {
    console.error('Erro relatórios:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
