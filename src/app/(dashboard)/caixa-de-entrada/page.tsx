'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, User, Bot, UserCheck, RotateCcw, Send } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import OnboardingTooltip from '@/components/onboarding-tooltip'
import { samePhone } from '@/lib/contact-shortcuts'

const TOUR_INBOX = [
  {
    target: '[data-tour="inbox-filtros"]',
    title: 'Filtros de conversa',
    description: 'Filtre entre todas as conversas, as gerenciadas pelo agente IA ou as assumidas por um humano.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="inbox-lista"]',
    title: 'Lista de conversas',
    description: 'Cada card mostra o lead, última mensagem e tempo. Badge azul indica mensagens não lidas.',
    position: 'right' as const,
  },
  {
    target: '[data-tour="inbox-painel"]',
    title: 'Painel da conversa',
    description: 'Selecione uma conversa para ver o histórico completo. Você pode assumir o atendimento a qualquer momento.',
    position: 'left' as const,
  },
]

interface Conversa {
  id: string
  telefone: string
  status: 'agente' | 'humano' | 'aguardando_cliente' | 'resolvido' | 'encerrado'
  ultima_mensagem: string
  ultima_mensagem_at: string
  nao_lidas: number
  assumido_por?: string | null
  assumido_em?: string | null
  leads: { id?: string; nome: string; nb: string; status: string } | null
}

interface Mensagem {
  id: string
  mensagem: string
  telefone_remetente: string
  telefone_destinatario?: string | null
  resposta_agente: string | null
  respondido_por_agente: boolean
  respondido_manualmente: boolean
  created_at: string
}

interface ThreadPortal {
  lead_id: string
  lead_nome: string
  ultima_mensagem: string | null
  ultima_mensagem_em: string | null
  nao_lidas: number
}

interface PortalMensagem {
  id: string
  remetente: string
  mensagem: string
  lida: boolean
  created_at: string
}

const STATUS_CONVERSA = {
  agente: { label: 'Agente', color: '#4f7aff', bg: '#4f7aff20', icon: '🤖' },
  humano: { label: 'Em atendimento', color: '#2dd4a0', bg: '#2dd4a020', icon: '👤' },
  aguardando_cliente: { label: 'Aguardando cliente', color: '#f59e0b', bg: '#f59e0b20', icon: '⏳' },
  resolvido: { label: 'Resolvido', color: '#14b8a6', bg: '#14b8a620', icon: '✅' },
  encerrado: { label: 'Encerrado', color: '#4a5060', bg: '#4a506020', icon: '✓' },
}

const STATUS_HUMANOS = new Set(['humano', 'aguardando_cliente', 'resolvido'])
type AbaInbox = 'todas' | 'agente' | 'humano' | 'aguardando_cliente' | 'resolvido' | 'portal'

function formatTime(dt: string) {
  const d = new Date(dt)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
  if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function CaixaDeEntradaPage() {
  const searchParams = useSearchParams()
  const { active: tourActive, step: tourStep, next: tourNext, finish: tourFinish } = useOnboarding('caixa-de-entrada')
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [abaAtiva, setAbaAtiva] = useState<AbaInbox>('todas')
  const [threadsPortal, setThreadsPortal] = useState<ThreadPortal[]>([])
  const [threadSelecionada, setThreadSelecionada] = useState<ThreadPortal | null>(null)
  const [msgsPortal, setMsgsPortal] = useState<PortalMensagem[]>([])
  const [textoPortal, setTextoPortal] = useState('')
  const [enviandoPortal, setEnviandoPortal] = useState(false)
  const [textoResposta, setTextoResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversas()
    fetchThreadsPortal()
  }, [])

  useEffect(() => {
    if (abaAtiva === 'portal') return

    const conversaId = searchParams.get('conversaId')
    const telefone = searchParams.get('telefone')
    if (!conversaId && !telefone) return

    const encontrada = conversas.find((conversa) => {
      if (conversaId && conversa.id === conversaId) return true
      if (telefone && samePhone(conversa.telefone, telefone)) return true
      return false
    })

    if (encontrada) {
      setAbaAtiva('todas')
      void selecionarConversa(encontrada)
    }
  }, [abaAtiva, conversas, searchParams])

  useEffect(() => {
    if (conversaSelecionada && abaAtiva !== 'portal') fetchMensagens(conversaSelecionada.id)
  }, [conversaSelecionada, abaAtiva])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, msgsPortal])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversas()
      if (conversaSelecionada && abaAtiva !== 'portal') fetchMensagens(conversaSelecionada.id)
    }, 5000)

    const portalIv = setInterval(fetchThreadsPortal, 10000)
    return () => {
      clearInterval(interval)
      clearInterval(portalIv)
    }
  }, [conversaSelecionada, abaAtiva])

  useEffect(() => {
    if (!threadSelecionada) return

    const fetchMsgs = () =>
      fetch(`/api/portal/mensagens/${threadSelecionada.lead_id}`)
        .then(r => r.json())
        .then(d => {
          setMsgsPortal(d.mensagens || [])
          setThreadsPortal(ts => ts.map(t =>
            t.lead_id === threadSelecionada.lead_id ? { ...t, nao_lidas: 0 } : t
          ))
        })

    fetchMsgs()
    const iv = setInterval(fetchMsgs, 5000)
    return () => clearInterval(iv)
  }, [threadSelecionada])

  async function fetchConversas() {
    const res = await fetch('/api/conversas')
    if (res.ok) {
      const data = await res.json()
      setConversas(data)
      setConversaSelecionada((prev) => {
        if (!prev) return prev
        return data.find((conversa: Conversa) => conversa.id === prev.id) || prev
      })
      setLoading(false)
    }
  }

  async function fetchMensagens(conversaId: string) {
    const res = await fetch(`/api/conversas/${conversaId}`)
    if (res.ok) setMensagens(await res.json())
  }

  function aplicarConversaAtualizada(atualizada: Conversa) {
    setConversas((prev) => prev.map((conversa) => (conversa.id === atualizada.id ? { ...conversa, ...atualizada } : conversa)))
    setConversaSelecionada((prev) => (prev?.id === atualizada.id ? { ...prev, ...atualizada } : prev))
  }

  async function atualizarConversa(
    conversaId: string,
    payload: Record<string, unknown>,
    optimistic?: Partial<Conversa>,
  ) {
    if (optimistic) {
      setConversas((prev) => prev.map((conversa) => (conversa.id === conversaId ? { ...conversa, ...optimistic } : conversa)))
      setConversaSelecionada((prev) => (prev?.id === conversaId ? { ...prev, ...optimistic } : prev))
    }

    const res = await fetch(`/api/conversas/${conversaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const atualizada = await res.json()
      aplicarConversaAtualizada(atualizada)
      return atualizada as Conversa
    }

    await fetchConversas()
    return null
  }

  async function selecionarConversa(conversa: Conversa) {
    setConversaSelecionada(conversa)

    if (conversa.nao_lidas > 0) {
      await atualizarConversa(
        conversa.id,
        { action: 'mark_read' },
        { nao_lidas: 0 },
      )
    }
  }

  async function fetchThreadsPortal() {
    const res = await fetch('/api/portal/threads')
    if (res.ok) {
      const data = await res.json()
      setThreadsPortal(data.threads || [])
    }
  }

  async function assumirConversa(conversaId: string) {
    await atualizarConversa(
      conversaId,
      { action: 'assume' },
      { status: 'humano', nao_lidas: 0, assumido_em: new Date().toISOString() },
    )
  }

  async function devolverAoAgente(conversaId: string) {
    await atualizarConversa(
      conversaId,
      { action: 'return_to_agent' },
      { status: 'agente', nao_lidas: 0, assumido_por: null, assumido_em: null },
    )
  }

  async function marcarAguardandoCliente(conversaId: string) {
    await atualizarConversa(
      conversaId,
      { action: 'awaiting_customer' },
      { status: 'aguardando_cliente', assumido_em: conversaSelecionada?.assumido_em || new Date().toISOString() },
    )
  }

  async function marcarResolvido(conversaId: string) {
    await atualizarConversa(
      conversaId,
      { action: 'resolve' },
      { status: 'resolvido', nao_lidas: 0, assumido_em: conversaSelecionada?.assumido_em || new Date().toISOString() },
    )
  }

  async function reabrirConversa(conversaId: string) {
    await atualizarConversa(
      conversaId,
      { action: 'reopen' },
      { status: 'humano', nao_lidas: 0, assumido_em: conversaSelecionada?.assumido_em || new Date().toISOString() },
    )
  }

  async function enviarResposta() {
    if (!textoResposta.trim() || !conversaSelecionada) return
    setEnviando(true)
    setErroEnvio(null)
    const res = await fetch(`/api/conversas/${conversaSelecionada.id}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: textoResposta }),
    })
    if (res.ok) {
      setTextoResposta('')
      await fetchMensagens(conversaSelecionada.id)
    } else {
      const data = await res.json().catch(() => null)
      setErroEnvio(data?.error || 'Nao foi possivel enviar a mensagem')
    }
    setEnviando(false)
  }

  async function enviarMsgPortal() {
    if (!textoPortal.trim() || !threadSelecionada) return
    setEnviandoPortal(true)
    const res = await fetch('/api/portal/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: threadSelecionada.lead_id, mensagem: textoPortal }),
    })
    if (res.ok) {
      const json = await res.json()
      setMsgsPortal(m => [...m, json.mensagem])
      setTextoPortal('')
      setThreadsPortal(ts => ts.map(t =>
        t.lead_id === threadSelecionada.lead_id ? { ...t, nao_lidas: 0 } : t
      ))
    }
    setEnviandoPortal(false)
  }

  const conversasFiltradas = conversas.filter(c =>
    abaAtiva === 'todas' ? true : abaAtiva === 'portal' ? false : c.status === abaAtiva
  )

  const badgePortal = threadsPortal.reduce((a, t) => a + t.nao_lidas, 0)
  const conversaGeridaPorHumano = conversaSelecionada ? STATUS_HUMANOS.has(conversaSelecionada.status) : false
  const podeResponderManual = conversaSelecionada?.status === 'humano'

  function isMensagemOutbound(msg: Mensagem) {
    if (!conversaSelecionada) return false
    return samePhone(msg.telefone_destinatario || '', conversaSelecionada.telefone)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '340px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--accent)" /> Caixa de Entrada
          </h1>
          <div data-tour="inbox-filtros" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', marginBottom: '12px' }}>
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'agente', label: '🤖 Agente' },
              { id: 'humano', label: '👤 Atendimento' },
              { id: 'aguardando_cliente', label: '⏳ Aguardando' },
              { id: 'resolvido', label: '✅ Resolvidas' },
              { id: 'portal', label: '🔗 Portal', badge: badgePortal },
            ].map(aba => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id as AbaInbox)}
                style={{
                  flexShrink: 0,
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: abaAtiva === aba.id ? '600' : '400',
                  color: abaAtiva === aba.id ? '#fff' : 'var(--text-muted)',
                  background: abaAtiva === aba.id ? 'var(--accent)' : 'var(--bg-card)',
                  border: abaAtiva === aba.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {aba.label}
                {aba.badge ? (
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '100px', padding: '1px 5px', fontSize: '9px', fontWeight: '700' }}>
                    {aba.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div data-tour="inbox-lista" style={{ flex: 1, overflowY: 'auto' }}>
          {abaAtiva === 'portal' ? (
            threadsPortal.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <MessageSquare size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Nenhuma mensagem pelo portal ainda</p>
              </div>
            ) : (
              threadsPortal.map(t => (
                <div
                  key={t.lead_id}
                  onClick={() => setThreadSelecionada(t)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: threadSelecionada?.lead_id === t.lead_id ? 'var(--bg-hover)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{t.lead_nome}</span>
                    {t.nao_lidas > 0 && (
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '100px', padding: '1px 6px', fontSize: '10px', fontWeight: '700' }}>
                        {t.nao_lidas}
                      </span>
                    )}
                  </div>
                  {t.ultima_mensagem && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.ultima_mensagem}
                    </p>
                  )}
                  {t.ultima_mensagem_em && (
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                      {new Date(t.ultima_mensagem_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ))
            )
          ) : (
            <>
              {loading && <p style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', textAlign: 'center' }}>Carregando...</p>}
              {!loading && conversasFiltradas.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <MessageSquare size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Nenhuma conversa</p>
                </div>
              )}
              {conversasFiltradas.map(conversa => {
                const st = STATUS_CONVERSA[conversa.status] || STATUS_CONVERSA.agente
                const selecionada = conversaSelecionada?.id === conversa.id
                return (
                  <div
                    key={conversa.id}
                    onClick={() => void selecionarConversa(conversa)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selecionada ? 'var(--bg-hover)' : 'transparent',
                      borderLeft: selecionada ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
                          {conversa.leads?.nome || conversa.telefone}
                        </span>
                        {conversa.nao_lidas > 0 && (
                          <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '700' }}>
                            {conversa.nao_lidas}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                        {conversa.ultima_mensagem_at ? formatTime(conversa.ultima_mensagem_at) : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px', margin: 0 }}>
                        {conversa.ultima_mensagem || '—'}
                      </p>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: st.bg, color: st.color, fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    {conversa.leads?.nb && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '2px', marginBottom: 0 }}>
                        NB {conversa.leads.nb}
                      </p>
                    )}
                    {STATUS_HUMANOS.has(conversa.status) && conversa.assumido_em && (
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '4px', marginBottom: 0 }}>
                        Em fila humana desde {formatTime(conversa.assumido_em)}
                      </p>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {abaAtiva === 'portal' ? (
        <div data-tour="inbox-painel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!threadSelecionada ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Selecione uma conversa do portal
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{threadSelecionada.lead_nome}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Portal do cliente · link privado</div>
                </div>
                <a href={`/leads/${threadSelecionada.lead_id}`} style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>
                  Ver lead →
                </a>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {msgsPortal.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.remetente === 'escritorio' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '75%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: m.remetente === 'escritorio' ? 'rgba(79,122,255,0.15)' : 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: m.remetente === 'escritorio' ? 'var(--accent)' : 'var(--green)', marginBottom: '3px', textTransform: 'uppercase' }}>
                        {m.remetente === 'escritorio' ? 'Você' : 'Cliente'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{m.mensagem}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                <input
                  value={textoPortal}
                  onChange={e => setTextoPortal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMsgPortal()}
                  placeholder="Responder pelo portal..."
                  style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                />
                <button
                  onClick={enviarMsgPortal}
                  disabled={enviandoPortal || !textoPortal.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: textoPortal.trim() ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', borderRadius: '9px', padding: '9px 14px', color: textoPortal.trim() ? '#fff' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
                >
                  {enviandoPortal ? '...' : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : !conversaSelecionada ? (
        <div data-tour="inbox-painel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <MessageSquare size={40} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Selecione uma conversa</p>
        </div>
      ) : (
        <div data-tour="inbox-painel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 2px' }}>
                {conversaSelecionada.leads?.nome || conversaSelecionada.telefone}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                {conversaSelecionada.telefone}
                {conversaSelecionada.leads?.nb && ` • NB ${conversaSelecionada.leads.nb}`}
              </p>
              {conversaGeridaPorHumano && conversaSelecionada.assumido_em ? (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: '4px 0 0' }}>
                  Fila humana ativa desde {new Date(conversaSelecionada.assumido_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: (STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).bg, color: (STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).color, fontWeight: '600' }}>
                {(STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).icon} {(STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).label}
              </span>
              {conversaSelecionada.status === 'agente' && (
                <button onClick={() => assumirConversa(conversaSelecionada.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2dd4a020', color: '#2dd4a0', border: '1px solid #2dd4a040', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  <UserCheck size={13} /> Assumir conversa
                </button>
              )}
              {conversaSelecionada.status === 'humano' && (
                <>
                  <button onClick={() => marcarAguardandoCliente(conversaSelecionada.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    ⏳ Aguardar cliente
                  </button>
                  <button onClick={() => marcarResolvido(conversaSelecionada.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#14b8a620', color: '#14b8a6', border: '1px solid #14b8a640', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    ✅ Resolver
                  </button>
                </>
              )}
              {conversaSelecionada.status === 'aguardando_cliente' && (
                <>
                  <button onClick={() => reabrirConversa(conversaSelecionada.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2dd4a020', color: '#2dd4a0', border: '1px solid #2dd4a040', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    <UserCheck size={13} /> Retomar atendimento
                  </button>
                  <button onClick={() => marcarResolvido(conversaSelecionada.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#14b8a620', color: '#14b8a6', border: '1px solid #14b8a640', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                    ✅ Resolver
                  </button>
                </>
              )}
              {conversaSelecionada.status === 'resolvido' && (
                <button onClick={() => reabrirConversa(conversaSelecionada.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2dd4a020', color: '#2dd4a0', border: '1px solid #2dd4a040', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  <UserCheck size={13} /> Reabrir conversa
                </button>
              )}
              {conversaGeridaPorHumano && (
                <button onClick={() => devolverAoAgente(conversaSelecionada.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#4f7aff20', color: '#4f7aff', border: '1px solid #4f7aff40', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  <RotateCcw size={13} /> Devolver ao agente
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {conversaSelecionada.status === 'aguardando_cliente' && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f59e0b12', border: '1px solid #f59e0b35', color: '#f5d48b', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                Esta conversa está aguardando retorno do cliente. Se ele responder, ela volta automaticamente para <strong>Em atendimento</strong>.
              </div>
            )}
            {conversaSelecionada.status === 'resolvido' && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#14b8a612', border: '1px solid #14b8a635', color: '#8de7db', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                Esta conversa foi marcada como resolvida. Se o cliente responder, a thread reaparece como <strong>Em atendimento</strong>.
              </div>
            )}
            {mensagens.map(msg => (
              <div key={msg.id}>
                {!isMensagemOutbound(msg) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: msg.resposta_agente ? '6px' : '0' }}>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={11} color="var(--text-muted)" />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{formatTime(msg.created_at)}</span>
                      </div>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5', margin: 0 }}>{msg.mensagem}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(msg.resposta_agente || isMensagemOutbound(msg)) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                          {msg.respondido_manualmente ? '👤 Humano' : '🤖 Agente'}
                        </span>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: msg.respondido_manualmente ? '#2dd4a020' : '#4f7aff20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {msg.respondido_manualmente ? <User size={11} color="#2dd4a0" /> : <Bot size={11} color="#4f7aff" />}
                        </div>
                      </div>
                      <div style={{ background: msg.respondido_manualmente ? '#2dd4a015' : '#4f7aff15', border: `1px solid ${msg.respondido_manualmente ? '#2dd4a030' : '#4f7aff30'}`, borderRadius: '12px 12px 4px 12px', padding: '10px 14px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5', margin: 0 }}>{msg.resposta_agente || msg.mensagem}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {podeResponderManual && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <textarea
                    value={textoResposta}
                    onChange={e => setTextoResposta(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarResposta() } }}
                    placeholder="Digite sua resposta... (Enter para enviar)"
                    rows={1}
                    style={{ ...inputStyle, flex: 1, resize: 'none', minHeight: '44px', maxHeight: '120px', lineHeight: '1.5' }}
                  />
                  <button
                    onClick={enviarResposta}
                    disabled={enviando || !textoResposta.trim()}
                    style={{ padding: '10px 16px', background: textoResposta.trim() ? 'var(--accent)' : 'var(--bg-hover)', color: textoResposta.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: textoResposta.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
                  >
                    <Send size={14} /> {enviando ? '...' : 'Enviar'}
                  </button>
                </div>
                {erroEnvio ? (
                  <p style={{ margin: 0, color: '#ff6b6b', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                    {erroEnvio}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {!podeResponderManual && conversaSelecionada.status === 'agente' && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={14} color="var(--accent)" />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                Agente IA respondendo automaticamente — clique em <strong style={{ color: 'var(--text-secondary)' }}>Assumir conversa</strong> para responder manualmente
              </p>
            </div>
          )}
          {!podeResponderManual && conversaSelecionada.status === 'aguardando_cliente' && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={14} color="#f59e0b" />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                A thread está em espera. Clique em <strong style={{ color: 'var(--text-secondary)' }}>Retomar atendimento</strong> para voltar a responder manualmente.
              </p>
            </div>
          )}
          {!podeResponderManual && conversaSelecionada.status === 'resolvido' && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={14} color="#14b8a6" />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                A conversa está concluída. Use <strong style={{ color: 'var(--text-secondary)' }}>Reabrir conversa</strong> se precisar voltar ao atendimento.
              </p>
            </div>
          )}
        </div>
      )}

      {tourActive && tourStep < TOUR_INBOX.length && (
        <OnboardingTooltip
          key={tourStep}
          targetSelector={TOUR_INBOX[tourStep].target}
          title={TOUR_INBOX[tourStep].title}
          description={TOUR_INBOX[tourStep].description}
          position={TOUR_INBOX[tourStep].position}
          step={tourStep}
          totalSteps={TOUR_INBOX.length}
          onNext={tourNext}
          onSkip={tourFinish}
          isLast={tourStep === TOUR_INBOX.length - 1}
        />
      )}
    </div>
  )
}
