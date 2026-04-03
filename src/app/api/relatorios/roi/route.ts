import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (!context.tenantId) {
      return NextResponse.json({
        campanhas: [],
        totais: {
          total_enviados: 0,
          total_respondidos: 0,
          total_convertidos: 0,
          honorarios_gerados: 0,
          taxa_conversao_geral: 0,
        },
      })
    }

    let campanhasQuery = supabase
      .from('campanhas')
      .select(`
        id, nome, status, responsavel_id, created_at, concluido_em,
        total_enviados, total_entregues, total_lidos,
        total_respondidos, total_convertidos, honorarios_gerados
      `)
      .order('created_at', { ascending: false })
    campanhasQuery = applyTenantFilter(campanhasQuery, context.tenantId)

    if (!context.isAdmin) {
      campanhasQuery = campanhasQuery.eq('responsavel_id', context.usuarioId)
    }

    const { data: campanhas, error } = await campanhasQuery

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const resultado = (campanhas || []).map((campanha) => {
      const enviados = campanha.total_enviados || 0
      const respondidos = campanha.total_respondidos || 0
      const convertidos = campanha.total_convertidos || 0
      const honorarios = Number(campanha.honorarios_gerados || 0)

      const taxaResposta = enviados > 0 ? (respondidos / enviados) * 100 : 0
      const taxaConversao = respondidos > 0 ? (convertidos / respondidos) * 100 : 0
      const taxaConversaoTotal = enviados > 0 ? (convertidos / enviados) * 100 : 0
      const receitaMediaPorConvertido = convertidos > 0 ? honorarios / convertidos : 0

      return {
        id: campanha.id,
        nome: campanha.nome,
        status: campanha.status,
        created_at: campanha.created_at,
        concluido_em: campanha.concluido_em,
        total_enviados: enviados,
        total_respondidos: respondidos,
        total_convertidos: convertidos,
        honorarios_gerados: honorarios,
        taxa_resposta: Math.round(taxaResposta * 10) / 10,
        taxa_conversao: Math.round(taxaConversao * 10) / 10,
        taxa_conversao_total: Math.round(taxaConversaoTotal * 10) / 10,
        receita_media_por_convertido: Math.round(receitaMediaPorConvertido),
      }
    })

    const totais = resultado.reduce((acc, campanha) => ({
      total_enviados: acc.total_enviados + campanha.total_enviados,
      total_respondidos: acc.total_respondidos + campanha.total_respondidos,
      total_convertidos: acc.total_convertidos + campanha.total_convertidos,
      honorarios_gerados: acc.honorarios_gerados + campanha.honorarios_gerados,
    }), { total_enviados: 0, total_respondidos: 0, total_convertidos: 0, honorarios_gerados: 0 })

    const taxaConversaoGeral = totais.total_enviados > 0
      ? Math.round((totais.total_convertidos / totais.total_enviados) * 1000) / 10
      : 0

    return NextResponse.json({
      campanhas: resultado,
      totais: {
        ...totais,
        taxa_conversao_geral: taxaConversaoGeral,
      },
    })
  } catch (error) {
    console.error('Erro relatórios ROI:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
