'use client'
import { useState, useEffect } from 'react'
import { Link2, Copy, Check, Eye, EyeOff, Send, Share2, Plus, Trash2, Clock3, ListTodo } from 'lucide-react'

interface Props { leadId: string }

interface Documento {
  id: string; nome: string; tipo: string; compartilhado_cliente: boolean
}
interface Mensagem {
  id: string; remetente: string; mensagem: string; lida: boolean; created_at: string
}
interface PortalDocumentRequest {
  id: string
  titulo: string
  descricao?: string | null
  status: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado'
  created_at: string
  updated_at: string
}
interface PortalTimelineEvent {
  id: string
  tipo: string
  titulo: string
  descricao?: string | null
  visivel_cliente: boolean
  created_at: string
  updated_at: string
}

export default function PortalLead({ leadId }: Props) {
  const [urlPortal, setUrlPortal] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [portalRequests, setPortalRequests] = useState<PortalDocumentRequest[]>([])
  const [timelineEvents, setTimelineEvents] = useState<PortalTimelineEvent[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [novaPendencia, setNovaPendencia] = useState({ titulo: '', descricao: '' })
  const [novoEvento, setNovoEvento] = useState({ titulo: '', descricao: '', visivel_cliente: true })
  const [enviando, setEnviando] = useState(false)
  const [salvandoPendencia, setSalvandoPendencia] = useState(false)
  const [salvandoEvento, setSalvandoEvento] = useState(false)
  const [loading, setLoading] = useState(true)
  const [foundationPending, setFoundationPending] = useState({ requests: false, timeline: false })
  const [erroPortalOps, setErroPortalOps] = useState('')

  useEffect(() => {
    let ativo = true
    let cleanupRealtime: (() => void) | undefined

    Promise.all([
      fetch(`/api/portal/link/${leadId}`).then(r => r.json()),
      fetch(`/api/leads/${leadId}/documentos`).then(r => r.json()),
      fetch(`/api/leads/${leadId}/portal-document-requests`).then(r => r.json()),
      fetch(`/api/leads/${leadId}/portal-timeline-events`).then(r => r.json()),
    ]).then(([linkData, docsData, requestsData, timelineData]) => {
      if (!ativo) return
      if (linkData.url) setUrlPortal(linkData.url)
      if (Array.isArray(docsData)) setDocumentos(docsData)
      if (Array.isArray(requestsData?.requests)) setPortalRequests(requestsData.requests)
      if (Array.isArray(timelineData?.events)) setTimelineEvents(timelineData.events)
      setFoundationPending({
        requests: Boolean(requestsData?.foundationPending),
        timeline: Boolean(timelineData?.foundationPending),
      })
      setLoading(false)
    })

    function buscarMensagens() {
      fetch(`/api/portal/mensagens/${leadId}`)
        .then(r => r.json())
        .then(d => {
          if (!ativo) return
          if (d.mensagens) setMensagens(d.mensagens)
        })
    }

    buscarMensagens()
    const interval = setInterval(buscarMensagens, 5000)

    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const channel = supabase
        .channel(`portal-mensagens-${leadId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_mensagens',
          filter: `lead_id=eq.${leadId}`,
        }, (payload) => {
          if (!ativo) return
          setMensagens(m => {
            const novaMensagem = payload.new as Mensagem
            if (m.some(msg => msg.id === novaMensagem.id)) return m
            return [...m, novaMensagem]
          })
        })
        .subscribe()

      if (!ativo) {
        supabase.removeChannel(channel)
        return
      }

      cleanupRealtime = () => {
        supabase.removeChannel(channel)
      }
    })()

    return () => {
      ativo = false
      clearInterval(interval)
      cleanupRealtime?.()
    }
  }, [leadId])

  async function copiarLink() {
    await navigator.clipboard.writeText(urlPortal)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function toggleCompartilhar(docId: string, atual: boolean) {
    const res = await fetch('/api/portal/compartilhar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento_id: docId, compartilhar: !atual }),
    })
    if (res.ok) {
      setDocumentos(d => d.map(x => x.id === docId ? { ...x, compartilhado_cliente: !atual } : x))
    }
  }

  async function enviarMensagem() {
    if (!novaMensagem.trim()) return
    setEnviando(true)
    const res = await fetch('/api/portal/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, mensagem: novaMensagem }),
    })
    if (res.ok) {
      const json = await res.json()
      setMensagens(m => [...m, json.mensagem])
      setNovaMensagem('')
    }
    setEnviando(false)
  }

  async function criarPendencia() {
    if (!novaPendencia.titulo.trim()) return
    setErroPortalOps('')
    setSalvandoPendencia(true)
    const res = await fetch(`/api/leads/${leadId}/portal-document-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaPendencia),
    })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.request) {
      setPortalRequests((current) => [json.request, ...current])
      setNovaPendencia({ titulo: '', descricao: '' })
      setFoundationPending((current) => ({ ...current, requests: false }))
    } else {
      setErroPortalOps(json?.error || 'Não foi possível criar a pendência do portal.')
    }
    setSalvandoPendencia(false)
  }

  async function atualizarStatusPendencia(id: string, status: PortalDocumentRequest['status']) {
    setErroPortalOps('')
    const res = await fetch(`/api/leads/${leadId}/portal-document-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.request) {
      setPortalRequests((current) => current.map((item) => (item.id === id ? json.request : item)))
    } else {
      setErroPortalOps(json?.error || 'Não foi possível atualizar a pendência.')
    }
  }

  async function excluirPendencia(id: string) {
    setErroPortalOps('')
    const res = await fetch(`/api/leads/${leadId}/portal-document-requests/${id}`, {
      method: 'DELETE',
    })
    const json = await res.json().catch(() => null)
    if (res.ok) {
      setPortalRequests((current) => current.filter((item) => item.id !== id))
    } else {
      setErroPortalOps(json?.error || 'Não foi possível excluir a pendência.')
    }
  }

  async function criarEvento() {
    if (!novoEvento.titulo.trim()) return
    setErroPortalOps('')
    setSalvandoEvento(true)
    const res = await fetch(`/api/leads/${leadId}/portal-timeline-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoEvento),
    })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.event) {
      setTimelineEvents((current) => [json.event, ...current])
      setNovoEvento({ titulo: '', descricao: '', visivel_cliente: true })
      setFoundationPending((current) => ({ ...current, timeline: false }))
    } else {
      setErroPortalOps(json?.error || 'Não foi possível criar o evento da timeline.')
    }
    setSalvandoEvento(false)
  }

  async function toggleEventoCliente(id: string, visivelCliente: boolean) {
    setErroPortalOps('')
    const res = await fetch(`/api/leads/${leadId}/portal-timeline-events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visivel_cliente: !visivelCliente }),
    })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.event) {
      setTimelineEvents((current) => current.map((item) => (item.id === id ? json.event : item)))
    } else {
      setErroPortalOps(json?.error || 'Não foi possível atualizar o evento.')
    }
  }

  async function excluirEvento(id: string) {
    setErroPortalOps('')
    const res = await fetch(`/api/leads/${leadId}/portal-timeline-events/${id}`, {
      method: 'DELETE',
    })
    const json = await res.json().catch(() => null)
    if (res.ok) {
      setTimelineEvents((current) => current.filter((item) => item.id !== id))
    } else {
      setErroPortalOps(json?.error || 'Não foi possível excluir o evento.')
    }
  }

  const inp: React.CSSProperties = {
    flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px',
    padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '20px' }}>
        <Share2 size={16} color="var(--accent)" />
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>Portal do Cliente</h3>
      </div>

      {/* Link do portal */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Link de acesso do cliente</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Link2 size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loading ? 'Carregando...' : urlPortal}
            </p>
          </div>
          <button onClick={copiarLink} disabled={!urlPortal}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', border: 'none', borderRadius: '9px', padding: '9px 14px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans' }}>
            {copiado ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Envie este link para o cliente acompanhar o processo. Não requer cadastro ou senha.</p>
      </div>

      {/* Documentos compartilhados */}
      {documentos.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Documentos visíveis no portal</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {documentos.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 12px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</p>
                <button onClick={() => toggleCompartilhar(d.id, d.compartilhado_cliente)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: d.compartilhado_cliente ? 'rgba(45,212,160,0.1)' : 'var(--bg-hover)', border: `1px solid ${d.compartilhado_cliente ? 'rgba(45,212,160,0.3)' : 'var(--border)'}`, borderRadius: '7px', padding: '5px 10px', color: d.compartilhado_cliente ? '#2dd4a0' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans', flexShrink: 0 }}>
                  {d.compartilhado_cliente ? <><Eye size={11} /> Visível</> : <><EyeOff size={11} /> Oculto</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens do portal */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Mensagens do portal{mensagens.filter(m => m.remetente === 'cliente' && !m.lida).length > 0
            ? ` · ${mensagens.filter(m => m.remetente === 'cliente' && !m.lida).length} não lida(s)`
            : ''}
        </p>
        {mensagens.length > 0 && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mensagens.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.remetente === 'escritorio' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', background: m.remetente === 'escritorio' ? 'rgba(79,122,255,0.15)' : 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: m.remetente === 'escritorio' ? 'var(--accent)' : '#2dd4a0', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {m.remetente === 'escritorio' ? 'Escritório' : 'Cliente'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{m.mensagem}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
            placeholder="Responder cliente pelo portal..."
            style={inp} />
          <button onClick={enviarMensagem} disabled={enviando || !novaMensagem.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: novaMensagem.trim() ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', borderRadius: '9px', padding: '9px 14px', color: novaMensagem.trim() ? '#fff' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans', flexShrink: 0 }}>
            <Send size={12} /> {enviando ? '...' : 'Enviar'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Pendências do cliente no portal
        </p>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
            <input
              value={novaPendencia.titulo}
              onChange={(e) => setNovaPendencia((current) => ({ ...current, titulo: e.target.value }))}
              placeholder="Ex: Enviar CNIS atualizado"
              style={inp}
            />
            <input
              value={novaPendencia.descricao}
              onChange={(e) => setNovaPendencia((current) => ({ ...current, descricao: e.target.value }))}
              placeholder="Descrição opcional para o cliente"
              style={inp}
            />
          </div>
          <button
            onClick={criarPendencia}
            disabled={salvandoPendencia || !novaPendencia.titulo.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: novaPendencia.titulo.trim() ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', borderRadius: '9px', padding: '9px 14px', color: novaPendencia.titulo.trim() ? '#fff' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans' }}
          >
            <Plus size={12} /> {salvandoPendencia ? 'Salvando...' : 'Nova pendência'}
          </button>
        </div>

        {foundationPending.requests ? (
          <p style={{ fontSize: '11px', color: '#f5c842', margin: '0 0 10px' }}>
            A foundation do portal mobile ainda precisa ser aplicada no banco para salvar pendências reais.
          </p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
          {portalRequests.map((request) => (
            <div key={request.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ListTodo size={14} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>{request.titulo}</p>
                  {request.descricao ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px' }}>{request.descricao}</p> : null}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={request.status}
                      onChange={(e) => atualizarStatusPendencia(request.id, e.target.value as PortalDocumentRequest['status'])}
                      style={{ ...inp, width: 'auto', minWidth: '140px', padding: '7px 10px' }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="enviado">Enviado</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="rejeitado">Rejeitado</option>
                    </select>
                    <button
                      onClick={() => excluirPendencia(request.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '8px', padding: '7px 10px', color: '#ff5757', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans' }}
                    >
                      <Trash2 size={11} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {portalRequests.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Nenhuma pendência configurada ainda.
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Timeline do cliente
        </p>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
            <input
              value={novoEvento.titulo}
              onChange={(e) => setNovoEvento((current) => ({ ...current, titulo: e.target.value }))}
              placeholder="Ex: Caso enviado para análise do escritório"
              style={inp}
            />
            <input
              value={novoEvento.descricao}
              onChange={(e) => setNovoEvento((current) => ({ ...current, descricao: e.target.value }))}
              placeholder="Descrição opcional do andamento"
              style={inp}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={novoEvento.visivel_cliente}
              onChange={(e) => setNovoEvento((current) => ({ ...current, visivel_cliente: e.target.checked }))}
            />
            Visível para o cliente no portal
          </label>
          <button
            onClick={criarEvento}
            disabled={salvandoEvento || !novoEvento.titulo.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: novoEvento.titulo.trim() ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', borderRadius: '9px', padding: '9px 14px', color: novoEvento.titulo.trim() ? '#fff' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans' }}
          >
            <Plus size={12} /> {salvandoEvento ? 'Salvando...' : 'Novo evento'}
          </button>
        </div>

        {foundationPending.timeline ? (
          <p style={{ fontSize: '11px', color: '#f5c842', margin: '0 0 10px' }}>
            A foundation do portal mobile ainda precisa ser aplicada no banco para salvar eventos reais da timeline.
          </p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {timelineEvents.map((event) => (
            <div key={event.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Clock3 size={14} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>{event.titulo}</p>
                  {event.descricao ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px' }}>{event.descricao}</p> : null}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleEventoCliente(event.id, event.visivel_cliente)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: event.visivel_cliente ? 'rgba(45,212,160,0.1)' : 'var(--bg-hover)', border: `1px solid ${event.visivel_cliente ? 'rgba(45,212,160,0.3)' : 'var(--border)'}`, borderRadius: '8px', padding: '7px 10px', color: event.visivel_cliente ? '#2dd4a0' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans' }}
                    >
                      {event.visivel_cliente ? <><Eye size={11} /> Visível</> : <><EyeOff size={11} /> Oculto</>}
                    </button>
                    <button
                      onClick={() => excluirEvento(event.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '8px', padding: '7px 10px', color: '#ff5757', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans' }}
                    >
                      <Trash2 size={11} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {timelineEvents.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Nenhum evento manual da timeline ainda.
            </p>
          ) : null}
        </div>
      </div>

      {erroPortalOps ? (
        <div style={{ marginTop: '16px', background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)', color: '#ff8b8b', borderRadius: '10px', padding: '10px 12px', fontSize: '12px' }}>
          {erroPortalOps}
        </div>
      ) : null}
    </div>
  )
}
