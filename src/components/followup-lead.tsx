'use client'

import { useEffect, useState } from 'react'
import { Zap, Play, Pause, X, ChevronDown, ChevronUp, Clock, RefreshCw, Send } from 'lucide-react'

interface FollowupRule {
  id: string
  nome: string
  descricao: string | null
  followup_rule_steps: { ordem: number; delay_horas: number; canal: string }[]
}

interface FollowupEvent {
  id: string
  tipo: string
  step_ordem: number | null
  mensagem_enviada: string | null
  canal: string | null
  metadata?: {
    erro?: string
    disparo_manual?: boolean
    usuario_id?: string
    proximo_step?: number | null
  } | null
  created_at: string
}

interface FollowupRun {
  id: string
  status: string
  proximo_step_ordem: number
  proximo_envio_at: string | null
  motivo_parada: string | null
  created_at: string
  followup_rules: { id: string; nome: string; descricao: string | null } | null
  followup_events: FollowupEvent[]
}

const STATUS_RUN: Record<string, { label: string; color: string; bg: string }> = {
  ativo:           { label: 'Ativo',          color: '#2dd4a0', bg: '#2dd4a020' },
  pausado:         { label: 'Pausado',         color: '#f59e0b', bg: '#f59e0b20' },
  concluido:       { label: 'Concluído',       color: '#14b8a6', bg: '#14b8a620' },
  cancelado:       { label: 'Cancelado',       color: '#4a5060', bg: '#4a506020' },
  stop_automatico: { label: 'Stop automático', color: '#4f7aff', bg: '#4f7aff20' },
}

const EVENTO_LABEL: Record<string, string> = {
  iniciado:             '▶ Iniciado',
  step_disparado:       '📤 Mensagem enviada',
  step_falhou:          '⚠ Envio falhou',
  pausado:              '⏸ Pausado',
  retomado:             '▶ Retomado',
  cancelado:            '✕ Cancelado',
  stop_lead_respondeu:  '✅ Lead respondeu',
  stop_humano_assumiu:  '👤 Humano assumiu',
  stop_agendamento:     '📅 Agendamento criado',
  stop_convertido:      '🏆 Convertido',
  stop_perdido:         '❌ Perdido',
  concluido:            '✅ Concluído',
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getEventDetail(event: FollowupEvent) {
  if (event.tipo === 'step_falhou' && event.metadata?.erro) {
    return `Motivo: ${event.metadata.erro}`
  }

  if (event.tipo === 'step_disparado' && event.metadata?.disparo_manual) {
    return 'Disparo manual para validação'
  }

  return null
}

export default function FollowupLead({ leadId }: { leadId: string }) {
  const [runs, setRuns] = useState<FollowupRun[]>([])
  const [rules, setRules] = useState<FollowupRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAtivar, setShowAtivar] = useState(false)
  const [ruleSelecionada, setRuleSelecionada] = useState('')
  const [ativando, setAtivando] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [executandoRunId, setExecutandoRunId] = useState<string | null>(null)

  const fetchRuns = async () => {
    const res = await fetch(`/api/leads/${leadId}/followup`)
    if (res.ok) setRuns(await res.json())
    setLoading(false)
  }

  const fetchRules = async () => {
    const res = await fetch('/api/followup/rules')
    if (res.ok) setRules(await res.json())
  }

  useEffect(() => {
    void fetchRuns()
    void fetchRules()
  }, [leadId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchRuns()
    }, 10000)

    const handleFocus = () => {
      void fetchRuns()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [leadId])

  const runAtiva = runs.find(r => r.status === 'ativo' || r.status === 'pausado')

  async function refreshNow() {
    setRefreshing(true)
    await fetchRuns()
    setRefreshing(false)
  }

  async function ativarFollowup() {
    if (!ruleSelecionada) return
    setAtivando(true)
    setErro(null)
    const res = await fetch(`/api/leads/${leadId}/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleSelecionada }),
    })
    if (res.ok) {
      setShowAtivar(false)
      setRuleSelecionada('')
      await fetchRuns()
    } else {
      const d = await res.json().catch(() => null)
      setErro(d?.error || 'Erro ao ativar follow-up')
    }
    setAtivando(false)
  }

  async function acao(runId: string, action: 'pausar' | 'retomar' | 'cancelar') {
    await fetch(`/api/leads/${leadId}/followup/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    await fetchRuns()
  }

  async function executarAgora(runId: string) {
    setExecutandoRunId(runId)
    setErro(null)

    const res = await fetch(`/api/leads/${leadId}/followup/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'executar_agora' }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErro(data?.error || 'Erro ao executar follow-up agora')
    }

    await fetchRuns()
    setExecutandoRunId(null)
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '24px',
    marginTop: '24px',
  }

  const btnStyle = (color: string, bg: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
    background: bg, color, border: `1px solid ${color}40`,
  })

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="var(--accent)" />
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            Follow-up
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => void refreshNow()}
            style={btnStyle('var(--text-secondary)', 'var(--bg-card)')}
          >
            <RefreshCw size={11} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} /> Atualizar
          </button>
          {!runAtiva && rules.length > 0 && (
            <button
              onClick={() => setShowAtivar(o => !o)}
              style={btnStyle('var(--accent)', 'rgba(79,122,255,0.1)')}
            >
              <Play size={11} /> Ativar follow-up
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 14px', lineHeight: 1.5 }}>
        Este bloco atualiza automaticamente a cada 10 segundos e também ao voltar o foco para a aba.
        {' '}Use <strong style={{ color: 'var(--text-primary)' }}>Executar agora</strong> para validar o próximo passo sem esperar o cron.
      </p>

      {/* Painel de ativação */}
      {showAtivar && (
        <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            Escolha a sequência de follow-up:
          </p>
          <select
            value={ruleSelecionada}
            onChange={e => setRuleSelecionada(e.target.value)}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', width: '100%' }}
          >
            <option value="">Selecionar regra...</option>
            {rules.map(r => (
              <option key={r.id} value={r.id}>
                {r.nome} ({r.followup_rule_steps?.length ?? 0} passos)
              </option>
            ))}
          </select>
          {ruleSelecionada && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {rules.find(r => r.id === ruleSelecionada)?.followup_rule_steps
                ?.sort((a, b) => a.ordem - b.ordem)
                .map(s => `+${s.delay_horas}h via ${s.canal}`)
                .join(' → ')}
            </p>
          )}
          {erro && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => void ativarFollowup()}
              disabled={ativando || !ruleSelecionada}
              style={{ ...btnStyle('#fff', ruleSelecionada ? 'var(--accent)' : 'var(--bg-hover)'), border: 'none', color: ruleSelecionada ? '#fff' : 'var(--text-muted)', cursor: ruleSelecionada ? 'pointer' : 'not-allowed' }}
            >
              {ativando ? 'Ativando...' : 'Confirmar'}
            </button>
            <button onClick={() => { setShowAtivar(false); setErro(null) }} style={btnStyle('var(--text-muted)', 'transparent')}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Sem regras cadastradas */}
      {!loading && rules.length === 0 && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
          Nenhuma regra de follow-up cadastrada.{' '}
          <a href="/configuracoes?tab=followup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Criar regra →</a>
        </p>
      )}

      {/* Lista de runs */}
      {loading ? (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Carregando...</p>
      ) : runs.length === 0 ? (
        rules.length > 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Nenhum follow-up ativo para este lead.
          </p>
        ) : null
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {runs.map(run => {
            const st = STATUS_RUN[run.status] ?? STATUS_RUN.cancelado
            const aberto = expandedRun === run.id
            return (
              <div key={run.id} style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--bg-card)' }}
                  onClick={() => setExpandedRun(aberto ? null : run.id)}
                >
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: st.bg, color: st.color, fontWeight: '700', flexShrink: 0 }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.followup_rules?.nome ?? '—'}
                  </span>
                  {run.proximo_envio_at && run.status === 'ativo' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      <Clock size={10} /> {formatTime(run.proximo_envio_at)}
                    </span>
                  )}
                  {/* Ações */}
                  {run.status === 'ativo' && (
                    <button
                      onClick={e => { e.stopPropagation(); void executarAgora(run.id) }}
                      disabled={executandoRunId === run.id}
                      style={{ ...btnStyle('#4f7aff', '#4f7aff20'), padding: '3px 9px', fontSize: '11px', opacity: executandoRunId === run.id ? 0.7 : 1, cursor: executandoRunId === run.id ? 'wait' : 'pointer' }}
                    >
                      <Send size={10} /> {executandoRunId === run.id ? 'Executando...' : 'Executar agora'}
                    </button>
                  )}
                  {run.status === 'ativo' && (
                    <button onClick={e => { e.stopPropagation(); void acao(run.id, 'pausar') }} style={{ ...btnStyle('#f59e0b', '#f59e0b20'), padding: '3px 9px', fontSize: '11px' }}>
                      <Pause size={10} /> Pausar
                    </button>
                  )}
                  {run.status === 'pausado' && (
                    <button onClick={e => { e.stopPropagation(); void acao(run.id, 'retomar') }} style={{ ...btnStyle('#2dd4a0', '#2dd4a020'), padding: '3px 9px', fontSize: '11px' }}>
                      <Play size={10} /> Retomar
                    </button>
                  )}
                  {['ativo', 'pausado'].includes(run.status) && (
                    <button onClick={e => { e.stopPropagation(); void acao(run.id, 'cancelar') }} style={{ ...btnStyle('#ff6b6b', '#ff6b6b20'), padding: '3px 9px', fontSize: '11px' }}>
                      <X size={10} /> Cancelar
                    </button>
                  )}
                  {aberto ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                </div>

                {aberto && (
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {run.followup_events.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Nenhum evento registrado ainda.</p>
                    ) : run.followup_events.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(ev => (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }}>{formatTime(ev.created_at)}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                            {EVENTO_LABEL[ev.tipo] ?? ev.tipo}
                            {ev.step_ordem ? ` — passo ${ev.step_ordem}` : ''}
                            {ev.mensagem_enviada ? `: "${ev.mensagem_enviada.slice(0, 60)}..."` : ''}
                          </span>
                          {getEventDetail(ev) && (
                            <span style={{ fontSize: '11px', color: ev.tipo === 'step_falhou' ? '#ff6b6b' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.45 }}>
                              {getEventDetail(ev)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {run.motivo_parada && (
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' }}>
                        Motivo: {run.motivo_parada}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
