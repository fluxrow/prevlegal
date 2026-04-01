'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Check, CheckCircle, ChevronDown, ChevronUp, Clock, DollarSign, TrendingUp, X } from 'lucide-react'

interface Resumo {
  totalContratos: number
  totalHonorariosContratuais: number
  totalAtivos: number
  totalQuitados: number
  totalInadimplentes: number
  recebidoMes: number
  atrasado: number
  qtdAtrasadas: number
  totalSucumbenciaPendente: number
  totalSucumbenciaRecebida: number
  vencendoHoje: { id: string; valor: number; lead_nome: string }[]
  previsto7d: number
  previsto30d: number
  recebivelAberto: number
  ticketMedioContrato: number
  proximasParcelas: { id: string; valor: number; data_vencimento: string; lead_nome: string }[]
  origensCarteira: { chave: string; label: string; tipo: 'campanha' | 'lista' | 'manual'; contratos: number; valorTotal: number }[]
  pipelineComercial: {
    contratosComCampanha: number
    contratosSemCampanha: number
    contratosComAgendamento: number
    contratosComAgendamentoRealizado: number
    valorViaCampanha: number
    valorViaOperacaoDireta: number
  }
  riscoFinanceiro: 'baixo' | 'medio' | 'alto'
  resumoCarteira: string
}

interface Parcela {
  id: string
  numero: number
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: string
  forma_pagamento: string | null
}

interface Contrato {
  id: string
  lead_id: string
  descricao: string | null
  valor_total: number
  valor_entrada: number
  num_parcelas: number
  tipo_cobranca: string
  percentual_exito: number | null
  percentual_sucumbencia: number | null
  honorario_sucumbencia: number | null
  sucumbencia_status: string | null
  sucumbencia_data: string | null
  sucumbencia_observacoes: string | null
  status: string
  data_assinatura: string | null
  created_at: string
  leads?: { nome: string; cpf: string; telefone: string; status: string }
  parcelas: Parcela[]
}

const STATUS_CONTRATO: Record<string, { label: string; cor: string }> = {
  ativo: { label: 'Ativo', cor: '#4f7aff' },
  quitado: { label: 'Quitado', cor: '#2dd4a0' },
  cancelado: { label: 'Cancelado', cor: '#6b7280' },
  inadimplente: { label: 'Inadimplente', cor: '#ff5757' },
}

const STATUS_PARCELA: Record<string, { label: string; cor: string }> = {
  pendente: { label: 'Pendente', cor: '#f5c842' },
  pago: { label: 'Pago', cor: '#2dd4a0' },
  atrasado: { label: 'Atrasado', cor: '#ff5757' },
  cancelado: { label: 'Cancelado', cor: '#6b7280' },
}

const RISCO_FINANCEIRO: Record<'baixo' | 'medio' | 'alto', { label: string; cor: string; bg: string; border: string }> = {
  baixo: { label: 'Baixo risco', cor: '#2dd4a0', bg: 'rgba(45,212,160,0.08)', border: 'rgba(45,212,160,0.2)' },
  medio: { label: 'Atenção', cor: '#f5c842', bg: 'rgba(245,200,66,0.08)', border: 'rgba(245,200,66,0.22)' },
  alto: { label: 'Pressão financeira', cor: '#ff5757', bg: 'rgba(255,87,87,0.08)', border: 'rgba(255,87,87,0.22)' },
}

function moeda(v: number) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function FinanceiroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('todos')
  const [atualizandoParcela, setAtualizandoParcela] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const filtroParam = searchParams.get('filtro')
    if (!filtroParam) return

    if (['todos', 'ativo', 'quitado', 'inadimplente', 'cancelado'].includes(filtroParam)) {
      setFiltro(filtroParam)
    }
  }, [searchParams])

  async function fetchData() {
    setLoading(true)
    const [resumoResponse, contratosResponse] = await Promise.all([
      fetch('/api/financeiro/resumo'),
      fetch('/api/financeiro/contratos'),
    ])
    if (resumoResponse.status === 428 || contratosResponse.status === 428) {
      router.replace('/reauth?next=/financeiro')
      return
    }

    const [resumoRes, contratosRes] = await Promise.all([
      resumoResponse.json(),
      contratosResponse.json(),
    ])

    if (resumoRes.resumo) setResumo(resumoRes.resumo)
    if (contratosRes.contratos) setContratos(contratosRes.contratos)
    setLoading(false)
  }

  async function marcarParcela(parcelaId: string, status: 'pago' | 'pendente') {
    setAtualizandoParcela(parcelaId)
    const response = await fetch(`/api/financeiro/parcelas/${parcelaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        forma_pagamento: status === 'pago' ? 'pix' : null,
        data_pagamento: status === 'pendente' ? null : undefined,
      }),
    })
    if (response.status === 428) {
      setAtualizandoParcela(null)
      router.replace('/reauth?next=/financeiro')
      return
    }
    await fetchData()
    setAtualizandoParcela(null)
  }

  async function atualizarStatusContrato(contratoId: string, status: string) {
    const response = await fetch(`/api/financeiro/contratos/${contratoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (response.status === 428) {
      router.replace('/reauth?next=/financeiro')
      return
    }
    await fetchData()
  }

  const contratosFiltrados = contratos.filter((contrato) => filtro === 'todos' || contrato.status === filtro)
  const kpis = resumo ? [
    { label: 'Total em contratos', value: moeda(resumo.totalHonorariosContratuais || resumo.totalContratos), cor: '#4f7aff', icon: <DollarSign size={16} /> },
    { label: 'Recebido este mês', value: moeda(resumo.recebidoMes), cor: '#2dd4a0', icon: <TrendingUp size={16} /> },
    { label: 'Em aberto (atrasado)', value: moeda(resumo.atrasado), cor: '#ff5757', icon: <AlertCircle size={16} /> },
    { label: 'Sucumbência pendente', value: moeda(resumo.totalSucumbenciaPendente), cor: '#f5c842', icon: <Clock size={16} /> },
    { label: 'Contratos ativos', value: resumo.totalAtivos, cor: '#a78bfa', icon: <CheckCircle size={16} /> },
  ] : []
  const risco = resumo ? RISCO_FINANCEIRO[resumo.riscoFinanceiro] : null

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: '0 0 4px' }}>
            Financeiro
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Contratos, honorários e controle de recebimentos
          </p>
        </div>
      </div>

      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                <span style={{ color: kpi.cor }}>{kpi.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {resumo && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                Previsão de caixa
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {resumo.resumoCarteira}
              </p>
            </div>
            {risco && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: risco.cor, background: risco.bg, border: `1px solid ${risco.border}`, borderRadius: '999px', padding: '6px 10px' }}>
                {risco.label}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: resumo.proximasParcelas.length > 0 ? '14px' : 0 }}>
            {[
              { label: 'Previsto em 7 dias', value: moeda(resumo.previsto7d), color: '#4f7aff' },
              { label: 'Previsto em 30 dias', value: moeda(resumo.previsto30d), color: '#2dd4a0' },
              { label: 'Recebível em aberto', value: moeda(resumo.recebivelAberto), color: '#f5c842' },
              { label: 'Ticket médio', value: moeda(resumo.ticketMedioContrato), color: '#a78bfa' },
            ].map((item) => (
              <div key={item.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: item.color, fontFamily: 'Syne, sans-serif', margin: 0 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {resumo.proximasParcelas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Próximos recebimentos
              </p>
              {resumo.proximasParcelas.map((parcela) => (
                <div key={parcela.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>{parcela.lead_nome}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Vence em {fmtData(parcela.data_vencimento)}</p>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{moeda(parcela.valor)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {resumo && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                Origem comercial da carteira
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Veja se a receita está vindo mais de campanha, operação direta ou leads que já passaram por agendamento.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: resumo.origensCarteira.length > 0 ? '14px' : 0 }}>
            {[
              { label: 'Contratos via campanha', value: resumo.pipelineComercial.contratosComCampanha, color: '#4f7aff' },
              { label: 'Operação direta', value: resumo.pipelineComercial.contratosSemCampanha, color: '#a78bfa' },
              { label: 'Com agendamento', value: resumo.pipelineComercial.contratosComAgendamento, color: '#2dd4a0' },
              { label: 'Agendamento realizado', value: resumo.pipelineComercial.contratosComAgendamentoRealizado, color: '#f5c842' },
            ].map((item) => (
              <div key={item.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: item.color, fontFamily: 'Syne, sans-serif', margin: 0 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: resumo.origensCarteira.length > 0 ? '14px' : 0 }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Valor vindo de campanha
              </p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#4f7aff', fontFamily: 'Syne, sans-serif', margin: 0 }}>
                {moeda(resumo.pipelineComercial.valorViaCampanha)}
              </p>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Valor via operação direta
              </p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#a78bfa', fontFamily: 'Syne, sans-serif', margin: 0 }}>
                {moeda(resumo.pipelineComercial.valorViaOperacaoDireta)}
              </p>
            </div>
          </div>

          {resumo.origensCarteira.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Maiores origens da carteira
              </p>
              {resumo.origensCarteira.map((origem) => (
                <div key={origem.chave} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{origem.label}</p>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        borderRadius: '999px',
                        padding: '3px 8px',
                        background:
                          origem.tipo === 'campanha'
                            ? 'rgba(79,122,255,0.12)'
                            : origem.tipo === 'lista'
                              ? 'rgba(167,139,250,0.12)'
                              : 'rgba(245,200,66,0.12)',
                        color:
                          origem.tipo === 'campanha'
                            ? '#4f7aff'
                            : origem.tipo === 'lista'
                              ? '#a78bfa'
                              : '#f5c842',
                        border:
                          origem.tipo === 'campanha'
                            ? '1px solid rgba(79,122,255,0.22)'
                            : origem.tipo === 'lista'
                              ? '1px solid rgba(167,139,250,0.22)'
                              : '1px solid rgba(245,200,66,0.22)',
                      }}>
                        {origem.tipo === 'campanha' ? 'Campanha' : origem.tipo === 'lista' ? 'Lista' : 'Manual'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{origem.contratos} contrato(s)</p>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{moeda(origem.valorTotal)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {resumo && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
            Resumo financeiro
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Honorários contratuais</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{moeda(resumo.totalHonorariosContratuais || resumo.totalContratos)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Honorários de sucumbência</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{moeda((resumo.totalSucumbenciaPendente || 0) + (resumo.totalSucumbenciaRecebida || 0))}</strong>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '12px 0 0' }}>
            Pendente: {moeda(resumo.totalSucumbenciaPendente)} · Recebida: {moeda(resumo.totalSucumbenciaRecebida)}
          </p>
        </div>
      )}

      {resumo && resumo.vencendoHoje.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <Clock size={14} color="var(--yellow)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--yellow)' }}>{resumo.vencendoHoje.length} parcela(s)</strong> vencem hoje:
            {' '}
            {resumo.vencendoHoje.map((item) => item.lead_nome).join(', ')}
          </p>
        </div>
      )}

      {searchParams.get('filtro') ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'rgba(79,122,255,0.05)', border: '1px solid rgba(79,122,255,0.18)', borderRadius: '10px', padding: '12px 14px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', margin: '0 0 4px' }}>
              Filtro financeiro ativo
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Exibindo contratos no recorte <strong style={{ color: 'var(--text-secondary)' }}>{searchParams.get('filtro')}</strong>.
            </p>
          </div>
          <a
            href="/financeiro"
            style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', background: 'var(--bg)' }}
          >
            Limpar filtro
          </a>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { value: 'todos', label: 'Todos' },
          { value: 'ativo', label: 'Ativos' },
          { value: 'quitado', label: 'Quitados' },
          { value: 'inadimplente', label: 'Inadimplentes' },
          { value: 'cancelado', label: 'Cancelados' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFiltro(item.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: `1px solid ${filtro === item.value ? 'rgba(79,122,255,0.4)' : 'var(--border)'}`,
              background: filtro === item.value ? 'rgba(79,122,255,0.1)' : 'var(--bg)',
              color: filtro === item.value ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '32px 0', textAlign: 'center' }}>
          Carregando...
        </p>
      )}

      {!loading && contratosFiltrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <DollarSign size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhum contrato encontrado</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Crie um contrato a partir da página de um lead convertido</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {contratosFiltrados.map((contrato) => {
          const statusContrato = STATUS_CONTRATO[contrato.status] || STATUS_CONTRATO.ativo
          const aberto = expandido === contrato.id
          const totalPago = contrato.parcelas?.filter((parcela) => parcela.status === 'pago').reduce((acc, parcela) => acc + Number(parcela.valor), 0) || 0
          const progresso = contrato.valor_total > 0 ? (totalPago / contrato.valor_total) * 100 : 0

          return (
            <div key={contrato.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpandido(aberto ? null : contrato.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{contrato.leads?.nome || 'Lead'}</p>
                    <span style={{ fontSize: '10px', fontWeight: '700', background: `${statusContrato.cor}18`, color: statusContrato.cor, border: `1px solid ${statusContrato.cor}30`, borderRadius: '20px', padding: '2px 8px' }}>
                      {statusContrato.label}
                    </span>
                    {contrato.sucumbencia_status === 'pendente' && (
                      <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(245,200,66,0.12)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.24)', borderRadius: '20px', padding: '2px 8px' }}>
                        Sucumbência pendente
                      </span>
                    )}
                    {(contrato.tipo_cobranca === 'exito' || contrato.tipo_cobranca === 'misto') && contrato.percentual_exito !== null && (
                      <span style={{ fontSize: '10px', color: 'var(--purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '20px', padding: '2px 8px' }}>
                        Êxito {contrato.percentual_exito}%
                      </span>
                    )}
                  </div>
                  {contrato.descricao && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 6px' }}>{contrato.descricao}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progresso, 100)}%`, height: '100%', background: progresso >= 100 ? 'var(--green)' : 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{moeda(totalPago)} / {moeda(contrato.valor_total)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: '0 0 2px' }}>{moeda(contrato.valor_total)}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{contrato.num_parcelas}x parcela{contrato.num_parcelas > 1 ? 's' : ''}</p>
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {aberto && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                      Honorários de sucumbência
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      {contrato.honorario_sucumbencia ? moeda(contrato.honorario_sucumbencia) : 'A definir'}
                      {contrato.percentual_sucumbencia !== null && ` · ${contrato.percentual_sucumbencia}%`}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 2px' }}>
                      Status: {contrato.sucumbencia_status || 'pendente'}
                      {contrato.sucumbencia_data && ` · ${fmtData(contrato.sucumbencia_data)}`}
                    </p>
                    {contrato.sucumbencia_observacoes && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                        {contrato.sucumbencia_observacoes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                      Parcelas
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['ativo', 'quitado', 'inadimplente', 'cancelado'].map((status) => (
                        <button
                          key={status}
                          onClick={() => atualizarStatusContrato(contrato.id, status)}
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${contrato.status === status ? STATUS_CONTRATO[status].cor + '40' : 'var(--border)'}`,
                            background: contrato.status === status ? STATUS_CONTRATO[status].cor + '18' : 'transparent',
                            color: contrato.status === status ? STATUS_CONTRATO[status].cor : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontFamily: 'DM Sans, sans-serif',
                            fontWeight: '600',
                          }}
                        >
                          {STATUS_CONTRATO[status].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {contrato.parcelas?.sort((a, b) => a.numero - b.numero).map((parcela) => {
                      const statusParcela = STATUS_PARCELA[parcela.status] || STATUS_PARCELA.pendente
                      const carregando = atualizandoParcela === parcela.id

                      return (
                        <div key={parcela.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', border: `1px solid ${parcela.status === 'atrasado' ? 'rgba(255,87,87,0.2)' : 'var(--border)'}`, borderRadius: '9px', padding: '10px 14px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${statusParcela.cor}18`, border: `1px solid ${statusParcela.cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: statusParcela.cor }}>{parcela.numero}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 1px' }}>{moeda(parcela.valor)}</p>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                              Venc: {fmtData(parcela.data_vencimento)}
                              {parcela.data_pagamento && ` · Pago: ${fmtData(parcela.data_pagamento)}`}
                              {parcela.forma_pagamento && ` · ${parcela.forma_pagamento}`}
                            </p>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '700', background: `${statusParcela.cor}15`, color: statusParcela.cor, border: `1px solid ${statusParcela.cor}25`, borderRadius: '20px', padding: '2px 8px', flexShrink: 0 }}>
                            {statusParcela.label}
                          </span>
                          {parcela.status !== 'pago' && parcela.status !== 'cancelado' && (
                            <button
                              onClick={() => marcarParcela(parcela.id, 'pago')}
                              disabled={carregando}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: '7px', padding: '5px 10px', color: 'var(--green)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: '600', flexShrink: 0 }}
                            >
                              {carregando ? '...' : <><Check size={11} /> Marcar pago</>}
                            </button>
                          )}
                          {parcela.status === 'pago' && (
                            <button
                              onClick={() => marcarParcela(parcela.id, 'pendente')}
                              disabled={carregando}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', padding: '5px 10px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
                            >
                              {carregando ? '...' : <><X size={11} /> Desfazer</>}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
