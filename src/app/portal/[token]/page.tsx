'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Bell,
  Upload,
  Send,
  UserRound,
  XCircle,
  LogOut,
} from 'lucide-react'
import PortalInstallPrompt from '@/components/portal-install-prompt'

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
  descricao?: string | null
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

interface PendenciaDocumento {
  id: string
  titulo: string
  descricao?: string | null
  status: string
  created_at: string
  updated_at: string
}

interface TimelineEvent {
  id: string
  tipo: string
  titulo: string
  descricao?: string | null
  created_at: string
}

interface PortalPayload {
  lead: Lead
  documentos: Documento[]
  mensagens: Mensagem[]
  branding: Branding
  proximo_agendamento: ProximoAgendamento | null
  pendencias_documento: PendenciaDocumento[]
  timeline: TimelineEvent[]
  viewer: {
    id: string
    nome: string
    email?: string | null
    telefone?: string | null
    papel: 'cliente' | 'familiar' | 'cuidador'
    ativo: boolean
    ultimo_acesso_em?: string | null
  } | null
  identity: {
    foundation_pending: boolean
    has_session: boolean
  }
  resumo: {
    documentos_compartilhados: number
    mensagens_nao_lidas: number
    documentos_pendentes: number
  }
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'identidade', label: 'Identidade' },
  { value: 'cnis', label: 'CNIS' },
  { value: 'procuracao', label: 'Procuração' },
  { value: 'laudo', label: 'Laudo' },
  { value: 'outro', label: 'Outro documento' },
] as const

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

function timelineIcon(tipo: string) {
  if (tipo.includes('agendamento')) return <CalendarDays size={14} />
  if (tipo.includes('documento')) return <FileText size={14} />
  if (tipo.includes('mensagem')) return <MessageSquare size={14} />
  if (tipo.includes('caso')) return <CheckCircle size={14} />
  return <Clock size={14} />
}

function timelineColor(tipo: string, fallback: string) {
  if (tipo.includes('agendamento')) return '#a78bfa'
  if (tipo.includes('documento')) return '#2dd4a0'
  if (tipo.includes('mensagem_cliente')) return '#f5c842'
  if (tipo.includes('mensagem_escritorio')) return fallback
  if (tipo.includes('caso')) return fallback
  return '#8b92a0'
}

export default function PortalClientePage() {
  const { token } = useParams() as { token: string }
  const [payload, setPayload] = useState<PortalPayload | null>(null)
  const [ultimoAcessoBase, setUltimoAcessoBase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aba, setAba] = useState<'inicio' | 'documentos' | 'mensagens' | 'perfil'>('inicio')
  const [perfil, setPerfil] = useState({ nome: '', email: '', telefone: '' })
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [arquivoPortal, setArquivoPortal] = useState<File | null>(null)
  const [tituloDocumentoPortal, setTituloDocumentoPortal] = useState('')
  const [tipoDocumentoPortal, setTipoDocumentoPortal] = useState<string>('outro')
  const [requestSelecionadaId, setRequestSelecionadaId] = useState<string>('')
  const [enviandoDocumento, setEnviandoDocumento] = useState(false)
  const [erroDocumento, setErroDocumento] = useState('')
  const [sucessoDocumento, setSucessoDocumento] = useState('')
  const [mostrarRemarcacao, setMostrarRemarcacao] = useState(false)
  const [motivoRemarcacao, setMotivoRemarcacao] = useState('')
  const [sugestaoRemarcacao, setSugestaoRemarcacao] = useState('')
  const [enviandoRemarcacao, setEnviandoRemarcacao] = useState(false)
  const [erroRemarcacao, setErroRemarcacao] = useState('')
  const [sucessoRemarcacao, setSucessoRemarcacao] = useState('')
  const [confirmandoPresenca, setConfirmandoPresenca] = useState(false)
  const [erroConfirmacao, setErroConfirmacao] = useState('')
  const [sucessoConfirmacao, setSucessoConfirmacao] = useState('')
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPortal()
  }, [token])

  useEffect(() => {
    setUltimoAcessoBase(null)
  }, [token])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [payload?.mensagens])

  useEffect(() => {
    if (payload?.viewer) {
      setPerfil({
        nome: payload.viewer.nome || '',
        email: payload.viewer.email || '',
        telefone: payload.viewer.telefone || '',
      })
    }
  }, [payload?.viewer])

  useEffect(() => {
    if (!ultimoAcessoBase && payload?.viewer?.ultimo_acesso_em) {
      setUltimoAcessoBase(payload.viewer.ultimo_acesso_em)
    }
  }, [payload?.viewer?.ultimo_acesso_em, ultimoAcessoBase])

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

  async function salvarPerfil() {
    if (!payload?.viewer) return
    setSalvandoPerfil(true)
    const res = await fetch(`/api/portal/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perfil),
    })

    const json = await res.json().catch(() => null)
    if (res.ok && json?.viewer) {
      setPayload((current) =>
        current
          ? {
              ...current,
              viewer: json.viewer,
            }
          : current,
      )
    }

    setSalvandoPerfil(false)
  }

  async function sairDoAcesso() {
    await fetch('/api/portal/session', { method: 'DELETE' })
    window.location.reload()
  }

  async function enviarDocumentoPortal() {
    if (!arquivoPortal) return
    setEnviandoDocumento(true)
    setErroDocumento('')
    setSucessoDocumento('')

    const formData = new FormData()
    formData.append('file', arquivoPortal)
    if (tituloDocumentoPortal.trim()) formData.append('titulo', tituloDocumentoPortal.trim())
    formData.append('tipo', tipoDocumentoPortal)
    if (requestSelecionadaId) formData.append('requestId', requestSelecionadaId)

    const res = await fetch(`/api/portal/${token}/documentos/upload`, {
      method: 'POST',
      body: formData,
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setErroDocumento(json?.error || 'Não foi possível enviar o documento pelo portal.')
      setEnviandoDocumento(false)
      return
    }

    setArquivoPortal(null)
    setTituloDocumentoPortal('')
    setTipoDocumentoPortal('outro')
    setRequestSelecionadaId('')
    setSucessoDocumento('Documento enviado com sucesso. A equipe já pode analisar.')
    await fetchPortal()
    setEnviandoDocumento(false)
  }

  async function pedirRemarcacao() {
    if (!motivoRemarcacao.trim()) return
    setEnviandoRemarcacao(true)
    setErroRemarcacao('')
    setSucessoRemarcacao('')

    const res = await fetch(`/api/portal/${token}/remarcacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo: motivoRemarcacao,
        sugestao: sugestaoRemarcacao,
      }),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setErroRemarcacao(json?.error || 'Não foi possível registrar o pedido de remarcação.')
      setEnviandoRemarcacao(false)
      return
    }

    setMotivoRemarcacao('')
    setSugestaoRemarcacao('')
    setMostrarRemarcacao(false)
    setSucessoRemarcacao('Pedido enviado. A equipe vai revisar e retornar com a nova disponibilidade.')
    await fetchPortal()
    setEnviandoRemarcacao(false)
  }

  async function confirmarPresenca() {
    setConfirmandoPresenca(true)
    setErroConfirmacao('')
    setSucessoConfirmacao('')

    const res = await fetch(`/api/portal/${token}/confirmacao`, {
      method: 'POST',
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setErroConfirmacao(json?.error || 'Não foi possível confirmar sua presença agora.')
      setConfirmandoPresenca(false)
      return
    }

    setSucessoConfirmacao('Presença confirmada com sucesso. A equipe já foi avisada.')
    await fetchPortal()
    setConfirmandoPresenca(false)
  }

  const lead = payload?.lead ?? null
  const documentos = payload?.documentos ?? []
  const mensagens = payload?.mensagens ?? []
  const branding = payload?.branding
  const proximoAgendamento = payload?.proximo_agendamento ?? null
  const pendenciasDocumento = payload?.pendencias_documento ?? []
  const timeline = payload?.timeline ?? []
  const viewer = payload?.viewer ?? null
  const podeConfirmarPresenca = Boolean(
    proximoAgendamento && ['agendado', 'remarcado'].includes(proximoAgendamento.status),
  )
  const consultaJaConfirmada = proximoAgendamento?.status === 'confirmado'

  const statusInfo = lead ? STATUS_INFO[lead.status] || STATUS_INFO.new : null
  const msgNaoLidas = useMemo(
    () => mensagens.filter((m) => m.remetente === 'escritorio' && !m.lida).length,
    [mensagens],
  )
  const ultimoAcesso = ultimoAcessoBase ? new Date(ultimoAcessoBase) : null
  const novidadesRecentes = useMemo(() => {
    if (!ultimoAcesso) return []
    return timeline.filter((evento) => new Date(evento.created_at).getTime() > ultimoAcesso.getTime()).slice(0, 4)
  }, [timeline, ultimoAcesso])
  const resumoNovidades = useMemo(
    () =>
      [
        novidadesRecentes.length > 0
          ? `${novidadesRecentes.length} atualiza${novidadesRecentes.length > 1 ? 'ções' : 'ção'} na timeline`
          : null,
        msgNaoLidas > 0 ? `${msgNaoLidas} mensagem${msgNaoLidas > 1 ? 'ens' : ''} da equipe` : null,
        pendenciasDocumento.length > 0
          ? `${pendenciasDocumento.length} pendência${pendenciasDocumento.length > 1 ? 's' : ''} de documento`
          : null,
      ].filter(Boolean) as string[],
    [msgNaoLidas, novidadesRecentes.length, pendenciasDocumento.length],
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
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'flex-end' }}>
            <PortalInstallPrompt accentColor={branding.cor_primaria} />
          </div>
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
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
              label: 'Pendências',
              value: payload.resumo.documentos_pendentes,
              icon: <Clock size={14} />,
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
            { key: 'perfil', label: 'Perfil' },
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
                    {podeConfirmarPresenca ? (
                      <button
                        onClick={confirmarPresenca}
                        disabled={confirmandoPresenca}
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
                          border: 'none',
                          cursor: confirmandoPresenca ? 'wait' : 'pointer',
                        }}
                      >
                        {confirmandoPresenca ? (
                          <>
                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            Confirmando...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={13} />
                            Confirmar presença
                          </>
                        )}
                      </button>
                    ) : null}
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
                    {consultaJaConfirmada ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(45,212,160,0.18)',
                          background: 'rgba(45,212,160,0.08)',
                          color: '#8ef0cc',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        <CheckCircle size={13} />
                        Presença confirmada
                      </div>
                    ) : null}
                    <button
                      onClick={() => {
                        setMostrarRemarcacao((current) => !current)
                        setErroRemarcacao('')
                        setSucessoRemarcacao('')
                      }}
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
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      <CalendarDays size={13} />
                      Pedir remarcação
                    </button>
                  </div>
                  {sucessoRemarcacao ? (
                    <div
                      style={{
                        marginTop: '12px',
                        background: 'rgba(45,212,160,0.08)',
                        border: '1px solid rgba(45,212,160,0.18)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#8ef0cc',
                        fontSize: '12px',
                      }}
                    >
                      {sucessoRemarcacao}
                    </div>
                  ) : null}
                  {sucessoConfirmacao ? (
                    <div
                      style={{
                        marginTop: '12px',
                        background: 'rgba(45,212,160,0.08)',
                        border: '1px solid rgba(45,212,160,0.18)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#8ef0cc',
                        fontSize: '12px',
                      }}
                    >
                      {sucessoConfirmacao}
                    </div>
                  ) : null}
                  {erroConfirmacao ? (
                    <div
                      style={{
                        marginTop: '12px',
                        background: 'rgba(255,87,87,0.08)',
                        border: '1px solid rgba(255,87,87,0.18)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#ff8a8a',
                        fontSize: '12px',
                      }}
                    >
                      {erroConfirmacao}
                    </div>
                  ) : null}
                  {mostrarRemarcacao ? (
                    <div
                      style={{
                        marginTop: '14px',
                        display: 'grid',
                        gap: '10px',
                        background: '#080b14',
                        border: '1px solid #ffffff0f',
                        borderRadius: '12px',
                        padding: '14px',
                      }}
                    >
                      <p style={{ fontSize: '12px', color: '#8b92a0', margin: 0, lineHeight: '1.6' }}>
                        Conte para a equipe por que você precisa remarcar e, se quiser, sugira outro período.
                      </p>
                      <textarea
                        value={motivoRemarcacao}
                        onChange={(e) => setMotivoRemarcacao(e.target.value)}
                        placeholder="Ex.: não conseguirei estar disponível nesse horário"
                        rows={3}
                        style={{
                          resize: 'vertical',
                          minHeight: '88px',
                          background: '#111318',
                          border: '1px solid #ffffff0f',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          color: '#f0f2f5',
                          fontSize: '13px',
                          fontFamily: 'DM Sans, sans-serif',
                          outline: 'none',
                        }}
                      />
                      <input
                        value={sugestaoRemarcacao}
                        onChange={(e) => setSugestaoRemarcacao(e.target.value)}
                        placeholder="Sugestão de período (opcional)"
                        style={{
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
                      {erroRemarcacao ? (
                        <div
                          style={{
                            background: 'rgba(255,87,87,0.08)',
                            border: '1px solid rgba(255,87,87,0.18)',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            color: '#ff8a8a',
                            fontSize: '12px',
                          }}
                        >
                          {erroRemarcacao}
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={pedirRemarcacao}
                          disabled={enviandoRemarcacao || !motivoRemarcacao.trim()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: motivoRemarcacao.trim() ? branding.cor_primaria : '#1c2028',
                            color: motivoRemarcacao.trim() ? '#fff' : '#4a5060',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: motivoRemarcacao.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {enviandoRemarcacao ? (
                            <>
                              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              Enviando...
                            </>
                          ) : (
                            'Enviar pedido'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setMostrarRemarcacao(false)
                            setErroRemarcacao('')
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#111318',
                            color: '#8b92a0',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            border: '1px solid #ffffff0f',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>
                  Ainda não há consulta futura registrada. Se precisar, fale com a equipe pela aba de mensagens.
                </p>
              )}
            </div>

            {ultimoAcesso ? (
              <div
                style={{
                  background: '#111318',
                  border: '1px solid #ffffff0f',
                  borderRadius: '14px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Bell size={16} color={branding.cor_primaria} />
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
                    Novidades desde seu último acesso
                  </p>
                </div>
                <p style={{ fontSize: '12px', color: '#4a5060', margin: '0 0 14px' }}>
                  Último acesso em {formatarDataHora(ultimoAcessoBase || '')}
                </p>
                {resumoNovidades.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {resumoNovidades.map((item) => (
                      <span
                        key={item}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 10px',
                          borderRadius: '999px',
                          border: '1px solid #ffffff12',
                          background: '#080b14',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#c7ccd6',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
                {novidadesRecentes.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {novidadesRecentes.map((evento) => {
                      const corEvento = timelineColor(evento.tipo, branding.cor_primaria)
                      return (
                        <div
                          key={evento.id}
                          style={{
                            background: '#080b14',
                            border: '1px solid #ffffff0f',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: `${corEvento}18`,
                              color: corEvento,
                              border: `1px solid ${corEvento}40`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {timelineIcon(evento.tipo)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#f0f2f5',
                                margin: '0 0 4px',
                              }}
                            >
                              {evento.titulo}
                            </p>
                            {evento.descricao ? (
                              <p style={{ fontSize: '12px', color: '#8b92a0', margin: '0 0 4px', lineHeight: '1.5' }}>
                                {evento.descricao}
                              </p>
                            ) : null}
                            <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
                              {formatarDataHora(evento.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#080b14',
                      border: '1px solid #ffffff0f',
                      borderRadius: '12px',
                      padding: '12px 14px',
                    }}
                  >
                    <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>
                      Nenhuma novidade registrada desde sua última visita.
                    </p>
                  </div>
                )}
                {msgNaoLidas > 0 || pendenciasDocumento.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                    {msgNaoLidas > 0 ? (
                      <button
                        onClick={() => setAba('mensagens')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#080b14',
                          color: '#f0f2f5',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          border: '1px solid #ffffff0f',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        <MessageSquare size={13} />
                        Ver mensagens
                      </button>
                    ) : null}
                    {pendenciasDocumento.length > 0 ? (
                      <button
                        onClick={() => setAba('documentos')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#080b14',
                          color: '#f0f2f5',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          border: '1px solid #ffffff0f',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        <FileText size={13} />
                        Ver documentos
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <FileText size={16} color={branding.cor_primaria} />
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
                  Documentos pendentes
                </p>
              </div>

              {pendenciasDocumento.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                  {pendenciasDocumento.map((pendencia) => (
                    <div
                      key={pendencia.id}
                      style={{
                        background: '#080b14',
                        border: '1px solid #ffffff0f',
                        borderRadius: '12px',
                        padding: '12px 14px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#f0f2f5',
                          margin: '0 0 4px',
                        }}
                      >
                        {pendencia.titulo}
                      </p>
                      {pendencia.descricao ? (
                        <p style={{ fontSize: '12px', color: '#8b92a0', margin: '0 0 6px', lineHeight: '1.5' }}>
                          {pendencia.descricao}
                        </p>
                      ) : null}
                      <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
                        Registrado em {formatarData(pendencia.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: '#080b14',
                    border: '1px solid #ffffff0f',
                    borderRadius: '12px',
                    padding: '14px',
                    marginBottom: '18px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>
                    Nenhum documento pendente no momento. Se a equipe precisar de algo novo, essa área será atualizada.
                  </p>
                </div>
              )}

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
                Linha do tempo do caso
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {timeline.map((evento, index) => {
                  const corEvento = timelineColor(evento.tipo, branding.cor_primaria)

                  return (
                    <div key={evento.id} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: `${corEvento}18`,
                            color: corEvento,
                            border: `1px solid ${corEvento}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {timelineIcon(evento.tipo)}
                        </div>
                        {index < timeline.length - 1 ? (
                          <div
                            style={{
                              width: '2px',
                              flex: 1,
                              minHeight: '18px',
                              background: '#ffffff10',
                              margin: '4px 0',
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                        <p
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#f0f2f5',
                            margin: '0 0 4px',
                          }}
                        >
                          {evento.titulo}
                        </p>
                        {evento.descricao ? (
                          <p style={{ fontSize: '12px', color: '#8b92a0', margin: '0 0 4px', lineHeight: '1.5' }}>
                            {evento.descricao}
                          </p>
                        ) : null}
                        <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
                          {formatarDataHora(evento.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
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
              <span style={{ fontSize: '24px' }}>
                <Download size={20} color={branding.cor_primaria} />
              </span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f2f5', margin: '0 0 3px' }}>
                  Instale no seu celular
                </p>
                <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
                  Você pode usar este portal como app e abrir direto da tela inicial para acompanhar mensagens,
                  documentos e consultas.
                </p>
              </div>
            </div>
          </div>
        )}

        {aba === 'documentos' && (
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
                <Upload size={16} color={branding.cor_primaria} />
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
                  Enviar documento
                </p>
              </div>

              <p style={{ fontSize: '13px', color: '#8b92a0', margin: '0 0 14px', lineHeight: '1.6' }}>
                Envie o arquivo por aqui para acelerar a análise do seu caso. Se houver uma pendência específica,
                você pode associar o envio a ela.
              </p>

              <div style={{ display: 'grid', gap: '10px' }}>
                {pendenciasDocumento.length > 0 ? (
                  <select
                    value={requestSelecionadaId}
                    onChange={(e) => setRequestSelecionadaId(e.target.value)}
                    style={{
                      background: '#080b14',
                      border: '1px solid #ffffff0f',
                      borderRadius: '10px',
                      padding: '11px 14px',
                      color: '#f0f2f5',
                      fontSize: '13px',
                      fontFamily: 'DM Sans, sans-serif',
                      outline: 'none',
                    }}
                  >
                    <option value="">Vincular a uma pendência (opcional)</option>
                    {pendenciasDocumento.map((pendencia) => (
                      <option key={pendencia.id} value={pendencia.id}>
                        {pendencia.titulo}
                      </option>
                    ))}
                  </select>
                ) : null}

                <input
                  value={tituloDocumentoPortal}
                  onChange={(e) => setTituloDocumentoPortal(e.target.value)}
                  placeholder="Título do documento (opcional)"
                  style={{
                    background: '#080b14',
                    border: '1px solid #ffffff0f',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    color: '#f0f2f5',
                    fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif',
                    outline: 'none',
                  }}
                />

                <select
                  value={tipoDocumentoPortal}
                  onChange={(e) => setTipoDocumentoPortal(e.target.value)}
                  style={{
                    background: '#080b14',
                    border: '1px solid #ffffff0f',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    color: '#f0f2f5',
                    fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif',
                    outline: 'none',
                  }}
                >
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: '#080b14',
                    border: '1px dashed #ffffff20',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: '#f0f2f5', margin: '0 0 4px', fontWeight: '600' }}>
                      {arquivoPortal ? arquivoPortal.name : 'Selecionar arquivo'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                      PDF, imagem ou documento para análise.
                    </p>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#111318',
                      border: '1px solid #ffffff0f',
                      borderRadius: '9px',
                      padding: '8px 10px',
                      color: '#8b92a0',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  >
                    <Upload size={12} />
                    Escolher
                  </span>
                  <input
                    type="file"
                    hidden
                    onChange={(e) => setArquivoPortal(e.target.files?.[0] || null)}
                  />
                </label>

                {erroDocumento ? (
                  <div
                    style={{
                      background: 'rgba(255,87,87,0.08)',
                      border: '1px solid rgba(255,87,87,0.18)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ff8a8a',
                      fontSize: '12px',
                    }}
                  >
                    {erroDocumento}
                  </div>
                ) : null}

                {sucessoDocumento ? (
                  <div
                    style={{
                      background: 'rgba(45,212,160,0.08)',
                      border: '1px solid rgba(45,212,160,0.18)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#8ef0cc',
                      fontSize: '12px',
                    }}
                  >
                    {sucessoDocumento}
                  </div>
                ) : null}

                <button
                  onClick={enviarDocumentoPortal}
                  disabled={enviandoDocumento || !arquivoPortal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: arquivoPortal ? branding.cor_primaria : '#1c2028',
                    color: arquivoPortal ? '#fff' : '#4a5060',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: arquivoPortal ? 'pointer' : 'not-allowed',
                  }}
                >
                  {enviandoDocumento ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Enviar documento
                    </>
                  )}
                </button>
              </div>
            </div>

            {pendenciasDocumento.length > 0 ? (
              <div
                style={{
                  background: '#111318',
                  border: '1px solid #ffffff0f',
                  borderRadius: '14px',
                  padding: '18px',
                }}
              >
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 12px',
                  }}
                >
                  Pendências abertas
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendenciasDocumento.map((pendencia) => (
                    <div
                      key={pendencia.id}
                      style={{
                        background: '#080b14',
                        border: '1px solid #ffffff0f',
                        borderRadius: '12px',
                        padding: '12px 14px',
                      }}
                    >
                      <p style={{ fontSize: '13px', color: '#f0f2f5', margin: '0 0 4px', fontWeight: '700' }}>
                        {pendencia.titulo}
                      </p>
                      {pendencia.descricao ? (
                        <p style={{ fontSize: '12px', color: '#8b92a0', margin: '0 0 6px', lineHeight: '1.5' }}>
                          {pendencia.descricao}
                        </p>
                      ) : null}
                      <p style={{ fontSize: '11px', color: '#4a5060', margin: 0 }}>
                        Situação: {pendencia.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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

        {aba === 'perfil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: '#111318',
                border: '1px solid #ffffff0f',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <UserRound size={16} color={branding.cor_primaria} />
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
                  Seu acesso
                </p>
              </div>

              {viewer ? (
                <>
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
                    <input
                      value={perfil.nome}
                      onChange={(e) => setPerfil((current) => ({ ...current, nome: e.target.value }))}
                      placeholder="Seu nome"
                      style={{
                        background: '#080b14',
                        border: '1px solid #ffffff0f',
                        borderRadius: '10px',
                        padding: '11px 14px',
                        color: '#f0f2f5',
                        fontSize: '13px',
                        fontFamily: 'DM Sans, sans-serif',
                        outline: 'none',
                      }}
                    />
                    <input
                      value={perfil.email}
                      onChange={(e) => setPerfil((current) => ({ ...current, email: e.target.value }))}
                      placeholder="Seu e-mail"
                      style={{
                        background: '#080b14',
                        border: '1px solid #ffffff0f',
                        borderRadius: '10px',
                        padding: '11px 14px',
                        color: '#f0f2f5',
                        fontSize: '13px',
                        fontFamily: 'DM Sans, sans-serif',
                        outline: 'none',
                      }}
                    />
                    <input
                      value={perfil.telefone}
                      onChange={(e) => setPerfil((current) => ({ ...current, telefone: e.target.value }))}
                      placeholder="Seu telefone"
                      style={{
                        background: '#080b14',
                        border: '1px solid #ffffff0f',
                        borderRadius: '10px',
                        padding: '11px 14px',
                        color: '#f0f2f5',
                        fontSize: '13px',
                        fontFamily: 'DM Sans, sans-serif',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={salvarPerfil}
                      disabled={salvandoPerfil || !perfil.nome.trim()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: perfil.nome.trim() ? branding.cor_primaria : '#1c2028',
                        color: perfil.nome.trim() ? '#fff' : '#4a5060',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {salvandoPerfil ? 'Salvando...' : 'Salvar perfil'}
                    </button>
                    <button
                      onClick={sairDoAcesso}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#080b14',
                        color: '#8b92a0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        border: '1px solid #ffffff0f',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      <LogOut size={13} />
                      Sair deste acesso
                    </button>
                  </div>

                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '12px 0 0' }}>
                    Perfil de acesso: {viewer.papel}. Este acesso fica vinculado ao seu link persistente.
                  </p>
                </>
              ) : (
                <div
                  style={{
                    background: '#080b14',
                    border: '1px solid #ffffff0f',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#8b92a0', margin: 0 }}>
                    Este portal ainda está usando o modo por link simples. Peça à equipe um link de acesso persistente para salvar seu perfil.
                  </p>
                </div>
              )}
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
