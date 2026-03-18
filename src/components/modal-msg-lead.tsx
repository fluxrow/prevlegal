'use client'

import { useEffect, useState } from 'react'
import { X, MessageSquare, Link2, Send } from 'lucide-react'

interface Props {
  lead: { id: string; nome: string; telefone: string }
  onClose: () => void
}

interface MsgWpp {
  id: string
  mensagem: string
  telefone_remetente: string
  resposta_agente: string | null
  respondido_por_agente: boolean
  respondido_manualmente: boolean
  created_at: string
}

interface MsgPortal {
  id: string
  remetente: string
  mensagem: string
  lida: boolean
  created_at: string
}

interface Conversa {
  id: string
  telefone: string
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function samePhone(a: string, b: string) {
  const aa = normalizePhone(a)
  const bb = normalizePhone(b)

  if (!aa || !bb) return false

  return (
    aa === bb ||
    aa === `55${bb}` ||
    bb === `55${aa}` ||
    aa.endsWith(bb) ||
    bb.endsWith(aa)
  )
}

export default function ModalMsgLead({ lead, onClose }: Props) {
  const [aba, setAba] = useState<'whatsapp' | 'portal'>('whatsapp')
  const [msgsWpp, setMsgsWpp] = useState<MsgWpp[]>([])
  const [msgsPortal, setMsgsPortal] = useState<MsgPortal[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregarWhatsApp() {
      if (!lead.telefone) {
        if (ativo) {
          setConversaId(null)
          setMsgsWpp([])
        }
        return
      }

      const conversasRes = await fetch('/api/conversas')
      if (!conversasRes.ok) return

      const conversas = await conversasRes.json() as Conversa[]
      if (!ativo) return

      const conversa = (conversas || []).find(c => samePhone(c.telefone || '', lead.telefone))
      if (!conversa) {
        setConversaId(null)
        setMsgsWpp([])
        return
      }

      setConversaId(conversa.id)

      const mensagensRes = await fetch(`/api/conversas/${conversa.id}`)
      if (!mensagensRes.ok) return

      const mensagens = await mensagensRes.json()
      if (ativo) setMsgsWpp(mensagens || [])
    }

    function carregarPortal() {
      fetch(`/api/portal/mensagens/${lead.id}`)
        .then(r => r.json())
        .then(d => {
          if (ativo) setMsgsPortal(d.mensagens || [])
        })
    }

    carregarWhatsApp()
    carregarPortal()

    const iv = setInterval(() => {
      carregarPortal()
    }, 5000)

    return () => {
      ativo = false
      clearInterval(iv)
    }
  }, [lead.id, lead.telefone])

  async function enviarPortal() {
    if (!texto.trim()) return
    setEnviando(true)
    const res = await fetch('/api/portal/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, mensagem: texto }),
    })
    if (res.ok) {
      const json = await res.json()
      setMsgsPortal(m => [...m, json.mensagem])
      setTexto('')
    }
    setEnviando(false)
  }

  const naoLidasPortal = msgsPortal.filter(m => m.remetente === 'cliente' && !m.lida).length

  const inp: React.CSSProperties = {
    flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '9px', padding: '9px 12px', color: 'var(--text-primary)',
    fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none',
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 200, backdropFilter: 'blur(4px)',
      }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '520px', maxWidth: 'calc(100vw - 24px)', maxHeight: '80vh',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', zIndex: 201,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={16} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                {lead.nome}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.telefone || 'Telefone não informado'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: '4px',
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'whatsapp', label: '💬 WhatsApp' },
            { id: 'portal', label: '🔗 Portal', badge: naoLidasPortal },
          ].map(a => (
            <button key={a.id} onClick={() => setAba(a.id as 'whatsapp' | 'portal')} style={{
              flex: 1, padding: '10px', fontSize: '13px',
              fontWeight: aba === a.id ? '600' : '400',
              color: aba === a.id ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none', border: 'none',
              borderBottom: aba === a.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              marginBottom: '-1px', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              {a.label}
              {a.badge ? (
                <span style={{
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: '100px', padding: '1px 6px',
                  fontSize: '10px', fontWeight: '700',
                }}>
                  {a.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '300px', maxHeight: '400px' }}>
          {aba === 'whatsapp' && (
            msgsWpp.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>
                  Nenhuma conversa WhatsApp encontrada para este lead.
                </div>
              : msgsWpp.map(m => {
                  const isResposta = m.respondido_por_agente || m.respondido_manualmente
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isResposta ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%', background: isResposta ? 'rgba(79,122,255,0.15)' : 'var(--bg-card)',
                        border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px',
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: '700', color: isResposta ? 'var(--accent)' : 'var(--green)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {isResposta ? (m.respondido_por_agente ? 'Agente IA' : 'Você') : 'Lead'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {isResposta ? (m.resposta_agente || m.mensagem) : m.mensagem}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                          {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
          )}

          {aba === 'portal' && (
            msgsPortal.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>
                  Nenhuma mensagem no portal ainda. Envie uma mensagem para o cliente.
                </div>
              : msgsPortal.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.remetente === 'escritorio' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', background: m.remetente === 'escritorio' ? 'rgba(79,122,255,0.15)' : 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px',
                    }}>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: m.remetente === 'escritorio' ? 'var(--accent)' : 'var(--green)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {m.remetente === 'escritorio' ? 'Você' : 'Cliente'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{m.mensagem}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
          )}
        </div>

        {aba === 'portal' && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarPortal()}
              placeholder="Mensagem pelo portal..."
              style={inp}
            />
            <button
              onClick={enviarPortal}
              disabled={enviando || !texto.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: texto.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                border: 'none', borderRadius: '9px', padding: '9px 14px',
                color: texto.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
              }}
            >
              <Send size={12} /> {enviando ? '...' : 'Enviar'}
            </button>
          </div>
        )}

        {aba === 'whatsapp' && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Link2 size={11} />
              Para responder no WhatsApp, use a Caixa de Entrada
            </div>
          </div>
        )}
      </div>
    </>
  )
}
