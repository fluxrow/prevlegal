'use client'
import { useEffect, useState, useRef } from 'react'
import { MessageSquare, User, Bot, UserCheck, RotateCcw, Send } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import OnboardingTooltip from '@/components/onboarding-tooltip'

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
  status: 'agente' | 'humano' | 'encerrado'
  ultima_mensagem: string
  ultima_mensagem_at: string
  nao_lidas: number
  leads: { nome: string; nb: string; status: string } | null
}

interface Mensagem {
  id: string
  mensagem: string
  telefone_remetente: string
  resposta_agente: string | null
  respondido_por_agente: boolean
  respondido_manualmente: boolean
  created_at: string
}

const STATUS_CONVERSA = {
  agente:    { label: 'Agente',    color: '#4f7aff', bg: '#4f7aff20', icon: '🤖' },
  humano:    { label: 'Humano',    color: '#2dd4a0', bg: '#2dd4a020', icon: '👤' },
  encerrado: { label: 'Encerrado', color: '#4a5060', bg: '#4a506020', icon: '✓' },
}

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
  const { active: tourActive, step: tourStep, next: tourNext, finish: tourFinish } = useOnboarding('caixa-de-entrada')
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [portalNaoLidas, setPortalNaoLidas] = useState(0)
  const [textoResposta, setTextoResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'agente' | 'humano'>('todas')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversas()
    fetchPortalNaoLidas()
  }, [])

  useEffect(() => {
    if (conversaSelecionada) fetchMensagens(conversaSelecionada.id)
  }, [conversaSelecionada])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversas()
      if (conversaSelecionada) fetchMensagens(conversaSelecionada.id)
    }, 5000)

    const portalInterval = setInterval(fetchPortalNaoLidas, 15000)
    return () => {
      clearInterval(interval)
      clearInterval(portalInterval)
    }
  }, [conversaSelecionada])

  async function fetchConversas() {
    const res = await fetch('/api/conversas')
    if (res.ok) {
      setConversas(await res.json())
      setLoading(false)
    }
  }

  async function fetchMensagens(conversaId: string) {
    const res = await fetch(`/api/conversas/${conversaId}`)
    if (res.ok) setMensagens(await res.json())
  }

  async function fetchPortalNaoLidas() {
    const res = await fetch('/api/portal/nao-lidas')
    if (res.ok) {
      const data = await res.json()
      setPortalNaoLidas(data.total || 0)
    }
  }

  async function assumirConversa(conversaId: string) {
    await fetch(`/api/conversas/${conversaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'humano' })
    })
    setConversas(prev => prev.map(c => c.id === conversaId ? { ...c, status: 'humano' } : c))
    setConversaSelecionada(prev => prev?.id === conversaId ? { ...prev, status: 'humano' } : prev)
  }

  async function devolverAoAgente(conversaId: string) {
    await fetch(`/api/conversas/${conversaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'agente' })
    })
    setConversas(prev => prev.map(c => c.id === conversaId ? { ...c, status: 'agente' } : c))
    setConversaSelecionada(prev => prev?.id === conversaId ? { ...prev, status: 'agente' } : prev)
  }

  async function enviarResposta() {
    if (!textoResposta.trim() || !conversaSelecionada) return
    setEnviando(true)
    await fetch(`/api/conversas/${conversaSelecionada.id}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: textoResposta })
    })
    setTextoResposta('')
    await fetchMensagens(conversaSelecionada.id)
    setEnviando(false)
  }

  const conversasFiltradas = conversas.filter(c =>
    filtro === 'todas' ? true : c.status === filtro
  )

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '14px', fontFamily: 'DM Sans, sans-serif'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar de conversas */}
      <div style={{ width: '340px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>

        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--accent)" /> Caixa de Entrada
            {portalNaoLidas > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(79,122,255,0.12)', color: 'var(--accent)',
                border: '1px solid rgba(79,122,255,0.25)',
                borderRadius: '100px', padding: '3px 10px',
                fontSize: '12px', fontWeight: '600', marginLeft: '10px',
              }}>
                🔗 {portalNaoLidas} no portal
              </span>
            )}
          </h1>
          <div data-tour="inbox-filtros" style={{ display: 'flex', gap: '4px' }}>
            {(['todas', 'agente', 'humano'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', background: filtro === f ? 'var(--accent)' : 'var(--bg-hover)', color: filtro === f ? '#fff' : 'var(--text-secondary)' }}>
                {f === 'todas' ? 'Todas' : f === 'agente' ? '🤖 Agente' : '👤 Humano'}
              </button>
            ))}
          </div>
        </div>

        <div data-tour="inbox-lista" style={{ flex: 1, overflowY: 'auto' }}>
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
              <div key={conversa.id} onClick={() => setConversaSelecionada(conversa)}
                style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selecionada ? 'var(--bg-hover)' : 'transparent', borderLeft: selecionada ? '3px solid var(--accent)' : '3px solid transparent', transition: 'all 0.1s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
                      {conversa.leads?.nome || conversa.telefone}
                    </span>
                    {conversa.nao_lidas > 0 && (
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '700' }}>{conversa.nao_lidas}</span>
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
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '2px', marginBottom: 0 }}>NB {conversa.leads.nb}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Painel da conversa */}
      {!conversaSelecionada ? (
        <div data-tour="inbox-painel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <MessageSquare size={40} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Selecione uma conversa</p>
        </div>
      ) : (
        <div data-tour="inbox-painel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 2px' }}>
                {conversaSelecionada.leads?.nome || conversaSelecionada.telefone}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                {conversaSelecionada.telefone}
                {conversaSelecionada.leads?.nb && ` • NB ${conversaSelecionada.leads.nb}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: (STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).bg, color: (STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).color, fontWeight: '600' }}>
                {(STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).icon} {(STATUS_CONVERSA[conversaSelecionada.status] || STATUS_CONVERSA.agente).label}
              </span>
              {conversaSelecionada.status !== 'humano' && (
                <button onClick={() => assumirConversa(conversaSelecionada.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2dd4a020', color: '#2dd4a0', border: '1px solid #2dd4a040', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  <UserCheck size={13} /> Assumir conversa
                </button>
              )}
              {conversaSelecionada.status === 'humano' && (
                <button onClick={() => devolverAoAgente(conversaSelecionada.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#4f7aff20', color: '#4f7aff', border: '1px solid #4f7aff40', borderRadius: '8px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  <RotateCcw size={13} /> Devolver ao agente
                </button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mensagens.map(msg => (
              <div key={msg.id}>
                {/* Mensagem do lead */}
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

                {/* Resposta do agente/humano */}
                {msg.resposta_agente && (
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
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5', margin: 0 }}>{msg.resposta_agente}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de resposta — humano */}
          {conversaSelecionada.status === 'humano' && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <textarea
                value={textoResposta}
                onChange={e => setTextoResposta(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarResposta() } }}
                placeholder="Digite sua resposta... (Enter para enviar)"
                rows={1}
                style={{ ...inputStyle, flex: 1, resize: 'none', minHeight: '44px', maxHeight: '120px', lineHeight: '1.5' }}
              />
              <button onClick={enviarResposta} disabled={enviando || !textoResposta.trim()}
                style={{ padding: '10px 16px', background: textoResposta.trim() ? 'var(--accent)' : 'var(--bg-hover)', color: textoResposta.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: textoResposta.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                <Send size={14} /> {enviando ? '...' : 'Enviar'}
              </button>
            </div>
          )}

          {conversaSelecionada.status !== 'humano' && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={14} color="var(--accent)" />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                Agente IA respondendo automaticamente — clique em <strong style={{ color: 'var(--text-secondary)' }}>Assumir conversa</strong> para responder manualmente
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
