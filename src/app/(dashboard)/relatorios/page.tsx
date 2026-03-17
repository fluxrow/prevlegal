'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Legend, Cell,
} from 'recharts'
import RelatoriosOnboardingTour from '@/components/relatorios-onboarding-tour'

interface RelatorioData {
  kpis: {
    totalLeads: number
    totalConvertidos: number
    totalAgendados: number
    totalContatados: number
    totalComWhatsapp: number
    ganhoTotal: number
    ganhoConvertidos: number
    taxaWhatsapp: number
    taxaConversao: number
  }
  campanhas: {
    totalEnviados: number
    totalEntregues: number
    totalLidos: number
    totalRespondidos: number
    totalFalhos: number
    taxaEntrega: number
    taxaLeitura: number
    taxaResposta: number
    lista: Array<{
      nome: string
      status: string
      enviados: number
      entregues: number
      lidos: number
      respondidos: number
      falhos: number
    }>
  }
  funil: Array<{ etapa: string; valor: number; cor: string }>
  evolucao: Array<{ mes: string; leads: number; potencial: number }>
  topBancos: Array<{ banco: string; ganho: number }>
  agente: {
    totalMensagens: number
    respondidoAgente: number
    respondidoManual: number
    taxaAutomacao: number
  }
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: color ?? 'var(--text-primary)', letterSpacing: '-1px' }}>{value}</span>
      {sub && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</span>}
    </div>
  )
}

const TABS = ['Visão Geral', 'Funil', 'Campanhas', 'Listas']
const TOOLTIP_STYLE = { background: '#161920', border: '1px solid #ffffff0f', borderRadius: '8px', color: '#f0f2f5' }
const AXIS_TICK = { fill: '#8b92a0', fontSize: 12 }

export default function RelatoriosPage() {
  const [data, setData] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState(0)

  useEffect(() => {
    fetch('/api/relatorios')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>Carregando relatórios...</div>
  }

  if (!data) {
    return <div style={{ padding: '32px', color: '#ef4444', fontSize: '14px' }}>Erro ao carregar dados.</div>
  }

  const pieData = [
    { name: 'Agente IA', value: data.agente.respondidoAgente, fill: '#4f7aff' },
    { name: 'Manual', value: data.agente.respondidoManual, fill: '#2dd4a0' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
        Relatórios
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
        Performance geral do escritório
      </p>

      {/* Tabs */}
      <div data-tour="relatorios-abas" style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} data-tour={t === 'Funil' ? 'relatorios-funil' : undefined} onClick={() => setAba(i)} style={{
            padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: aba === i ? '600' : '400',
            background: aba === i ? 'var(--bg-hover)' : 'transparent',
            color: aba === i ? 'var(--text-primary)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ABA 0 — Visão Geral */}
      {aba === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div data-tour="relatorios-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            <KpiCard label="Total de Leads" value={data.kpis.totalLeads.toLocaleString('pt-BR')} />
            <KpiCard label="Com WhatsApp" value={`${data.kpis.taxaWhatsapp}%`} sub={`${data.kpis.totalComWhatsapp} leads`} color="#22c55e" />
            <KpiCard label="Convertidos" value={data.kpis.totalConvertidos.toLocaleString('pt-BR')} sub={`Taxa: ${data.kpis.taxaConversao}%`} color="#22c55e" />
            <KpiCard label="Agendados" value={data.kpis.totalAgendados.toLocaleString('pt-BR')} color="#a78bfa" />
            <KpiCard label="Potencial Total" value={fmt(data.kpis.ganhoTotal)} color="#f5c842" />
            <KpiCard label="Honorários Realizados" value={fmt(data.kpis.ganhoConvertidos)} color="#22c55e" />
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Evolução de Leads — Últimos 6 Meses
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="mes" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f0f2f5' }} />
                <Line type="monotone" dataKey="leads" stroke="#4f7aff" strokeWidth={2} dot={{ fill: '#4f7aff', r: 4 }} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Top 5 Bancos — Ganho Potencial
            </h3>
            {data.topBancos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sem dados de banco disponíveis.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topBancos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="banco" tick={AXIS_TICK} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [fmt(typeof v === 'number' ? v : 0), 'Potencial'] as [string, string]} />
                  <Bar dataKey="ganho" fill="#4f7aff" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ABA 1 — Funil */}
      {aba === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Funil de Conversão
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.funil.map(etapa => {
                const maxValor = data.funil[0]?.valor ?? 1
                const pct = maxValor > 0 ? Math.round((etapa.valor / maxValor) * 100) : 0
                return (
                  <div key={etapa.etapa}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{etapa.etapa}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {etapa.valor.toLocaleString('pt-BR')} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: etapa.cor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Agente IA vs. Atendimento Manual
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <KpiCard label="Total Mensagens" value={data.agente.totalMensagens} />
                <KpiCard label="Taxa de Automação" value={`${data.agente.taxaAutomacao}%`} color="#4f7aff" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2 — Campanhas */}
      {aba === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            <KpiCard label="Total Enviados" value={data.campanhas.totalEnviados.toLocaleString('pt-BR')} />
            <KpiCard label="Taxa de Entrega" value={`${data.campanhas.taxaEntrega}%`} color="#22c55e" />
            <KpiCard label="Taxa de Leitura" value={`${data.campanhas.taxaLeitura}%`} color="#f5c842" />
            <KpiCard label="Taxa de Resposta" value={`${data.campanhas.taxaResposta}%`} color="#a78bfa" />
            <KpiCard label="Falhos" value={data.campanhas.totalFalhos.toLocaleString('pt-BR')} color="#ef4444" />
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Performance por Campanha
            </h3>
            {data.campanhas.lista.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhuma campanha disponível.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.campanhas.lista.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="nome" tick={{ ...AXIS_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="enviados" name="Enviados" fill="#4f7aff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lidos" name="Lidos" fill="#2dd4a0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="respondidos" name="Respondidos" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ABA 3 — Listas */}
      {aba === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Potencial por Mês de Importação
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="mes" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [fmt(typeof v === 'number' ? v : 0), 'Potencial'] as [string, string]} />
                <Bar dataKey="potencial" name="Potencial" fill="#f5c842" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            <KpiCard label="Potencial Total" value={fmt(data.kpis.ganhoTotal)} color="#f5c842" />
            <KpiCard label="Leads com WhatsApp" value={`${data.kpis.taxaWhatsapp}%`} sub={`${data.kpis.totalComWhatsapp} de ${data.kpis.totalLeads}`} color="#22c55e" />
            <KpiCard label="Honorários Realizados" value={fmt(data.kpis.ganhoConvertidos)} color="#22c55e" />
          </div>
        </div>
      )}

      <RelatoriosOnboardingTour />
    </div>
  )
}
