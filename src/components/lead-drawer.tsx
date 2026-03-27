'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, User, FileText, CreditCard, Hash,
  MessageSquarePlus, Loader2, ChevronDown, AlertCircle, ExternalLink, MessageSquare, Send
} from 'lucide-react'
import IniciarConversaModal from '@/components/iniciar-conversa-modal'
import { buildInboxHref, buildWhatsAppHref } from '@/lib/contact-shortcuts'

type Lead = {
  id: string
  nome: string
  nb: string
  cpf: string | null
  telefone: string | null
  status: string
  score: number
  ganho_potencial: number | null
  tipo_beneficio: string | null
  banco: string | null
  dib: string | null
  aps: string | null
  data_nascimento: string | null
  sexo: string | null
  categoria_profissional: string | null
  isencao_ir: string | null
  pensionista: string | null
  bloqueado: boolean | null
  forma_pagamento: string | null
  der: string | null
  nit: string | null
}

type Anotacao = {
  id: string
  texto: string
  created_at: string
  usuario_id: string
}

const STATUS_OPTIONS = [
  { id: 'new',       label: 'Novo',        color: '#4f7aff' },
  { id: 'contacted', label: 'Contatado',   color: '#f5c842' },
  { id: 'awaiting',  label: 'Aguardando',  color: '#ff8c42' },
  { id: 'scheduled', label: 'Agendado',    color: '#a78bfa' },
  { id: 'converted', label: 'Convertido',  color: '#2dd4a0' },
  { id: 'lost',      label: 'Perdido',     color: '#ff5757' },
]

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('pt-BR') } catch { return s }
}
function calcIdade(dataNasc: string | null): string {
  if (!dataNasc) return '—'
  try {
    const nasc = new Date(dataNasc)
    const hoje = new Date()
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return `${idade} anos`
  } catch { return '—' }
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <Icon size={13} color="var(--accent)" strokeWidth={2} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Syne, sans-serif' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '12px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'right', fontStyle: value ? 'normal' : 'italic', fontFamily: mono ? 'monospace' : undefined }}>
        {value || '—'}
      </span>
    </div>
  )
}

export default function LeadDrawer({
  leadId,
  onClose,
  onStatusChange,
}: {
  leadId: string | null
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [showStartConversation, setShowStartConversation] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!leadId) { setLead(null); setConversaId(null); return }
    setLoading(true)
    fetch(`/api/leads/${leadId}`)
      .then(r => r.json())
      .then(data => {
        setLead(data.lead)
        setAnotacoes(data.anotacoes || [])
        setConversaId(data.conversa?.id || null)
      })
      .finally(() => setLoading(false))
  }, [leadId])

  async function salvarAnotacao() {
    if (!novaAnotacao.trim() || !leadId) return
    setSalvando(true)
    const res = await fetch(`/api/leads/${leadId}/anotacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: novaAnotacao.trim() })
    })
    const data = await res.json()
    if (data.success) { setAnotacoes(prev => [data.anotacao, ...prev]); setNovaAnotacao('') }
    setSalvando(false)
  }

  async function mudarStatus(novoStatus: string) {
    if (!lead) return
    setShowStatus(false)
    const prev = lead.status
    setLead(l => l ? { ...l, status: novoStatus } : l)
    onStatusChange(lead.id, novoStatus)
    const res = await fetch(`/api/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    })
    if (!res.ok) setLead(l => l ? { ...l, status: prev } : l)
  }

  const statusAtual = STATUS_OPTIONS.find(s => s.id === lead?.status)
  const inboxHref = buildInboxHref({ conversaId, telefone: lead?.telefone })
  const whatsappHref = buildWhatsAppHref(lead?.telefone)
  if (!leadId) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.nome}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NB {lead.nb}</span>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowStatus(!showStatus)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${statusAtual?.color}20`, border: `1px solid ${statusAtual?.color}40`, borderRadius: '20px', padding: '2px 10px', color: statusAtual?.color, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                        {statusAtual?.label}<ChevronDown size={10} />
                      </button>
                      {showStatus && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 20, marginTop: '4px', boxShadow: '0 8px 24px #00000040', minWidth: '140px' }}>
                          {STATUS_OPTIONS.filter(s => s.id !== lead.status).map(s => (
                            <button key={s.id} onClick={() => mudarStatus(s.id)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: 'transparent', border: 'none', color: s.color, fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >{s.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                  <button
                    onClick={() => { onClose(); router.push(`/leads/${lead.id}`) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: 'var(--accent)', border: 'none', borderRadius: '8px',
                      padding: '6px 12px', color: '#fff', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ExternalLink size={12} /> Ver completo
                  </button>
                  <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              {/* Score + Ganho */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <div style={{ width: '72px', background: 'var(--bg-surface)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Syne, sans-serif', color: lead.score >= 80 ? '#2dd4a0' : '#f5c842' }}>{lead.score}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</div>
                </div>
                {lead.ganho_potencial && (
                  <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: '#2dd4a0' }}>{fmt(lead.ganho_potencial)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ganho potencial</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {conversaId ? (
                  <a
                    href={inboxHref}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(79,122,255,0.12)', border: '1px solid rgba(79,122,255,0.28)',
                      borderRadius: '8px', padding: '7px 12px', color: 'var(--accent)',
                      fontSize: '12px', fontWeight: '600', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    <MessageSquare size={12} /> Abrir conversa
                  </a>
                ) : null}
                <button
                  onClick={() => setShowStartConversation(true)}
                  disabled={!lead.telefone}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: lead.telefone ? 'var(--accent)' : 'var(--bg-hover)', border: '1px solid rgba(79,122,255,0.28)',
                    borderRadius: '8px', padding: '7px 12px', color: lead.telefone ? '#fff' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: '600', cursor: lead.telefone ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  <MessageSquarePlus size={12} /> Iniciar conversa
                </button>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
                      borderRadius: '8px', padding: '7px 12px', color: '#22c55e',
                      fontSize: '12px', fontWeight: '600', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    <Send size={12} /> WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Section title="Dados Pessoais" icon={User}>
                <Row label="CPF" value={lead.cpf} mono />
                <Row label="Telefone" value={lead.telefone} />
                <Row label="Nascimento" value={fmtDate(lead.data_nascimento)} />
                <Row label="Idade" value={calcIdade(lead.data_nascimento)} />
                <Row label="Sexo" value={lead.sexo} />
                <Row label="Categoria" value={lead.categoria_profissional} />
              </Section>
              <Section title="Benefício" icon={FileText}>
                <Row label="NB" value={lead.nb} mono />
                <Row label="Tipo" value={lead.tipo_beneficio} />
                <Row label="DIB" value={fmtDate(lead.dib)} />
                <Row label="DER" value={fmtDate(lead.der)} />
                <Row label="APS" value={lead.aps} />
                <Row label="Isenção IR" value={lead.isencao_ir} />
              </Section>
              <Section title="Pagamento" icon={CreditCard}>
                <Row label="Banco" value={lead.banco} />
                <Row label="Forma" value={lead.forma_pagamento} />
                {lead.bloqueado && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#ff575720', borderRadius: '6px' }}>
                    <AlertCircle size={13} color="#ff5757" /><span style={{ fontSize: '12px', color: '#ff5757' }}>Benefício bloqueado</span>
                  </div>
                )}
              </Section>
              {lead.pensionista && lead.pensionista !== 'SEM PENSIONISTA' && (
                <Section title="Pensionista" icon={Hash}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{lead.pensionista}</div>
                </Section>
              )}
              <Section title={`Anotações (${anotacoes.length})`} icon={MessageSquarePlus}>
                <div style={{ marginBottom: '10px' }}>
                  <textarea value={novaAnotacao} onChange={e => setNovaAnotacao(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) salvarAnotacao() }}
                    placeholder="Adicionar anotação... (Cmd+Enter para salvar)" rows={3}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <button onClick={salvarAnotacao} disabled={!novaAnotacao.trim() || salvando}
                    style={{ marginTop: '6px', padding: '7px 16px', background: novaAnotacao.trim() ? 'var(--accent)' : 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', color: novaAnotacao.trim() ? '#fff' : 'var(--text-muted)', fontSize: '12px', cursor: novaAnotacao.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Syne, sans-serif', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {salvando ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Salvar anotação
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {anotacoes.length === 0
                    ? <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Nenhuma anotação ainda</div>
                    : anotacoes.map(a => (
                      <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', borderLeft: '2px solid var(--accent)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px', lineHeight: '1.5' }}>{a.texto}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                    ))
                  }
                </div>
              </Section>
            </div>
            <IniciarConversaModal
              open={showStartConversation}
              onClose={() => setShowStartConversation(false)}
              leadId={lead.id}
              leadNome={lead.nome}
              telefone={lead.telefone}
              onStarted={(newConversaId) => {
                setConversaId(newConversaId)
                onClose()
              }}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Lead não encontrado</div>
        )}
      </div>
    </>
  )
}
