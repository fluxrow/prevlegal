import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: leads } = await supabase.from('leads').select('status, ganho_potencial, score, tem_whatsapp, banco, tipo_beneficio, created_at')
    const { data: campanhas } = await supabase.from('campanhas').select('nome, status, total_leads, total_enviados, total_entregues, total_lidos, total_respondidos, total_falhos, honorarios_gerados, created_at')
    const { data: listas } = await supabase.from('listas').select('nome, total_leads, total_com_whatsapp, total_sem_whatsapp, total_nao_verificado, ganho_potencial_total, ganho_potencial_medio')
    const { data: mensagens } = await supabase.from('mensagens_inbound').select('created_at, respondido_por_agente')

    const leadsArr = leads || []; const campanhasArr = campanhas || []; const listasArr = listas || []; const mensagensArr = mensagens || []
    const totalLeads = leadsArr.length
    const porStatus = leadsArr.reduce((acc: Record<string,number>, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc }, {})
    const potencialTotal = leadsArr.reduce((s, l) => s + (l.ganho_potencial || 0), 0)
    const potencialConvertidos = leadsArr.filter(l => l.status === 'converted').reduce((s, l) => s + (l.ganho_potencial || 0), 0)
    const scoresMedio = leadsArr.length > 0 ? leadsArr.reduce((s, l) => s + (l.score || 0), 0) / leadsArr.length : 0
    const comWhatsApp = leadsArr.filter(l => l.tem_whatsapp).length
    const totalEnviados = campanhasArr.reduce((s, c) => s + (c.total_enviados || 0), 0)
    const totalEntregues = campanhasArr.reduce((s, c) => s + (c.total_entregues || 0), 0)
    const totalLidos = campanhasArr.reduce((s, c) => s + (c.total_lidos || 0), 0)
    const totalRespondidos = campanhasArr.reduce((s, c) => s + (c.total_respondidos || 0), 0)
    const totalFalhos = campanhasArr.reduce((s, c) => s + (c.total_falhos || 0), 0)
    const honorariosGerados = campanhasArr.reduce((s, c) => s + (c.honorarios_gerados || 0), 0)
    const bancosMap = leadsArr.reduce((acc: Record<string,{count:number,potencial:number}>, l) => { const b = l.banco || 'Não informado'; if (!acc[b]) acc[b] = { count: 0, potencial: 0 }; acc[b].count++; acc[b].potencial += l.ganho_potencial || 0; return acc }, {})
    const topBancos = Object.entries(bancosMap).map(([nome, data]) => ({ nome, ...data })).sort((a, b) => b.potencial - a.potencial).slice(0, 6)
    const funil = [
      { etapa: 'Total Leads', valor: totalLeads, color: '#4f7aff' },
      { etapa: 'Com WhatsApp', valor: comWhatsApp, color: '#a78bfa' },
      { etapa: 'Contatados', valor: (porStatus['contacted']||0)+(porStatus['awaiting']||0)+(porStatus['scheduled']||0)+(porStatus['converted']||0), color: '#f5c842' },
      { etapa: 'Responderam', valor: totalRespondidos, color: '#ff8c42' },
      { etapa: 'Agendados', valor: porStatus['scheduled']||0, color: '#2dd4a0' },
      { etapa: 'Convertidos', valor: porStatus['converted']||0, color: '#2dd4a0' },
    ]
    const agora = new Date(); const meses: {mes:string;leads:number;potencial:number}[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth()-i, 1)
      const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const mesInicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const mesFim = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString()
      const ln = leadsArr.filter(l => l.created_at >= mesInicio && l.created_at <= mesFim)
      meses.push({ mes: mesLabel, leads: ln.length, potencial: ln.reduce((s,l) => s+(l.ganho_potencial||0), 0) })
    }
    const respondidosAgente = mensagensArr.filter(m => m.respondido_por_agente).length
    const respondidosManual = mensagensArr.filter(m => !m.respondido_por_agente).length
    return NextResponse.json({
      kpis: { totalLeads, porStatus, potencialTotal, potencialConvertidos, scoresMedio: Math.round(scoresMedio*10)/10, comWhatsApp, taxaWhatsApp: totalLeads > 0 ? Math.round((comWhatsApp/totalLeads)*100) : 0, honorariosGerados, taxaConversao: totalLeads > 0 ? Math.round(((porStatus['converted']||0)/totalLeads)*100*10)/10 : 0 },
      campanhas: { total: campanhasArr.length, totalEnviados, totalEntregues, totalLidos, totalRespondidos, totalFalhos, taxaEntrega: totalEnviados > 0 ? Math.round((totalEntregues/totalEnviados)*100) : 0, taxaLeitura: totalEntregues > 0 ? Math.round((totalLidos/totalEntregues)*100) : 0, taxaResposta: totalLidos > 0 ? Math.round((totalRespondidos/totalLidos)*100) : 0, lista: campanhasArr.map(c => ({ nome: c.nome, status: c.status, enviados: c.total_enviados||0, entregues: c.total_entregues||0, lidos: c.total_lidos||0, respondidos: c.total_respondidos||0, falhos: c.total_falhos||0, honorarios: c.honorarios_gerados||0 })) },
      listas: listasArr, topBancos, funil, evolucao: meses,
      agente: { respondidosAgente, respondidosManual, totalMensagens: mensagensArr.length }
    })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Internal error' }, { status: 500 }) }
}
