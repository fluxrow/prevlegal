'use client'
import { useState, useEffect } from 'react'
import { Link2, Copy, Check, Eye, EyeOff, Send, Share2 } from 'lucide-react'

interface Props { leadId: string }

interface Documento {
  id: string; nome: string; tipo: string; compartilhado_cliente: boolean
}
interface Mensagem {
  id: string; remetente: string; mensagem: string; lida: boolean; created_at: string
}

export default function PortalLead({ leadId }: Props) {
  const [urlPortal, setUrlPortal] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    let cleanupRealtime: (() => void) | undefined

    Promise.all([
      fetch(`/api/portal/link/${leadId}`).then(r => r.json()),
      fetch(`/api/leads/${leadId}/documentos`).then(r => r.json()),
    ]).then(([linkData, docsData]) => {
      if (!ativo) return
      if (linkData.url) setUrlPortal(linkData.url)
      if (Array.isArray(docsData)) setDocumentos(docsData)
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
    </div>
  )
}
