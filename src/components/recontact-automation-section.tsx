'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Clock3, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import {
  DEFAULT_RECONTACT_AUTOMATION_CONFIG,
  getRecontactAutomationConfig,
  RECONTACT_MODE_LABELS,
  RECONTACT_STATUS_LABELS,
  RECONTACT_TYPE_LABELS,
  type RecontactAutomationConfig,
  type RecontactAutomationMode,
  type RecontactAutomationType,
} from '@/lib/recontact-automation'

type RecontactCandidateStatus = keyof typeof RECONTACT_STATUS_LABELS

type CandidateRecord = {
  id: string
  automation_type: RecontactAutomationType
  status: RecontactCandidateStatus
  mode_snapshot: string
  reason: string | null
  message_preview: string | null
  attempt_number: number
  eligible_at: string
  created_at: string
  leads?: {
    id: string
    nome: string | null
    telefone: string | null
    status: string | null
  } | Array<{
    id: string
    nome: string | null
    telefone: string | null
    status: string | null
  }> | null
  conversas?: {
    id: string
    status: string | null
    estado_operacional: string | null
    telefone: string | null
  } | Array<{
    id: string
    status: string | null
    estado_operacional: string | null
    telefone: string | null
  }> | null
}

type CandidateResponse = {
  foundationReady: boolean
  candidates: CandidateRecord[]
  error?: string
}

type SaveConfigPayload = {
  auto_recontact_mode: RecontactAutomationMode
  auto_recontact_campaign_no_reply_enabled: boolean
  auto_recontact_open_conversation_enabled: boolean
  auto_recontact_campaign_delay_hours: number
  auto_recontact_open_conversation_delay_hours: number
  auto_recontact_max_attempts: number
  auto_recontact_daily_limit: number
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function firstRecord<T>(value?: T | T[] | null) {
  if (!value) return null
  return Array.isArray(value) ? (value[0] || null) : value
}

function modeHelp(mode: RecontactAutomationMode) {
  switch (mode) {
    case 'shadow':
      return 'Detecta elegíveis e monta a fila, mas não envia nada.'
    case 'manual_review':
      return 'Monta a fila e deixa cada recontato aguardando aprovação manual.'
    case 'live':
      return 'Preparado para envio automático, mas ainda sem cron ligado nesta entrega.'
    case 'off':
    default:
      return 'Tudo desligado. Nenhuma varredura cria novos recontatos.'
  }
}

export default function RecontactAutomationSection() {
  const [config, setConfig] = useState<RecontactAutomationConfig>(DEFAULT_RECONTACT_AUTOMATION_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)
  const [foundationReady, setFoundationReady] = useState(true)
  const [foundationMessage, setFoundationMessage] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])

  const fetchCandidates = useCallback(async () => {
    const response = await fetch('/api/automacoes/recontato/candidates?limit=50')
    const json = (await response.json().catch(() => null)) as CandidateResponse | null
    if (!response.ok) {
      throw new Error(json?.error || 'Não foi possível carregar candidatos de recontato')
    }

    setFoundationReady(json?.foundationReady !== false)
    setFoundationMessage(json?.error || null)
    setCandidates(json?.candidates || [])
  }, [])

  const fetchConfig = useCallback(async () => {
    const response = await fetch('/api/configuracoes')
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(json?.error || 'Não foi possível carregar configurações')
    }
    setConfig(getRecontactAutomationConfig(json))
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        await Promise.all([fetchConfig(), fetchCandidates()])
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Erro ao carregar recontato automático')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fetchCandidates, fetchConfig])

  const canTriggerReview = foundationReady && config.mode !== 'off'

  const candidateSummary = useMemo(() => {
    return candidates.reduce<Record<string, number>>((acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] || 0) + 1
      return acc
    }, {})
  }, [candidates])

  const summaryCards: Array<{
    status: keyof typeof RECONTACT_STATUS_LABELS
    value: number
  }> = [
    { status: 'detected', value: candidateSummary.detected || 0 },
    { status: 'approved', value: candidateSummary.approved || 0 },
    { status: 'sent', value: candidateSummary.sent || 0 },
    { status: 'canceled', value: candidateSummary.canceled || 0 },
  ]

  function updateField<K extends keyof RecontactAutomationConfig>(key: K, value: RecontactAutomationConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  async function saveConfig() {
    setSaving(true)
    try {
      const payload: SaveConfigPayload = {
        auto_recontact_mode: config.mode,
        auto_recontact_campaign_no_reply_enabled: config.campaignNoReplyEnabled,
        auto_recontact_open_conversation_enabled: config.openConversationEnabled,
        auto_recontact_campaign_delay_hours: config.campaignDelayHours,
        auto_recontact_open_conversation_delay_hours: config.openConversationDelayHours,
        auto_recontact_max_attempts: config.maxAttempts,
        auto_recontact_daily_limit: config.dailyLimit,
      }

      const response = await fetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || 'Não foi possível salvar as configurações')
      }

      toast.success('Configurações de recontato salvas.')
      await fetchConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar recontato automático')
    } finally {
      setSaving(false)
    }
  }

  async function runScan() {
    setScanning(true)
    try {
      const response = await fetch('/api/automacoes/recontato/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || 'Não foi possível rodar a varredura')
      }

      const created = Number(json?.result?.created || 0)
      toast.success(created > 0 ? `Varredura concluída com ${created} candidato(s).` : 'Varredura concluída sem novos candidatos.')
      await fetchCandidates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao rodar varredura')
    } finally {
      setScanning(false)
    }
  }

  async function dispatchCandidate(candidateId: string) {
    setDispatchingId(candidateId)
    try {
      const response = await fetch('/api/automacoes/recontato/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', candidateId }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || 'Não foi possível enviar o recontato')
      }

      const status = String(json?.result?.status || '')
      if (status === 'sent') {
        toast.success('Recontato enviado.')
      } else if (status === 'canceled') {
        toast('Candidato cancelado antes do envio.')
      } else {
        toast('Candidato não foi enviado.')
      }

      await fetchCandidates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar recontato')
    } finally {
      setDispatchingId(null)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    fontFamily: 'DM Sans, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    padding: '10px 12px',
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          Carregando recontato automático...
        </p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <ShieldCheck size={16} color="var(--accent)" />
        <h3
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            fontFamily: 'Syne, sans-serif',
            margin: 0,
          }}
        >
          Recontato Automático
        </h3>
      </div>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginTop: 0,
          marginBottom: '18px',
          fontFamily: 'DM Sans, sans-serif',
          lineHeight: 1.6,
        }}
      >
        Esta base foi preparada para testar retomadas com segurança. Nada roda sozinho por padrão.
        O ideal é começar em <strong>shadow</strong>, revisar a fila e só depois avançar.
      </p>

      {!foundationReady && (
        <div
          style={{
            background: '#2a1c0d',
            border: '1px solid #7c5a24',
            color: '#f7d28b',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '12px',
            marginBottom: '16px',
            fontFamily: 'DM Sans, sans-serif',
            lineHeight: 1.6,
          }}
        >
          {foundationMessage || 'A migration da fundação de recontato ainda não foi aplicada no banco.'}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '14px',
        }}
      >
        <div>
          <label style={labelStyle}>Modo</label>
          <select
            value={config.mode}
            onChange={(event) => updateField('mode', event.target.value as RecontactAutomationMode)}
            style={inputStyle}
          >
            {Object.entries(RECONTACT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
            {modeHelp(config.mode)}
          </p>
        </div>

        <div>
          <label style={labelStyle}>Campanha sem resposta</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
            <input
              type="checkbox"
              checked={config.campaignNoReplyEnabled}
              onChange={(event) => updateField('campaignNoReplyEnabled', event.target.checked)}
            />
            Habilitar detecção
          </label>
        </div>

        <div>
          <label style={labelStyle}>Conversa em aberto</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
            <input
              type="checkbox"
              checked={config.openConversationEnabled}
              onChange={(event) => updateField('openConversationEnabled', event.target.checked)}
            />
            Habilitar detecção
          </label>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '18px',
        }}
      >
        <div>
          <label style={labelStyle}>Delay campanha (h)</label>
          <input
            type="number"
            min={1}
            value={config.campaignDelayHours}
            onChange={(event) => updateField('campaignDelayHours', Number(event.target.value || 1))}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Delay conversa (h)</label>
          <input
            type="number"
            min={1}
            value={config.openConversationDelayHours}
            onChange={(event) => updateField('openConversationDelayHours', Number(event.target.value || 1))}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Tentativas máximas</label>
          <input
            type="number"
            min={1}
            value={config.maxAttempts}
            onChange={(event) => updateField('maxAttempts', Number(event.target.value || 1))}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Limite diário</label>
          <input
            type="number"
            min={1}
            value={config.dailyLimit}
            onChange={(event) => updateField('dailyLimit', Number(event.target.value || 1))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => void saveConfig()}
          disabled={saving || !foundationReady}
          style={{
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: '#fff',
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: saving || !foundationReady ? 'not-allowed' : 'pointer',
            opacity: saving || !foundationReady ? 0.6 : 1,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </button>

        <button
          onClick={() => void runScan()}
          disabled={scanning || !canTriggerReview}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: scanning || !canTriggerReview ? 'not-allowed' : 'pointer',
            opacity: scanning || !canTriggerReview ? 0.6 : 1,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <RefreshCw size={14} />
          {scanning ? 'Rodando...' : 'Rodar varredura agora'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        {summaryCards.map(({ status, value }) => (
          <div
            key={status}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 12px',
              minWidth: '120px',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
              {value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {RECONTACT_STATUS_LABELS[status] || status}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {candidates.length === 0 && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              padding: '16px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Nenhum candidato de recontato detectado até agora.
          </div>
        )}

        {candidates.map((candidate) => {
          const lead = firstRecord(candidate.leads)
          const conversation = firstRecord(candidate.conversas)
          const canManualDispatch =
            foundationReady &&
            config.mode === 'manual_review' &&
            candidate.status === 'detected'

          return (
            <div
              key={candidate.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                    {lead?.nome || 'Lead sem nome'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
                    {lead?.telefone || 'Sem telefone'} • {RECONTACT_TYPE_LABELS[candidate.automation_type]}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 8px',
                      borderRadius: '999px',
                      background: 'var(--bg-hover)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {RECONTACT_STATUS_LABELS[candidate.status] || candidate.status}
                  </span>
                  {canManualDispatch && (
                    <button
                      onClick={() => void dispatchCandidate(candidate.id)}
                      disabled={dispatchingId === candidate.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--accent)',
                        border: '1px solid var(--accent)',
                        color: '#fff',
                        borderRadius: '9px',
                        padding: '8px 10px',
                        cursor: dispatchingId === candidate.id ? 'not-allowed' : 'pointer',
                        opacity: dispatchingId === candidate.id ? 0.6 : 1,
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      <Send size={13} />
                      {dispatchingId === candidate.id ? 'Enviando...' : 'Enviar agora'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                  {candidate.reason || 'Sem motivo registrado.'}
                </div>

                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    fontFamily: 'DM Sans, sans-serif',
                    lineHeight: 1.7,
                  }}
                >
                  {candidate.message_preview || 'Sem mensagem prevista.'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock3 size={12} />
                    Elegível em {formatDateTime(candidate.eligible_at)}
                  </span>
                  <span>Tentativa #{candidate.attempt_number}</span>
                  {conversation?.estado_operacional && (
                    <span>Estado atual: {conversation.estado_operacional.replaceAll('_', ' ')}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
