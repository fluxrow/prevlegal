'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CalendarDays,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from 'lucide-react'

const STATUS_INFO: Record<string, { label: string; cor: string; descricao: string }> = {
  new: {
    label: 'Em análise',
    cor: '#4f7aff',
    descricao: 'Seu caso está sendo analisado pela equipe.',
  },
  contacted: {
    label: 'Em contato',
    cor: '#f5c842',
    descricao: 'A equipe já iniciou o atendimento e pode pedir novos dados.',
  },
  awaiting: {
    label: 'Aguardando retorno',
    cor: '#ff8c42',
    descricao: 'Há alguma pendência sua para o caso seguir com segurança.',
  },
  scheduled: {
    label: 'Consulta agendada',
    cor: '#a78bfa',
    descricao: 'Sua reunião está marcada. Confira data, hora e link abaixo.',
  },
  converted: {
    label: 'Processo iniciado',
    cor: '#2dd4a0',
    descricao: 'Seu atendimento já avançou para a etapa de execução do caso.',
  },
  lost: {
    label: 'Atendimento encerrado',
    cor: '#6b7280',
    descricao: 'Este atendimento foi encerrado. Se precisar, fale com a equipe.',
  },
}

const TIPO_DOC: Record<string, string> = {
  cnis: '📋 CNIS',
  procuracao: '📄 Procuração',
  identidade: '🪪 Identidade',
  laudo: '🏥 Laudo',
  peticao: '⚖️ Petição',
  outro: '📎 Documento',
  peticao_inicial: '⚖️ Petição Inicial',
  requerimento_inss: '📄 Requerimento INSS',
}

interface Lead {
  id: string
  nome: string
  status: string
  created_at: string
}

interface Documento {
  id: string
  nome: string
  tipo: string
  arquivo_url?: string
  tipo_documento?: string
  created_at: string
}

interface Mensagem {
  id: string
  remetente: string
  mensagem: string
  lida: boolean
  created_at: string
}

interface Branding {
  nome_escritorio: string
  logo_url?: string | null
  cor_primaria: string
  contato_email?: string | null
  contato_telefone?: string | null
}

interface ProximoAgendamento {
  id: string
  data_hora: string
  duracao_minutos: number
  status: string
  meet_link?: string | null
  observacoes?: string | null
}

interface PortalPayload {
  lead: Lead
  documentos: Documento[]
  mensagens: Mensagem[]
  branding: Branding
  proximo_agendamento: ProximoAgendamento | null
  resumo: {
    documentos_compartilhados: number
    mensagens_nao_lidas: number
  }
}

function formatarDataHora(dataHora: string) {
  const date = new Date(dataHora)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR')
}

function formatarHora(data: string) {
  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timelineSteps(status: string) {
  return [
    { key: 'new', label: 'Caso recebido', done: true },
    {
      key: 'contacted',
      label: 'Primeiro contato',
      done: ['contacted', 'awaiting', 'scheduled', 'converted'].includes(status),
    },
    {
      key: 'awaiting',
      label: 'Troca de informações',
      done: ['awaiting', 'scheduled', 'converted'].includes(status),
    },
    {
      key: 'scheduled',
      label: 'Consulta marcada',
      done: ['scheduled', 'converted'].includes(status),
    },
    {
      key: 'converted',
      label: 'Caso em andamento',
      done: status === 'converted',
    },
  ]
}

export default function PortalClientePage() {
  const { token } = useParams() as { token: string }
  const [payload, setPayload] = useState<PortalPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aba, setAba] = useState<'inicio' | 'documentos' | 'mensagens'>('inicio')
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPortal()
  }, [token])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [payload?.mensagens])

  async function fetchPortal() {
    setLoading(true)
    const res = await fetch(`/api/portal/${token}`)
    if (!res.ok) {
      setErro('Portal não encontrado ou link inválido.')
      setLoading(false)
      return
    }
    const json = (await res.json()) as PortalPayload
    setPayload(json)
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
      setPayload((current) =>
        current
          ? {
              ...current,
              mensagens: [...current.mensagens, json.mensagem],
            }
          : current,
      )
      setNovaMensagem('')
    }

    setEnviando(false)
  }

  const lead = payload?.lead ?? null
  const documentos = payload?.documentos ?? []
  const mensagens = payload?.mensagens ?? []
  const branding = payload?.branding
  const proximoAgendamento = payload?.proximo_agendamento ?? null

  const statusInfo = lead ? STATUS_INFO[lead.status] || STATUS_INFO.new : null
  const msgNaoLidas = useMemo(
    () => mensagens.filter((m) => m.remetente === 'escritorio' && !m.lida).length,
    [mensagens],
  )

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080b14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 size={28} color="#4f7aff" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (erro || !lead || !branding || !statusInfo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080b14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <XCircle size={48} color="#ff5757" />
        <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '20px', margin: 0 }}>
          Link inválido
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', maxWidth: '320px' }}>
          {erro || 'Este portal não foi encontrado ou o link expirou.'}
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080b14',
        fontFamily: 'DM Sans, sans-serif',
        color: '#f0f2f5',
      }}
    >
      <div
        style={{
          background: '#111318',
          borderBottom: '1px solid #ffffff0f',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              background: `linear-gradient(135deg, ${branding.cor_primaria}, #7c3aed)`,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.nome_escritorio}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              '⚖️'
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#f0f2f5',
                margin: 0,
                fontFamily: 'Syne, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {branding.nome_escritorio}
            </p>
            <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>Portal do Cliente</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f2f5', margin: 0 }}>{lead.nome}</p>
          <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
            Desde {formatarData(lead.created_at)}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px' }}>
        <div
          style={{
            background: `${statusInfo.cor}10`,
            border: `1px solid ${statusInfo.cor}30`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${statusInfo.cor}18`,
                color: statusInfo.cor,
                flexShrink: 0,
              }}
            >
              {lead.status === 'lost' ? (
                <XCircle size={16} />
              ) : lead.status === 'contacted' ? (
                <MessageSquare size={16} />
              ) : lead.status === 'scheduled' || lead.status === 'converted' ? (
                <CheckCircle size={16} />
              ) : (
                <Clock size={16} />
              )}
            </div>
            <span
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: statusInfo.cor,
                fontFamily: 'Syne, sans-serif',
              }}
            >
              {statusInfo.label}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>{statusInfo.descricao}</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            marginBottom: '18px',
          }}
        >
          {[
            {
              label: 'Documentos',
              value: payload.resumo.documentos_compartilhados,
              icon: <FileText size={14} />,
            },
            {
              label: 'Mensagens',
              value: msgNaoLidas,
              icon: <MessageSquare size={14} />,
            },
            {
              label: 'Consulta',
              value: proximoAgendamento ? 'Marcada' : '—',
              icon: <CalendarDays size={14} />,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '12px',
                padding: '14px 12px',
              }}
            >
              <div style={{ color: branding.cor_primaria, marginBottom: '8px' }}>{item.icon}</div>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#f0f2f5', margin: '0 0 4px' }}>
                {item.value}
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '20px',
            background: '#111318',
            border: '1px solid #ffffff0f',
            borderRadius: '10px',
            padding: '4px',
          }}
        >
          {([
            { key: 'inicio', label: 'Início' },
            { key: 'documentos', label: `Documentos${documentos.length > 0 ? ` (${documentos.length})` : ''}` },
            { key: 'mensagens', label: `Mensagens${msgNaoLidas > 0 ? ` (${msgNaoLidas})` : ''}` },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setAba(item.key)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s',
                background: aba === item.key ? '#1c2028' : 'transparent',
                color: aba === item.key ? '#f0f2f5' : '#4a5060',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {aba === 'inicio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CalendarDays size={16} color={branding.cor_primaria} />
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: 0,
                  }}
                >
                  Próxima consulta
                </p>
              </div>

              {proximoAgendamento ? (
                <>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#f0f2f5',
                      margin: '0 0 6px',
                      fontFamily: 'Syne, sans-serif',
                    }}
                  >
                    {formatarDataHora(proximoAgendamento.data_hora)}
                  </p>
                  <p style={{ fontSize: '13px', color: '#8b92a0', margin: '0 0 14px' }}>
                    Duração estimada de {proximoAgendamento.duracao_minutos} minutos.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {proximoAgendamento.meet_link ? (
                      <a
                        href={proximoAgendamento.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: branding.cor_primaria,
                          color: '#fff',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={13} />
                        Entrar no Meet
                      </a>
                    ) : null}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #ffffff12',
                        background: '#080b14',
                        color: '#8b92a0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      <Clock size={13} />
                      {proximoAgendamento.status}
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>
                  Ainda não há consulta futura registrada. Se precisar, fale com a equipe pela aba de mensagens.
                </p>
              )}
            </div>

            <div
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '16px',
                }}
              >
                Etapas do atendimento
              </p>
              {timelineSteps(lead.status).map((step, index, items) => (
                <div key={step.key} style={{ display: 'flex', gap: '12px', marginBottom: index < items.length - 1 ? '12px' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: step.done ? branding.cor_primaria : '#1c2028',
                        border: `2px solid ${step.done ? branding.cor_primaria : '#ffffff0f'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {step.done ? (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                      ) : null}
                    </div>
                    {index < items.length - 1 ? (
                      <div
                        style={{
                          width: '2px',
                          flex: 1,
                          minHeight: '20px',
                          background: step.done ? `${branding.cor_primaria}40` : '#ffffff0f',
                          margin: '3px 0',
                        }}
                      />
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: step.done ? '#f0f2f5' : '#4a5060',
                      margin: '2px 0 0',
                      fontWeight: step.done ? '600' : '400',
                    }}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>

            <div
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '24px' }}>💬</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f2f5', margin: '0 0 3px' }}>
                  Precisa falar com a equipe?
                </p>
                <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
                  Use a aba Mensagens para tirar dúvidas ou mandar atualizações importantes sobre o caso.
                </p>
              </div>
            </div>
          </div>
        )}

        {aba === 'documentos' && (
          <div>
            {documentos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <FileText size={36} color="#4a5060" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', color: '#4a5060' }}>Nenhum documento compartilhado ainda</p>
              </div>
            ) : (
              documentos.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    background: '#111318',
                    border: '1px solid #ffffff0f',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>
                    {TIPO_DOC[doc.tipo_documento || doc.tipo]?.split(' ')[0] || '📎'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#f0f2f5',
                        margin: '0 0 2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.nome}
                    </p>
                    <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>{formatarData(doc.created_at)}</p>
                  </div>
                  {doc.arquivo_url ? (
                    <a
                      href={doc.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#1c2028',
                        border: '1px solid #ffffff0f',
                        borderRadius: '7px',
                        padding: '6px 10px',
                        color: '#8b92a0',
                        fontSize: '11px',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={11} />
                      Abrir
                    </a>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}

        {aba === 'mensagens' && (
          <div>
            <div
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '12px',
                minHeight: '280px',
                maxHeight: '380px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {mensagens.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4a5060', fontSize: '13px', margin: 'auto' }}>
                  Nenhuma mensagem ainda. Envie sua dúvida abaixo.
                </p>
              ) : null}
              {mensagens.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.remetente === 'cliente' ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: m.remetente === 'cliente' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: m.remetente === 'cliente' ? branding.cor_primaria : '#1c2028',
                      border: m.remetente === 'escritorio' ? '1px solid #ffffff0f' : 'none',
                    }}
                  >
                    {m.remetente === 'escritorio' ? (
                      <p
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: branding.cor_primaria,
                          margin: '0 0 4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {branding.nome_escritorio}
                      </p>
                    ) : null}
                    <p style={{ fontSize: '13px', color: '#f0f2f5', margin: 0, lineHeight: '1.5' }}>{m.mensagem}</p>
                    <p
                      style={{
                        fontSize: '10px',
                        color: m.remetente === 'cliente' ? 'rgba(255,255,255,0.65)' : '#4a5060',
                        margin: '4px 0 0',
                        textAlign: 'right',
                      }}
                    >
                      {formatarHora(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                placeholder="Digite sua mensagem..."
                style={{
                  flex: 1,
                  background: '#111318',
                  border: '1px solid #ffffff0f',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  color: '#f0f2f5',
                  fontSize: '13px',
                  fontFamily: 'DM Sans, sans-serif',
                  outline: 'none',
                }}
              />
              <button
                onClick={enviarMensagem}
                disabled={enviando || !novaMensagem.trim()}
                style={{
                  width: '44px',
                  height: '44px',
                  background: novaMensagem.trim() ? branding.cor_primaria : '#1c2028',
                  border: 'none',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {enviando ? (
                  <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send size={15} color={novaMensagem.trim() ? '#fff' : '#4a5060'} />
                )}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: '#4a5060', margin: '0 0 4px' }}>
            {branding.nome_escritorio}
            {branding.contato_telefone ? ` • ${branding.contato_telefone}` : ''}
          </p>
          {branding.contato_email ? (
            <p style={{ fontSize: '11px', color: branding.cor_primaria, margin: 0 }}>{branding.contato_email}</p>
          ) : null}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
