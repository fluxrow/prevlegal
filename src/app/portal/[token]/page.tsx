'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { FileText, MessageSquare, Send, CheckCircle, Clock, XCircle, ExternalLink, Loader2 } from 'lucide-react'

const STATUS_INFO: Record<string, { label: string; cor: string; icon: React.ReactNode; descricao: string }> = {
  new:       { label: 'Em análise',     cor: '#4f7aff', icon: <Clock size={16} />,         descricao: 'Seu caso está sendo analisado pelo escritório' },
  contacted: { label: 'Em contato',     cor: '#f5c842', icon: <MessageSquare size={16} />, descricao: 'O escritório já entrou em contato com você' },
  awaiting:  { label: 'Aguardando',     cor: '#ff8c42', icon: <Clock size={16} />,         descricao: 'Aguardando documentos ou retorno seu' },
  scheduled: { label: 'Agendado',       cor: '#a78bfa', icon: <CheckCircle size={16} />,   descricao: 'Você tem uma consulta agendada' },
  converted: { label: 'Contratado',     cor: '#2dd4a0', icon: <CheckCircle size={16} />,   descricao: 'Processo iniciado — acompanhe as novidades aqui' },
  lost:      { label: 'Encerrado',      cor: '#6b7280', icon: <XCircle size={16} />,       descricao: 'Atendimento encerrado' },
}

const TIPO_DOC: Record<string, string> = {
  cnis: '📋 CNIS', procuracao: '📄 Procuração', identidade: '🪪 Identidade',
  laudo: '🏥 Laudo', peticao: '⚖️ Petição', outro: '📎 Documento',
  peticao_inicial: '⚖️ Petição Inicial', requerimento_inss: '📄 Requerimento INSS',
}

interface Lead { id: string; nome: string; status: string; created_at: string }
interface Documento { id: string; nome: string; tipo: string; arquivo_url?: string; tipo_documento?: string; created_at: string }
interface Mensagem { id: string; remetente: string; mensagem: string; lida: boolean; created_at: string }

export default function PortalClientePage() {
  const { token } = useParams() as { token: string }
  const [lead, setLead] = useState<Lead | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aba, setAba] = useState<'status' | 'documentos' | 'mensagens'>('status')
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchPortal() }, [token])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

  async function fetchPortal() {
    setLoading(true)
    const res = await fetch(`/api/portal/${token}`)
    if (!res.ok) { setErro('Portal não encontrado ou link inválido.'); setLoading(false); return }
    const json = await res.json()
    setLead(json.lead)
    setDocumentos(json.documentos)
    setMensagens(json.mensagens)
    setLoading(false)
  }

  async function enviarMensagem() {
    if (!novaMensagem.trim()) return
    setEnviando(true)
    const res = await fetch(`/api/portal/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: novaMensagem }),
    })
    if (res.ok) {
      const json = await res.json()
      setMensagens(m => [...m, json.mensagem])
      setNovaMensagem('')
    }
    setEnviando(false)
  }

  const statusInfo = lead ? (STATUS_INFO[lead.status] || STATUS_INFO.new) : null
  const msgNaoLidas = mensagens.filter(m => m.remetente === 'escritorio' && !m.lida).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} color="#4f7aff" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (erro || !lead) return (
    <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'DM Sans, sans-serif' }}>
      <XCircle size={48} color="#ff5757" />
      <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '20px', margin: 0 }}>Link inválido</h2>
      <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', maxWidth: '320px' }}>{erro || 'Este portal não foi encontrado ou o link expirou.'}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', fontFamily: 'DM Sans, sans-serif', color: '#f0f2f5' }}>

      {/* Header */}
      <div style={{ background: '#111318', borderBottom: '1px solid #ffffff0f', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #4f7aff, #7c3aed)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚖️</div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#f0f2f5', margin: 0, fontFamily: 'Syne, sans-serif' }}>Alexandrini Advogados</p>
            <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>Portal do Cliente</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f2f5', margin: 0 }}>{lead.nome}</p>
          <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>Desde {new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Status card */}
        <div style={{ background: `${statusInfo!.cor}10`, border: `1px solid ${statusInfo!.cor}30`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ color: statusInfo!.cor }}>{statusInfo!.icon}</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: statusInfo!.cor, fontFamily: 'Syne, sans-serif' }}>{statusInfo!.label}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>{statusInfo!.descricao}</p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: '#111318', border: '1px solid #ffffff0f', borderRadius: '10px', padding: '4px' }}>
          {([
            { key: 'status', label: 'Acompanhamento' },
            { key: 'documentos', label: `Documentos${documentos.length > 0 ? ` (${documentos.length})` : ''}` },
            { key: 'mensagens', label: `Mensagens${msgNaoLidas > 0 ? ` (${msgNaoLidas})` : ''}` },
          ] as const).map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans', transition: 'all 0.15s', background: aba === a.key ? '#1c2028' : 'transparent', color: aba === a.key ? '#f0f2f5' : '#4a5060' }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Aba: Acompanhamento */}
        {aba === 'status' && (
          <div>
            <div style={{ background: '#111318', border: '1px solid #ffffff0f', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#4a5060', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Linha do tempo</p>
              {[
                { status: 'new', label: 'Caso recebido', done: true },
                { status: 'contacted', label: 'Primeiro contato', done: ['contacted','awaiting','scheduled','converted'].includes(lead.status) },
                { status: 'awaiting', label: 'Documentação', done: ['awaiting','scheduled','converted'].includes(lead.status) },
                { status: 'scheduled', label: 'Consulta agendada', done: ['scheduled','converted'].includes(lead.status) },
                { status: 'converted', label: 'Processo iniciado', done: lead.status === 'converted' },
              ].map((step, i) => (
                <div key={step.status} style={{ display: 'flex', gap: '12px', marginBottom: i < 4 ? '12px' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: step.done ? '#4f7aff' : '#1c2028', border: `2px solid ${step.done ? '#4f7aff' : '#ffffff0f'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {step.done && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    {i < 4 && <div style={{ width: '2px', flex: 1, minHeight: '20px', background: step.done ? '#4f7aff40' : '#ffffff0f', margin: '3px 0' }} />}
                  </div>
                  <p style={{ fontSize: '13px', color: step.done ? '#f0f2f5' : '#4a5060', margin: '2px 0 0', fontWeight: step.done ? '600' : '400' }}>{step.label}</p>
                </div>
              ))}
            </div>
            <div style={{ background: '#111318', border: '1px solid #ffffff0f', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>💬</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f2f5', margin: '0 0 3px' }}>Dúvidas? Fale conosco</p>
                <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>Use a aba Mensagens para falar diretamente com a Dra. Jéssica Alexandrini</p>
              </div>
            </div>
          </div>
        )}

        {/* Aba: Documentos */}
        {aba === 'documentos' && (
          <div>
            {documentos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <FileText size={36} color="#4a5060" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', color: '#4a5060' }}>Nenhum documento compartilhado ainda</p>
              </div>
            ) : documentos.map(d => (
              <div key={d.id} style={{ background: '#111318', border: '1px solid #ffffff0f', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{TIPO_DOC[d.tipo_documento || d.tipo]?.split(' ')[0] || '📎'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f2f5', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</p>
                  <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                {d.arquivo_url && (
                  <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1c2028', border: '1px solid #ffffff0f', borderRadius: '7px', padding: '6px 10px', color: '#8b92a0', fontSize: '11px', textDecoration: 'none' }}>
                    <ExternalLink size={11} /> Abrir
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Aba: Mensagens */}
        {aba === 'mensagens' && (
          <div>
            <div style={{ background: '#111318', border: '1px solid #ffffff0f', borderRadius: '14px', padding: '16px', marginBottom: '12px', minHeight: '280px', maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mensagens.length === 0 && (
                <p style={{ textAlign: 'center', color: '#4a5060', fontSize: '13px', margin: 'auto' }}>Nenhuma mensagem ainda. Envie sua dúvida abaixo.</p>
              )}
              {mensagens.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.remetente === 'cliente' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: m.remetente === 'cliente' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.remetente === 'cliente' ? '#4f7aff' : '#1c2028',
                    border: m.remetente === 'escritorio' ? '1px solid #ffffff0f' : 'none',
                  }}>
                    {m.remetente === 'escritorio' && (
                      <p style={{ fontSize: '10px', fontWeight: '700', color: '#4f7aff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alexandrini Advogados</p>
                    )}
                    <p style={{ fontSize: '13px', color: '#f0f2f5', margin: 0, lineHeight: '1.5' }}>{m.mensagem}</p>
                    <p style={{ fontSize: '10px', color: m.remetente === 'cliente' ? 'rgba(255,255,255,0.6)' : '#4a5060', margin: '4px 0 0', textAlign: 'right' }}>
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                placeholder="Digite sua mensagem..."
                style={{ flex: 1, background: '#111318', border: '1px solid #ffffff0f', borderRadius: '10px', padding: '11px 14px', color: '#f0f2f5', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none' }} />
              <button onClick={enviarMensagem} disabled={enviando || !novaMensagem.trim()}
                style={{ width: '44px', height: '44px', background: novaMensagem.trim() ? '#4f7aff' : '#1c2028', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {enviando ? <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} color={novaMensagem.trim() ? '#fff' : '#4a5060'} />}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: '#4a5060', margin: '0 0 4px' }}>Alexandrini Advogados • (41) 99984-4234</p>
          <a href="https://alexandrini.adv.br" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#4f7aff', textDecoration: 'none' }}>alexandrini.adv.br</a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
