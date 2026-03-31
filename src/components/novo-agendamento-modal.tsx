'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, Loader2, Save, Search, Video, X } from 'lucide-react'

type LeadOption = {
  id: string
  nome: string
  telefone?: string | null
  status?: string | null
  email?: string | null
}

type UsuarioOption = {
  id: string
  nome: string
}

type InitialLead = {
  id: string
  nome: string
  telefone?: string | null
  status?: string | null
  email?: string | null
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(3px)',
  zIndex: 320,
}

const modalStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(720px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 48px)',
  overflowY: 'auto',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  zIndex: 321,
  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}

function toDateTimeLocalInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          display: 'block',
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: '700',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

export default function NovoAgendamentoModal({
  open,
  onClose,
  onCreated,
  initialLead,
  lockLead = false,
}: {
  open: boolean
  onClose: () => void
  onCreated?: () => void
  initialLead?: InitialLead | null
  lockLead?: boolean
}) {
  const [leadQuery, setLeadQuery] = useState(initialLead?.nome || '')
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>(initialLead ? [initialLead] : [])
  const [selectedLeadId, setSelectedLeadId] = useState(initialLead?.id || '')
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([])
  const [usuarioId, setUsuarioId] = useState('')
  const [emailReuniao, setEmailReuniao] = useState(initialLead?.email || '')
  const [dataHora, setDataHora] = useState(toDateTimeLocalInput(new Date(Date.now() + 60 * 60 * 1000)))
  const [duracaoMinutos, setDuracaoMinutos] = useState('30')
  const [observacoes, setObservacoes] = useState('')
  const [honorario, setHonorario] = useState('')
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const latestSearchRef = useRef(0)

  const selectedLead = useMemo(
    () => leadOptions.find((lead) => lead.id === selectedLeadId) || initialLead || null,
    [leadOptions, selectedLeadId, initialLead],
  )

  useEffect(() => {
    if (!open) return

    setError('')
    setObservacoes('')
    setHonorario('')
    setDuracaoMinutos('30')
    setDataHora(toDateTimeLocalInput(new Date(Date.now() + 60 * 60 * 1000)))
    setLeadQuery(initialLead?.nome || '')
    setSelectedLeadId(initialLead?.id || '')
    setLeadOptions(initialLead ? [initialLead] : [])
    setEmailReuniao(initialLead?.email || '')

    void loadUsuarios()
    if (!initialLead) {
      void searchLeads('')
    }
  }, [open, initialLead])

  useEffect(() => {
    if (lockLead && initialLead) return

    const query = leadQuery.trim()
    const digits = query.replace(/\D/g, '')
    const shouldSearch = query.length === 0 || query.length >= 2 || digits.length >= 3

    if (!shouldSearch) {
      setLeadOptions(initialLead ? [initialLead] : [])
      return
    }

    const timeoutId = window.setTimeout(() => {
      void searchLeads(query)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [leadQuery, lockLead, initialLead])

  useEffect(() => {
    if (selectedLead?.email) {
      setEmailReuniao((current) => current || selectedLead.email || '')
    }
  }, [selectedLead?.email])

  async function loadUsuarios() {
    setLoadingUsuarios(true)
    try {
      const res = await fetch('/api/usuarios')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const ativos = (data.usuarios || [])
        .filter((usuario: { ativo: boolean }) => usuario.ativo)
        .map((usuario: { id: string; nome: string }) => ({ id: usuario.id, nome: usuario.nome }))
      setUsuarios(ativos)
      setUsuarioId((current) => current || ativos[0]?.id || '')
    } catch {
      setUsuarios([])
    } finally {
      setLoadingUsuarios(false)
    }
  }

  async function searchLeads(query: string) {
    if (lockLead && initialLead) return

    const requestId = latestSearchRef.current + 1
    latestSearchRef.current = requestId
    setLoadingLeads(true)
    setError('')
    try {
      const trimmedQuery = query.trim()
      const [recentRes, buscaRes] = await Promise.all([
        fetch(`/api/leads?${new URLSearchParams({ ...(trimmedQuery ? { q: trimmedQuery } : {}), limit: '20', scope: 'scheduling' }).toString()}`),
        trimmedQuery.length >= 2
          ? fetch(`/api/busca?${new URLSearchParams({ q: trimmedQuery }).toString()}`)
          : Promise.resolve(null),
      ])

      if (!recentRes.ok) throw new Error()
      const recentData = await recentRes.json()
      const recentLeads = (recentData.leads || []) as LeadOption[]

      const buscaData = buscaRes && buscaRes.ok ? await buscaRes.json() : { resultados: [] }
      const buscaLeads = ((buscaData.resultados || []) as Array<{
        tipo: string
        id: string
        titulo: string
        subtitulo?: string
      }>)
        .filter((resultado) => resultado.tipo === 'lead')
        .map((resultado) => ({
          id: resultado.id,
          nome: resultado.titulo,
          telefone: resultado.subtitulo || null,
        }))

      const merged = new Map<string, LeadOption>()
      for (const lead of [...recentLeads, ...buscaLeads]) {
        if (!merged.has(lead.id)) {
          merged.set(lead.id, lead)
        }
      }

      const leads = Array.from(merged.values())
      if (latestSearchRef.current !== requestId) return

      setLeadOptions(leads)
      setSelectedLeadId((current) => {
        if (current && leads.some((lead: LeadOption) => lead.id === current)) {
          return current
        }
        return leads.length === 1 ? leads[0].id : ''
      })
    } catch {
      if (latestSearchRef.current !== requestId) return
      setLeadOptions(initialLead ? [initialLead] : [])
    } finally {
      if (latestSearchRef.current === requestId) {
        setLoadingLeads(false)
      }
    }
  }

  async function handleSubmit() {
    if (!selectedLeadId) {
      setError('Selecione um lead para agendar.')
      return
    }

    if (!dataHora) {
      setError('Defina a data e hora da consulta.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          usuario_id: usuarioId || undefined,
          data_hora: new Date(dataHora).toISOString(),
          duracao_minutos: Number(duracaoMinutos || 30),
          observacoes: observacoes.trim() || null,
          honorario: honorario ? Number(honorario) : null,
          email_reuniao: emailReuniao.trim() || null,
        }),
      })

      const rawBody = await response.text()
      let data: { error?: string } = {}
      try {
        data = rawBody ? JSON.parse(rawBody) : {}
      } catch {
        data = rawBody ? { error: rawBody } : {}
      }

      if (!response.ok) {
        setError(data.error || 'Não foi possível criar o agendamento')
        return
      }

      toast.success('Agendamento criado com sucesso')
      onCreated?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div style={overlayStyle} onClick={saving ? undefined : onClose} />
      <div style={modalStyle}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent)' }}>
              <CalendarClock size={16} />
              <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'Syne, sans-serif' }}>
                Novo agendamento
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
              {selectedLead ? selectedLead.nome : 'Criar consulta manual'}
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Use esse fluxo quando o humano avançar a conversa e quiser marcar a consulta sem depender do agente.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'grid', gap: '16px' }}>
          {error ? (
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.18)', color: '#ff8d8d', fontSize: '12px' }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px 16px' }}>
            <FormField label="Lead">
              {lockLead && initialLead ? (
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span>{initialLead.nome}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{initialLead.telefone || 'Sem telefone'}</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      value={leadQuery}
                      onChange={(e) => setLeadQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void searchLeads(leadQuery)
                        }
                      }}
                      placeholder="Buscar por nome ou telefone"
                      style={{ ...inputStyle, paddingLeft: '34px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void searchLeads(leadQuery)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      padding: '9px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    <Search size={13} />
                    Buscar lead
                  </button>
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      background: 'var(--bg-card)',
                      padding: '8px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {loadingLeads ? (
                      <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Buscando leads...
                      </div>
                    ) : leadOptions.length > 0 ? (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {leadOptions.map((lead) => {
                          const selected = lead.id === selectedLeadId
                          return (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => setSelectedLeadId(lead.id)}
                              style={{
                                textAlign: 'left',
                                borderRadius: '10px',
                                border: selected ? '1px solid rgba(79,122,255,0.45)' : '1px solid var(--border)',
                                background: selected ? 'rgba(79,122,255,0.14)' : 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                padding: '10px 12px',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                                {lead.nome}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {lead.telefone ? <span>{lead.telefone}</span> : null}
                                {lead.email ? <span>{lead.email}</span> : null}
                                {lead.status ? <span>{lead.status}</span> : null}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Nenhum lead encontrado para essa busca.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </FormField>

            <FormField label="Responsável">
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                style={inputStyle}
                disabled={loadingUsuarios}
              >
                <option value="">{loadingUsuarios ? 'Carregando equipe...' : 'Selecione'}</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Data e hora">
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Duração (minutos)">
              <input
                type="number"
                min={15}
                step={15}
                value={duracaoMinutos}
                onChange={(e) => setDuracaoMinutos(e.target.value)}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Honorário estimado">
              <input
                type="number"
                min={0}
                step={0.01}
                value={honorario}
                onChange={(e) => setHonorario(e.target.value)}
                placeholder="Opcional"
                style={inputStyle}
              />
            </FormField>

            <FormField label="E-mail da reunião">
              <input
                type="email"
                value={emailReuniao}
                onChange={(e) => setEmailReuniao(e.target.value)}
                placeholder={selectedLead?.email || 'Opcional — pode sobrescrever o e-mail atual do lead'}
                style={inputStyle}
              />
            </FormField>

            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '10px', background: 'rgba(79,122,255,0.08)', border: '1px solid rgba(79,122,255,0.18)', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Video size={14} color="var(--accent)" />
                Se o Google Calendar estiver conectado, o Meet será criado automaticamente.
              </div>
            </div>
          </div>

          <FormField label="Observações">
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Contexto da conversa, disponibilidade combinada, observações do atendimento..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: '110px' }}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              Depois de criar, o agendamento entra na fila operacional e o lead passa a refletir esse avanço.
            </span>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                background: saving ? 'var(--bg-hover)' : 'var(--accent)',
                color: saving ? 'var(--text-muted)' : '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '700',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Criar agendamento
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
