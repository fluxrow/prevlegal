'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface CampanhaROI {
  id: string
  nome: string
  status: string
  total_enviados: number
  total_respondidos: number
  total_convertidos: number
  honorarios_gerados: number
  taxa_resposta: number
  taxa_conversao: number
  taxa_conversao_total: number
  receita_media_por_convertido: number
}

interface Totais {
  total_enviados: number
  total_respondidos: number
  total_convertidos: number
  honorarios_gerados: number
  taxa_conversao_geral: number
}

export default function RelatoriosROITab() {
  const [campanhas, setCampanhas] = useState<CampanhaROI[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordenar, setOrdenar] = useState<'conversao' | 'receita' | 'enviados'>('conversao')

  useEffect(() => {
    fetch('/api/relatorios/roi')
      .then((r) => r.json())
      .then((d) => {
        setCampanhas(d.campanhas || [])
        setTotais(d.totais || null)
      })
      .finally(() => setLoading(false))
  }, [])

  const ordenadas = [...campanhas].sort((a, b) => {
    if (ordenar === 'conversao') return b.taxa_conversao_total - a.taxa_conversao_total
    if (ordenar === 'receita') return b.honorarios_gerados - a.honorarios_gerados
    return b.total_enviados - a.total_enviados
  })

  const cores = ['#4f7aff', '#2dd4a0', '#a78bfa', '#f5c842', '#ff8c42']

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
  const fmtR = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando relatório de ROI...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {totais && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total enviados', valor: fmt(totais.total_enviados), cor: 'var(--text-primary)' },
            { label: 'Responderam', valor: fmt(totais.total_respondidos), cor: '#4f7aff' },
            { label: 'Convertidos', valor: fmt(totais.total_convertidos), cor: '#2dd4a0' },
            { label: 'Receita gerada', valor: fmtR(totais.honorarios_gerados), cor: '#f5c842' },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{kpi.label}</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: '700', color: kpi.cor, lineHeight: 1, margin: 0 }}>{kpi.valor}</p>
            </div>
          ))}
        </div>
      )}

      {totais && (
        <div style={{ background: 'linear-gradient(135deg, rgba(79,122,255,0.08), rgba(45,212,160,0.06))', border: '1px solid rgba(79,122,255,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Taxa de conversão geral</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '42px', fontWeight: '800', color: '#2dd4a0', lineHeight: 1, margin: 0 }}>{totais.taxa_conversao_geral}%</p>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '400px', margin: 0 }}>
            De cada 100 leads enviados, <strong style={{ color: 'var(--text-primary)' }}>{totais.taxa_conversao_geral}</strong> chegam ao contrato. A média do mercado com qualificação manual é de 1-2%.
          </p>
        </div>
      )}

      {ordenadas.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>Ranking de campanhas</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Comparativo de performance entre campanhas</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['conversao', 'receita', 'enviados'] as const).map((opcao) => (
                <button
                  key={opcao}
                  onClick={() => setOrdenar(opcao)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: ordenar === opcao ? 'var(--accent)' : 'var(--border)',
                    background: ordenar === opcao ? 'rgba(79,122,255,0.1)' : 'transparent',
                    color: ordenar === opcao ? '#4f7aff' : 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {opcao === 'conversao' ? 'Conversão' : opcao === 'receita' ? 'Receita' : 'Volume'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordenadas} barSize={32}>
              <XAxis dataKey="nome" tick={{ fill: '#8b92a0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b92a0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              />
              <Bar
                dataKey={ordenar === 'conversao' ? 'taxa_conversao_total' : ordenar === 'receita' ? 'honorarios_gerados' : 'total_enviados'}
                radius={[4, 4, 0, 0]}
              >
                {ordenadas.map((_, i) => <Cell key={i} fill={cores[i % cores.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Detalhamento por campanha</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Campanha', 'Enviados', 'Responderam', 'Convertidos', 'Conv. %', 'Receita', 'Ticket médio'].map((header) => (
                  <th key={header} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenadas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhuma campanha encontrada. Crie sua primeira campanha para ver os dados de ROI aqui.
                  </td>
                </tr>
              ) : ordenadas.map((campanha, i) => (
                <tr
                  key={campanha.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cores[i % cores.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{campanha.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{fmt(campanha.total_enviados)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{fmt(campanha.total_respondidos)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#2dd4a0', fontWeight: 600 }}>{fmt(campanha.total_convertidos)}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ height: '4px', width: '60px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(campanha.taxa_conversao_total * 10, 100)}%`, background: '#4f7aff', borderRadius: '2px' }} />
                      </div>
                      <span style={{ color: '#4f7aff', fontWeight: 600, fontSize: '12px' }}>{campanha.taxa_conversao_total}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#f5c842', fontWeight: 600 }}>{fmtR(campanha.honorarios_gerados)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{fmtR(campanha.receita_media_por_convertido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
