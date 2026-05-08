'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, User, Bot, UserCheck, RotateCcw, Send, Users, FileText, ExternalLink } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import OnboardingTooltip from '@/components/onboarding-tooltip'
import { samePhone } from '@/lib/contact-shortcuts'
import {
  normalizeOperationalConversationState,
  OPERATIONAL_CONVERSATION_STATES,
  OPERATIONAL_STATE_LABELS,
  OPERATIONAL_STATE_META,
  type OperationalConversationState,
} from '@/lib/inbox-operational-state'

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
  estado_operacional: OperationalConversationState
  estado_operacional_prazo_at?: string | null
  estado_operacional_atualizado_em?: string | null
  ultima_mensagem: string
  ultima_mensagem_at: string
  nao_lidas: number
  assumido_por?: string | null
  assumido_em?: string | null
  leads: { id?: string; nome: string; nb: string; status: string; responsavel_id?: string | null } | null
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

interface InternoTask {
  id: string
  titulo: string
  status: string
  prioridade: string
  assigned_to_usuario: { id: string; nome: string } | null
  due_at: string | null
  completed_at: string | null
}

interface InternoMensagem {
  id: string
  tipo: string
  mensagem: string
  autor: { id: string; nome: string } | null
  created_at: string
}

interface InternoData {
  thread: { id: string; current_owner: { id: string; nome: string } | null } | null
  tasks: InternoTask[]
  mensagens: InternoMensagem[]
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

interface UsuarioResumo {
  id: string
  nome: string | null
  email: string | null
  role?: string | null
}

type UsuarioNomeLike = {
  id?: string
  nome: string | null
  email?: string | null
}

interface DocumentoInbox {
  id: string
  nome: string
  tipo: string
  arquivo_url: string
  arquivo_nome: string
  arquivo_tamanho: number
  arquivo_tipo: string
  descricao: string
  created_at: string
  processing_status?: 'pending' | 'processing' | 'done' | 'failed' | null
  processing_error?: string | null
  processing_finished_at?: string | null
  parsed_doc_type_guess?: string | null
  parsed_excerpt?: string | null
  parsed_updated_at?: string | null
}

type LeadKanbanStatus = 'new' | 'contacted' | 'awaiting' | 'scheduled' | 'converted' | 'lost'
type LeadStatusFilter = 'todos' | LeadKanbanStatus
type LeadStatusSyncChoice = 'manter' | LeadKanbanStatus

const STATUS_CONVERSA = {
  agente: { label: 'Agente', color: '#4f7aff', bg: '#4f7aff20', icon: '🤖' },
  humano: { label: 'Em atendimento', color: '#2dd4a0', bg: '#2dd4a020', icon: '👤' },
  aguardando_cliente: { label: 'Aguardando cliente', color: '#f59e0b', bg: '#f59e0b20', icon: '⏳' },
  resolvido: { label: 'Resolvido', color: '#14b8a6', bg: '#14b8a620', icon: '✅' },
  encerrado: { label: 'Encerrado', color: '#4a5060', bg: '#4a506020', icon: '✓' },
}

const STATUS_HUMANOS = new Set(['humano', 'aguardando_cliente', 'resolvido'])
const STATUS_CONHECIDOS = new Set(['agente', 'humano', 'aguardando_cliente', 'resolvido', 'encerrado'])
type AbaInbox = 'todas' | 'agente' | 'humano' | 'aguardando_cliente' | 'resolvido' | 'portal'

const LEAD_STATUS_META: Record<LeadKanbanStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Novo', color: '#4f7aff', bg: '#4f7aff15' },
  contacted: { label: 'Contatado', color: '#f5c842', bg: '#f5c84215' },
  awaiting: { label: 'Aguardando', color: '#ff8c42', bg: '#ff8c4215' },
  scheduled: { label: 'Agendado', color: '#a78bfa', bg: '#a78bfa15' },
  converted: { label: 'Convertido', color: '#2dd4a0', bg: '#2dd4a015' },
  lost: { label: 'Perdido', color: '#ff5757', bg: '#ff575715' },
}

const LEAD_STATUS_FILTER_OPTIONS: Array<{ id: LeadStatusFilter; label: string }> = [
  { id: 'todos', label: 'Todos os status' },
  { id: 'new', label: 'Novos' },
  { id: 'contacted', label: 'Contatados' },
  { id: 'awaiting', label: 'Aguardando' },
  { id: 'scheduled', label: 'Agendados' },
  { id: 'converted', label: 'Convertidos' },
  { id: 'lost', label: 'Perdidos' },
]

const OPERATIONAL_TO_LEAD_STATUS_SUGGESTION: Partial<Record<OperationalConversationState, LeadKanbanStatus>> = {
  aguardando_cliente: 'awaiting',
  agendado: 'scheduled',
  convertido: 'converted',
}

const PROCESSING_STATUS_LABEL = {
  pending: { label: 'Na fila', bg: '#f59e0b15', color: '#f5b942' },
  processing: { label: 'Processando', bg: '#4f7aff15', color: '#7ea2ff' },
  done: { label: 'Processado', bg: '#22c55e15', color: '#86efac' },
  failed: { label: 'Falhou', bg: '#ff6b6b15', color: '#ff8f8f' },
} as const

function normalizeInboxStatus(status?: string | null): Conversa['status'] {
  if (status && STATUS_CONHECIDOS.has(status)) {
    return status as Conversa['status']
  }
  return 'agente'
}

function normalizeLeadKanbanStatus(status?: string | null): LeadKanbanStatus | null {
  if (!status) return null
  return status in LEAD_STATUS_META ? (status as LeadKanbanStatus) : null
}

function getSuggestedLeadStatusForOperationalState(
  operationalState: OperationalConversationState,
): LeadKanbanStatus | null {
  return OPERATIONAL_TO_LEAD_STATUS_SUGGESTION[operationalState] || null
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

function formatOperationalDeadline(dt?: string | null) {
  if (!dt) return null
  const deadline = new Date(dt)
  if (Number.isNaN(deadline.getTime())) return null
  return deadline.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocalValue(dt?: string | null) {
  if (!dt) return ''
  const date = new Date(dt)
  if (Number.isNaN(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromDateTimeLocalValue(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export default function CaixaDeEntradaPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { active: tourActive, step: tourStep, next: tourNext, finish: tourFinish } = useOnboarding('caixa-de-entrada')
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [abaAtiva, setAbaAtiva] = useState<AbaInbox>('todas')
  const [leadStatusFiltro, setLeadStatusFiltro] = useState<LeadStatusFilter>('todos')
  const [threadsPortal, setThreadsPortal] = useState<ThreadPortal[]>([])
  const [threadSelecionada, setThreadSelecionada] = useState<ThreadPortal | null>(null)
  const [msgsPortal, setMsgsPortal] = useState<PortalMensagem[]>([])
  const [textoPortal, setTextoPortal] = useState('')
  const [enviandoPortal, setEnviandoPortal] = useState(false)
  const [internoData, setInternoData] = useState<InternoData | null>(null)
  const [usuariosMap, setUsuariosMap] = useState<Record<string, UsuarioResumo>>({})
  const [documentosLead, setDocumentosLead] = useState<DocumentoInbox[]>([])
  const [loadingDocumentosLead, setLoadingDocumentosLead] = useState(false)
  const [documentosPanelAberto, setDocumentosPanelAberto] = useState(false)
  const [documentoMensagem, setDocumentoMensagem] = useState('')
  const [enviandoDocumentoId, setEnviandoDocumentoId] = useState<string | null>(null)
  const [erroDocumento, setErroDocumento] = useState<string | null>(null)
  const [transferPanelAberto, setTransferPanelAberto] = useState(false)
  const [transferToUsuarioId, setTransferToUsuarioId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')
  const [transferindoResponsavel, setTransferindoResponsavel] = useState(false)
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null)
  const [panelInternoAberto, setPanelInternoAberto] = useState(false)
  const [notaTexto, setNotaTexto] = useState('')
  const [adicionandoNota, setAdicionandoNota] = useState(false)
  const [textoResposta, setTextoResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [estadoOperacionalDraft, setEstadoOperacionalDraft] = useState<OperationalConversationState>('em_andamento')
  const [prazoOperacionalDraft, setPrazoOperacionalDraft] = useState('')
  const [leadStatusSyncDraft, setLeadStatusSyncDraft] = useState<LeadStatusSyncChoice>('manter')
  const [syncLeadStatusEnabled, setSyncLeadStatusEnabled] = useState(false)
  const [salvandoEstadoOperacional, setSalvandoEstadoOperacional] = useState(false)
  const [erroEstadoOperacional, setErroEstadoOperacional] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const humanLinkHandledRef = useRef<string | null>(null)
  const portalLinkHandledRef = useRef<string | null>(null)
  const shouldStickToBottomRef = useRef(true)
  const previousMessageCountRef = useRef(0)

  function notifyPendenciasChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('prevlegal:pendencias-changed'))
    }
  }

  function syncOperationalStateDraft(conversa: Conversa) {
    const currentLeadStatus = normalizeLeadKanbanStatus(conversa.leads?.status)
    setEstadoOperacionalDraft(
      normalizeOperationalConversationState(
        conversa.estado_operacional,
        conversa.status,
      ),
    )
    setPrazoOperacionalDraft(toDateTimeLocalValue(conversa.estado_operacional_prazo_at))
    setLeadStatusSyncDraft(currentLeadStatus || 'manter')
    setSyncLeadStatusEnabled(false)
    setErroEstadoOperacional(null)
  }

  const fetchConversas = useCallback(async () => {
    const res = await fetch('/api/conversas')
    if (res.ok) {
      const rawData = await res.json()
      const data = (rawData || []).map((conversa: Conversa) => ({
        ...conversa,
        status: normalizeInboxStatus(conversa.status),
      }))
      setConversas(data)
      setConversaSelecionada((prev) => {
        if (!prev) return prev
        return data.find((conversa: Conversa) => conversa.id === prev.id) || null
      })
      setLoading(false)
    }
  }, [])

  const fetchMensagens = useCallback(async (conversaId: string) => {
    const res = await fetch(`/api/conversas/${conversaId}`)
    if (res.ok) setMensagens(await res.json())
  }, [])

  const aplicarConversaAtualizada = useCallback((atualizada: Conversa) => {
    setConversas((prev) => prev.map((conversa) => (conversa.id === atualizada.id ? { ...conversa, ...atualizada } : conversa)))
    setConversaSelecionada((prev) => (prev?.id === atualizada.id ? { ...prev, ...atualizada } : prev))
  }, [])

  const aplicarLeadStatusAtualizado = useCallback((leadId: string, nextStatus: LeadKanbanStatus) => {
    setConversas((prev) =>
      prev.map((conversa) =>
        conversa.leads?.id === leadId
          ? {
              ...conversa,
              leads: conversa.leads ? { ...conversa.leads, status: nextStatus } : conversa.leads,
            }
          : conversa,
      ),
    )
    setConversaSelecionada((prev) =>
      prev?.leads?.id === leadId
        ? {
            ...prev,
            leads: prev.leads ? { ...prev.leads, status: nextStatus } : prev.leads,
          }
        : prev,
    )
  }, [])

  const atualizarConversa = useCallback(async (
    conversaId: string,
    payload: Record<string, unknown>,
    optimistic?: Partial<Conversa>,
  ) => {
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
      notifyPendenciasChanged()
      return atualizada as Conversa
    }

    await fetchConversas()
    return null
  }, [aplicarConversaAtualizada, fetchConversas])

  const selecionarConversa = useCallback(async (
    conversa: Conversa,
    options?: { syncUrl?: boolean },
  ) => {
    setThreadSelecionada(null)
    setMsgsPortal([])
    syncOperationalStateDraft(conversa)
    setConversaSelecionada(conversa)

    if (options?.syncUrl !== false) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      params.delete('leadId')
      params.set('conversaId', conversa.id)
      params.set('telefone', conversa.telefone)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    if (conversa.nao_lidas > 0) {
      await atualizarConversa(
        conversa.id,
        { action: 'mark_read' },
        { nao_lidas: 0 },
      )
    }
  }, [atualizarConversa, pathname, router, searchParams])

  const fetchThreadsPortal = useCallback(async () => {
    const res = await fetch('/api/portal/threads')
    if (res.ok) {
      const data = await res.json()
      const threads = data.threads || []
      setThreadsPortal(threads)
      setThreadSelecionada((prev) => {
        if (!prev) return prev
        return threads.find((item: ThreadPortal) => item.lead_id === prev.lead_id) || null
      })
    }
  }, [])

  const fetchUsuarios = useCallback(async () => {
    const res = await fetch('/api/usuarios')
    if (!res.ok) return

    const data = await res.json()
    const nextMap = Object.fromEntries(
      ((data.usuarios || []) as UsuarioResumo[]).map((usuario) => [usuario.id, usuario]),
    )
    setUsuariosMap(nextMap)
  }, [])

  const fetchDocumentosConversa = useCallback(async (conversaId: string) => {
    setLoadingDocumentosLead(true)

    try {
      const res = await fetch(`/api/conversas/${conversaId}/documentos`)
      if (!res.ok) {
        setDocumentosLead([])
        return
      }

      const data = await res.json()
      setDocumentosLead(data || [])
    } finally {
      setLoadingDocumentosLead(false)
    }
  }, [])

  const selecionarThreadPortal = useCallback((
    thread: ThreadPortal,
    options?: { syncUrl?: boolean },
  ) => {
    setConversaSelecionada(null)
    setMensagens([])
    setThreadSelecionada(thread)

    if (options?.syncUrl !== false) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('conversaId')
      params.delete('telefone')
      params.set('tab', 'portal')
      params.set('leadId', thread.lead_id)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const fetchInternoData = useCallback((leadId: string) =>
    fetch(`/api/leads/${leadId}/interno`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { setInternoData(null); return }
        setInternoData({
          thread: d.thread ?? null,
          tasks: d.tasks ?? [],
          mensagens: d.mensagens ?? [],
        })
      })
      .catch(() => setInternoData(null)), [])

  useEffect(() => {
    const loadInbox = async () => {
      await Promise.all([fetchConversas(), fetchThreadsPortal(), fetchUsuarios()])
    }

    void loadInbox()
  }, [fetchConversas, fetchThreadsPortal, fetchUsuarios])

  function selecionarAba(aba: AbaInbox) {
    setAbaAtiva(aba)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('conversaId')
    params.delete('telefone')
    params.delete('leadId')
    humanLinkHandledRef.current = null
    portalLinkHandledRef.current = null

    if (aba === 'todas') {
      params.delete('tab')
    } else {
      params.set('tab', aba)
    }

    if (aba === 'portal') {
      setConversaSelecionada(null)
      setMensagens([])
    } else {
      setThreadSelecionada(null)
      setMsgsPortal([])
    }

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false })
  }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab) {
      const timer = window.setTimeout(() => setAbaAtiva('todas'), 0)
      return () => window.clearTimeout(timer)
    }

    const abasValidas: AbaInbox[] = ['todas', 'agente', 'humano', 'aguardando_cliente', 'resolvido', 'portal']
    if (abasValidas.includes(tab as AbaInbox)) {
      const timer = window.setTimeout(() => setAbaAtiva(tab as AbaInbox), 0)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [searchParams])

  useEffect(() => {
    const conversaId = searchParams.get('conversaId')
    const telefone = searchParams.get('telefone')
    const token = `${conversaId || ''}:${telefone || ''}`
    if (!conversaId && !telefone) {
      humanLinkHandledRef.current = null
      return
    }

    const encontrada = conversas.find((conversa) => {
      if (conversaId && conversa.id === conversaId) return true
      if (telefone && samePhone(conversa.telefone, telefone)) return true
      return false
    })

    if (!encontrada) return

    if (humanLinkHandledRef.current === token && conversaSelecionada?.id === encontrada.id) {
      return
    }

    humanLinkHandledRef.current = token
    const timer = window.setTimeout(() => {
      setAbaAtiva('todas')
      void selecionarConversa(encontrada, { syncUrl: false })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [conversas, searchParams, conversaSelecionada?.id, selecionarConversa])

  useEffect(() => {
    const leadId = searchParams.get('leadId')
    if (!leadId) {
      portalLinkHandledRef.current = null
      return
    }

    const encontrada = threadsPortal.find((thread) => thread.lead_id === leadId)
    if (!encontrada) return

    if (portalLinkHandledRef.current === leadId && threadSelecionada?.lead_id === leadId) {
      return
    }

    portalLinkHandledRef.current = leadId
    const timer = window.setTimeout(() => {
      setAbaAtiva('portal')
      selecionarThreadPortal(encontrada, { syncUrl: false })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [threadsPortal, searchParams, threadSelecionada?.lead_id, selecionarThreadPortal])

  useEffect(() => {
    if (!conversaSelecionada || abaAtiva === 'portal') return

    const loadMensagens = async () => {
      await fetchMensagens(conversaSelecionada.id)
    }

    void loadMensagens()
  }, [conversaSelecionada, abaAtiva, fetchMensagens])

  useEffect(() => {
    const leadId = conversaSelecionada?.leads?.id
    if (!leadId) {
      const timer = window.setTimeout(() => {
        setInternoData(null)
        setDocumentosLead([])
        setLoadingDocumentosLead(false)
        setDocumentosPanelAberto(false)
        setDocumentoMensagem('')
        setErroDocumento(null)
        setTransferPanelAberto(false)
        setTransferToUsuarioId('')
        setTransferMotivo('')
        setErroTransferencia(null)
        setPanelInternoAberto(false)
      }, 0)
      return () => window.clearTimeout(timer)
    }

    const loadInterno = async () => {
      await Promise.all([
        fetchInternoData(leadId),
        fetchDocumentosConversa(conversaSelecionada.id),
      ])
    }

    void loadInterno()
  }, [conversaSelecionada, fetchDocumentosConversa, fetchInternoData])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      shouldStickToBottomRef.current = distanceToBottom < 80
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [conversaSelecionada?.id, threadSelecionada?.lead_id, abaAtiva])

  useEffect(() => {
    previousMessageCountRef.current = 0
    shouldStickToBottomRef.current = true
  }, [conversaSelecionada?.id, threadSelecionada?.lead_id, abaAtiva])

  useEffect(() => {
    const currentMessageCount = abaAtiva === 'portal' ? msgsPortal.length : mensagens.length
    const previousMessageCount = previousMessageCountRef.current
    const hasNewMessages = currentMessageCount > previousMessageCount

    if (
      currentMessageCount > 0 &&
      (previousMessageCount === 0 || (hasNewMessages && shouldStickToBottomRef.current))
    ) {
      messagesEndRef.current?.scrollIntoView({
        behavior: previousMessageCount === 0 ? 'auto' : 'smooth',
        block: 'end',
      })
    }

    previousMessageCountRef.current = currentMessageCount
  }, [mensagens, msgsPortal, abaAtiva])

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchConversas()
      if (conversaSelecionada && abaAtiva !== 'portal') {
        void fetchMensagens(conversaSelecionada.id)
      }
    }, 5000)

    const portalIv = setInterval(fetchThreadsPortal, 10000)
    return () => {
      clearInterval(interval)
      clearInterval(portalIv)
    }
  }, [conversaSelecionada, abaAtiva, fetchConversas, fetchMensagens, fetchThreadsPortal])

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
          notifyPendenciasChanged()
        })

    fetchMsgs()
    const iv = setInterval(fetchMsgs, 5000)
    return () => clearInterval(iv)
  }, [threadSelecionada])

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

  async function salvarEstadoOperacional() {
    if (!conversaSelecionada) return

    setSalvandoEstadoOperacional(true)
    setErroEstadoOperacional(null)

    const requiresDeadline = OPERATIONAL_STATE_META[estadoOperacionalDraft].requiresDeadline
    const prazoIso = fromDateTimeLocalValue(prazoOperacionalDraft)

    if (prazoOperacionalDraft && !prazoIso) {
      setErroEstadoOperacional('Prazo operacional inválido')
      setSalvandoEstadoOperacional(false)
      return
    }

    const optimistic: Partial<Conversa> = {
      estado_operacional: estadoOperacionalDraft,
      estado_operacional_prazo_at: requiresDeadline ? prazoIso : null,
      estado_operacional_atualizado_em: new Date().toISOString(),
    }

    const currentLeadStatus = normalizeLeadKanbanStatus(conversaSelecionada.leads?.status)
    const desiredLeadStatus =
      syncLeadStatusEnabled && leadStatusSyncDraft !== 'manter'
        ? leadStatusSyncDraft
        : null

    const atualizada = await atualizarConversa(
      conversaSelecionada.id,
      {
        action: 'set_operational_state',
        estado_operacional: estadoOperacionalDraft,
        estado_operacional_prazo_at: requiresDeadline ? prazoIso : null,
      },
      optimistic,
    )

    if (!atualizada) {
      setErroEstadoOperacional('Não foi possível salvar o estado operacional')
    } else {
      if (
        desiredLeadStatus &&
        conversaSelecionada.leads?.id &&
        desiredLeadStatus !== currentLeadStatus
      ) {
        const leadStatusRes = await fetch(`/api/leads/${conversaSelecionada.leads.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: desiredLeadStatus }),
        })

        if (leadStatusRes.ok) {
          aplicarLeadStatusAtualizado(conversaSelecionada.leads.id, desiredLeadStatus)
        } else {
          setErroEstadoOperacional('Estado salvo, mas não foi possível atualizar o status do lead')
        }
      }

      syncOperationalStateDraft(atualizada)
    }

    setSalvandoEstadoOperacional(false)
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
      notifyPendenciasChanged()
    } else {
      const data = await res.json().catch(() => null)
      setErroEnvio(data?.error || 'Nao foi possivel enviar a mensagem')
    }
    setEnviando(false)
  }

  async function compartilharDocumento(documentoId: string) {
    if (!conversaSelecionada) return

    setEnviandoDocumentoId(documentoId)
    setErroDocumento(null)

    const res = await fetch(`/api/conversas/${conversaSelecionada.id}/documentos/compartilhar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documento_id: documentoId,
        mensagem: documentoMensagem,
      }),
    })

    if (res.ok) {
      setDocumentoMensagem('')
      setDocumentosPanelAberto(false)
      await Promise.all([
        fetchMensagens(conversaSelecionada.id),
        fetchDocumentosConversa(conversaSelecionada.id),
      ])
      notifyPendenciasChanged()
    } else {
      const data = await res.json().catch(() => null)
      setErroDocumento(data?.error || 'Não foi possível compartilhar o documento')
    }

    setEnviandoDocumentoId(null)
  }

  async function transferirResponsabilidade() {
    const leadId = conversaSelecionada?.leads?.id
    if (!leadId || !transferToUsuarioId) return

    setTransferindoResponsavel(true)
    setErroTransferencia(null)

    const statusDestino = ['agente', 'humano', 'aguardando_cliente', 'resolvido'].includes(conversaSelecionada?.status || '')
      ? conversaSelecionada?.status
      : 'humano'

    const res = await fetch(`/api/leads/${leadId}/interno/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_usuario_id: transferToUsuarioId,
        motivo: transferMotivo,
        status_destino: statusDestino,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const currentOwner = data.current_owner || null

      setTransferMotivo('')
      setTransferPanelAberto(false)

      if (currentOwner?.id) {
        setTransferToUsuarioId(currentOwner.id)
      }

      setConversaSelecionada((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          assumido_por: currentOwner?.id || prev.assumido_por || null,
          leads: prev.leads
            ? {
                ...prev.leads,
                responsavel_id: currentOwner?.id || prev.leads.responsavel_id || null,
              }
            : prev.leads,
        }
      })

      await Promise.all([
        fetchConversas(),
        fetchInternoData(leadId),
      ])
      notifyPendenciasChanged()
    } else {
      const data = await res.json().catch(() => null)
      setErroTransferencia(data?.error || 'Não foi possível transferir a responsabilidade')
    }

    setTransferindoResponsavel(false)
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
      notifyPendenciasChanged()
    }
    setEnviandoPortal(false)
  }

  async function adicionarNota() {
    const leadId = conversaSelecionada?.leads?.id
    if (!notaTexto.trim() || !leadId) return
    setAdicionandoNota(true)
    await fetch(`/api/leads/${leadId}/interno/mensagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: notaTexto, tipo: 'comentario' }),
    })
    setNotaTexto('')
    await fetchInternoData(leadId)
    setAdicionandoNota(false)
  }

  async function concluirTask(taskId: string) {
    const leadId = conversaSelecionada?.leads?.id
    if (!leadId) return
    await fetch(`/api/leads/${leadId}/interno/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'concluida' }),
    })
    await fetchInternoData(leadId)
  }

  const conversasFiltradas = conversas.filter((conversa) => {
    const passaAba =
      abaAtiva === 'todas'
        ? true
        : abaAtiva === 'portal'
          ? false
          : normalizeInboxStatus(conversa.status) === abaAtiva

    if (!passaAba) return false

    if (leadStatusFiltro === 'todos') return true

    return normalizeLeadKanbanStatus(conversa.leads?.status) === leadStatusFiltro
  })

  useEffect(() => {
    if (!conversaSelecionada || abaAtiva === 'portal') return
    const aindaVisivel = conversasFiltradas.some((conversa) => conversa.id === conversaSelecionada.id)
    if (!aindaVisivel) {
      const timer = window.setTimeout(() => {
        setConversaSelecionada(null)
        setMensagens([])
      }, 0)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [abaAtiva, conversaSelecionada, conversasFiltradas])

  const badgePortal = threadsPortal.reduce((a, t) => a + t.nao_lidas, 0)
  const conversaGeridaPorHumano = conversaSelecionada ? STATUS_HUMANOS.has(conversaSelecionada.status) : false
  const podeResponderManual = conversaSelecionada?.status === 'humano'
  const estadoOperacionalSelecionado = conversaSelecionada
    ? normalizeOperationalConversationState(conversaSelecionada.estado_operacional, conversaSelecionada.status)
    : 'em_andamento'
  const estadoOperacionalSelecionadoMeta = OPERATIONAL_STATE_META[estadoOperacionalSelecionado]
  const prazoOperacionalSelecionadoFormatado = formatOperationalDeadline(
    conversaSelecionada?.estado_operacional_prazo_at,
  )
  const requiresDeadlineDraft = OPERATIONAL_STATE_META[estadoOperacionalDraft].requiresDeadline
  const suggestedLeadStatus = getSuggestedLeadStatusForOperationalState(estadoOperacionalDraft)
  const leadStatusSelecionado = normalizeLeadKanbanStatus(conversaSelecionada?.leads?.status)
  const suggestedLeadStatusMeta = suggestedLeadStatus ? LEAD_STATUS_META[suggestedLeadStatus] : null

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

  function getUsuarioNome(usuario?: UsuarioNomeLike | null) {
    if (!usuario) return null
    return usuario.nome || usuario.email || null
  }

  function getResponsavelConversa(conversa?: Conversa | null) {
    const responsavelId = conversa?.leads?.responsavel_id || null
    if (!responsavelId) return null
    return usuariosMap[responsavelId] || null
  }

  function formatFileSize(size?: number | null) {
    if (!size || size <= 0) return null
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    if (size >= 1024) return `${Math.round(size / 1024)} KB`
    return `${size} B`
  }

  function renderConversationPanel() {
    if (!conversaSelecionada) return null

    const responsavelConversa = getResponsavelConversa(conversaSelecionada)
    const responsavelLabel = getUsuarioNome(internoData?.thread?.current_owner || responsavelConversa)
    const leadStatus = normalizeLeadKanbanStatus(conversaSelecionada.leads?.status)
    const leadStatusMeta = leadStatus ? LEAD_STATUS_META[leadStatus] : null
    const documentosPreview = documentosLead.slice(0, 3)
    const usuariosTransferiveis = Object.values(usuariosMap)
      .filter((usuario) => usuario.id !== (internoData?.thread?.current_owner?.id || conversaSelecionada.leads?.responsavel_id || null))
      .sort((a, b) => (getUsuarioNome(a) || '').localeCompare(getUsuarioNome(b) || '', 'pt-BR'))

    return (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: estadoOperacionalSelecionadoMeta.bg, color: estadoOperacionalSelecionadoMeta.color, fontWeight: '700', fontFamily: 'DM Sans, sans-serif' }}>
                Estado operacional: {OPERATIONAL_STATE_LABELS[estadoOperacionalSelecionado]}
              </span>
              {leadStatusMeta ? (
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: leadStatusMeta.bg, color: leadStatusMeta.color, fontWeight: '700', fontFamily: 'DM Sans, sans-serif' }}>
                  Status do lead: {leadStatusMeta.label}
                </span>
              ) : null}
              {responsavelLabel ? (
                <button
                  type="button"
                  onClick={() => {
                    setTransferPanelAberto((current) => !current)
                    setTransferToUsuarioId('')
                    setTransferMotivo('')
                    setErroTransferencia(null)
                  }}
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(79,122,255,0.12)', color: '#7ea2ff', fontWeight: '700', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid rgba(79,122,255,0.2)', cursor: 'pointer' }}
                >
                  <UserCheck size={11} /> Com {responsavelLabel}
                </button>
              ) : null}
              {prazoOperacionalSelecionadoFormatado ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                  Prazo: {prazoOperacionalSelecionadoFormatado}
                </span>
              ) : null}
            </div>
            {transferPanelAberto ? (
              <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(79,122,255,0.18)', background: 'rgba(79,122,255,0.06)', display: 'grid', gap: '8px', maxWidth: '360px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#7ea2ff', fontFamily: 'DM Sans, sans-serif' }}>
                    Transferir responsabilidade aqui
                  </span>
                  {internoData?.thread?.current_owner?.nome ? (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      Atual: {internoData.thread.current_owner.nome}
                    </span>
                  ) : null}
                </div>
                <select
                  value={transferToUsuarioId}
                  onChange={(e) => setTransferToUsuarioId(e.target.value)}
                  style={{ ...inputStyle, fontSize: '12px', padding: '9px 12px' }}
                >
                  <option value="">Escolha quem assume</option>
                  {usuariosTransferiveis.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {getUsuarioNome(usuario) || usuario.id}
                    </option>
                  ))}
                </select>
                <input
                  value={transferMotivo}
                  onChange={(e) => setTransferMotivo(e.target.value)}
                  placeholder="Motivo opcional da transferência"
                  style={{ ...inputStyle, fontSize: '12px', padding: '9px 12px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferPanelAberto(false)
                      setErroTransferencia(null)
                    }}
                    style={{ padding: '8px 12px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void transferirResponsabilidade()}
                    disabled={!transferToUsuarioId || transferindoResponsavel}
                    style={{ padding: '8px 12px', background: !transferToUsuarioId || transferindoResponsavel ? 'var(--bg-hover)' : 'var(--accent)', color: !transferToUsuarioId || transferindoResponsavel ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: '8px', cursor: !transferToUsuarioId || transferindoResponsavel ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {transferindoResponsavel ? 'Transferindo...' : 'Transferir'}
                  </button>
                </div>
                {erroTransferencia ? (
                  <p style={{ margin: 0, color: '#ff6b6b', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                    {erroTransferencia}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>
                Estado operacional
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={estadoOperacionalDraft}
                  onChange={(event) => {
                    const nextValue = event.target.value as OperationalConversationState
                    setEstadoOperacionalDraft(nextValue)
                    if (!OPERATIONAL_STATE_META[nextValue].requiresDeadline) {
                      setPrazoOperacionalDraft('')
                    }
                    const nextSuggestion = getSuggestedLeadStatusForOperationalState(nextValue)
                    if (nextSuggestion) {
                      setLeadStatusSyncDraft(nextSuggestion)
                      setSyncLeadStatusEnabled(nextSuggestion !== normalizeLeadKanbanStatus(conversaSelecionada.leads?.status))
                    } else if (nextValue === 'encerrado') {
                      setLeadStatusSyncDraft('manter')
                      setSyncLeadStatusEnabled(false)
                    } else {
                      setLeadStatusSyncDraft('manter')
                      setSyncLeadStatusEnabled(false)
                    }
                  }}
                  style={{
                    ...inputStyle,
                    minWidth: '220px',
                    height: '40px',
                    padding: '0 12px',
                  }}
                >
                  {OPERATIONAL_CONVERSATION_STATES.map((state) => (
                    <option key={state} value={state}>
                      {OPERATIONAL_STATE_LABELS[state]}
                    </option>
                  ))}
                </select>
                {requiresDeadlineDraft ? (
                  <input
                    type="datetime-local"
                    value={prazoOperacionalDraft}
                    onChange={(event) => setPrazoOperacionalDraft(event.target.value)}
                    style={{
                      ...inputStyle,
                      height: '40px',
                      minWidth: '220px',
                      padding: '0 12px',
                    }}
                  />
                ) : null}
                <button
                  onClick={() => void salvarEstadoOperacional()}
                  disabled={salvandoEstadoOperacional}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: 'DM Sans, sans-serif',
                    cursor: salvandoEstadoOperacional ? 'wait' : 'pointer',
                    opacity: salvandoEstadoOperacional ? 0.75 : 1,
                  }}
                >
                  {salvandoEstadoOperacional ? 'Salvando...' : 'Salvar estado'}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                {OPERATIONAL_STATE_META[estadoOperacionalDraft].hint}
              </p>
              {suggestedLeadStatusMeta && suggestedLeadStatus ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={syncLeadStatusEnabled}
                    onChange={(event) => setSyncLeadStatusEnabled(event.target.checked)}
                  />
                  Atualizar também o status do lead para
                  <span style={{ padding: '3px 8px', borderRadius: '999px', background: suggestedLeadStatusMeta.bg, color: suggestedLeadStatusMeta.color, fontWeight: '700' }}>
                    {suggestedLeadStatusMeta.label}
                  </span>
                </label>
              ) : null}
              {estadoOperacionalDraft === 'encerrado' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                    Refletir no kanban:
                  </span>
                  <select
                    value={leadStatusSyncDraft}
                    onChange={(event) => {
                      const nextValue = event.target.value as LeadStatusSyncChoice
                      setLeadStatusSyncDraft(nextValue)
                      setSyncLeadStatusEnabled(nextValue !== 'manter')
                    }}
                    style={{ ...inputStyle, fontSize: '12px', padding: '8px 10px', minWidth: '190px' }}
                  >
                    <option value="manter">Manter status atual</option>
                    <option value="lost">Marcar como Perdido</option>
                    <option value="converted">Marcar como Convertido</option>
                  </select>
                  {leadStatusSelecionado ? (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      Atual: {LEAD_STATUS_META[leadStatusSelecionado].label}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {estadoOperacionalDraft === 'agendado' ? (
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                  Isso cria um lembrete operacional na inbox/notificações. Ainda não cria um agendamento real na agenda do responsável.
                </p>
              ) : null}
              {erroEstadoOperacional ? (
                <p style={{ margin: 0, fontSize: '11px', color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif' }}>
                  {erroEstadoOperacional}
                </p>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
        </div>

        {internoData && conversaSelecionada.leads?.id && (() => {
          const tasksAbertas = internoData.tasks.filter(t => t.status === 'aberta' || t.status === 'em_andamento').length
          const ultimaNota = internoData.mensagens.find(m => m.tipo === 'comentario')
          const owner = internoData.thread?.current_owner
          if (!owner && tasksAbertas === 0 && !ultimaNota) return null
          return (
            <button
              onClick={() => setPanelInternoAberto(o => !o)}
              style={{ padding: '7px 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--border)', background: panelInternoAberto ? 'rgba(79,122,255,0.08)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={12} color="var(--accent)" />
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>Coordenação interna</span>
              </div>
              {owner && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'DM Sans, sans-serif' }}>
                  <UserCheck size={11} /> <strong style={{ color: 'var(--text-secondary)' }}>{owner.nome}</strong>
                </span>
              )}
              {tasksAbertas > 0 && (
                <span style={{ fontSize: '11px', background: '#f59e0b20', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>
                  {tasksAbertas} task{tasksAbertas > 1 ? 's' : ''}
                </span>
              )}
              {ultimaNota && !panelInternoAberto && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif' }}>
                  &ldquo;{ultimaNota.mensagem}&rdquo;
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif' }}>
                {panelInternoAberto ? '▲ Fechar' : '▼ Abrir'}
              </span>
            </button>
          )
        })()}

        {conversaSelecionada.leads?.id && (
          <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: documentosPreview.length > 0 || loadingDocumentosLead ? '10px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <FileText size={13} color="var(--accent)" />
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
                  Documentos do lead
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                  {loadingDocumentosLead ? 'carregando...' : `${documentosLead.length} arquivo(s)`}
                </span>
              </div>
              <a href={`/leads/${conversaSelecionada.leads.id}#documentos`} style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', fontWeight: '500', fontFamily: 'DM Sans, sans-serif' }}>
                Ver lead →
              </a>
            </div>

            {!loadingDocumentosLead && documentosLead.length === 0 ? (
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                Nenhum documento vinculado a este lead ainda.
              </p>
            ) : null}

            {documentosPreview.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documentosPreview.map((doc) => {
                  const processingMeta = doc.processing_status ? PROCESSING_STATUS_LABEL[doc.processing_status] : null
                  const fileSize = formatFileSize(doc.arquivo_tamanho)

                  return (
                    <a
                      key={doc.id}
                      href={doc.arquivo_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--bg-card)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.nome || doc.arquivo_nome}
                          </span>
                          {processingMeta ? (
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '999px', background: processingMeta.bg, color: processingMeta.color, fontWeight: '700', fontFamily: 'DM Sans, sans-serif' }}>
                              {processingMeta.label}
                            </span>
                          ) : null}
                        </div>
                        <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                          {[doc.arquivo_nome, fileSize].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <ExternalLink size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    </a>
                  )
                })}
              </div>
            ) : null}
          </div>
        )}

        <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setDocumentosPanelAberto((current) => !current)
                    setErroDocumento(null)
                  }}
                  type="button"
                  style={{ padding: '8px 12px', background: documentosPanelAberto ? 'rgba(79,122,255,0.16)' : 'var(--bg-card)', color: documentosPanelAberto ? '#7ea2ff' : 'var(--text-secondary)', border: documentosPanelAberto ? '1px solid rgba(79,122,255,0.35)' : '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}
                >
                  <FileText size={14} /> {documentosPanelAberto ? 'Fechar documentos' : 'Documentos'}
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                  V1 segura: envia o arquivo como link assinado no WhatsApp.
                </span>
              </div>

              {documentosPanelAberto ? (
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-card)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
                      Compartilhar documento com o cliente
                    </span>
                    {conversaSelecionada.leads?.id ? (
                      <a href={`/leads/${conversaSelecionada.leads.id}#documentos`} style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', fontWeight: '500', fontFamily: 'DM Sans, sans-serif' }}>
                        Ver lead para subir novo arquivo →
                      </a>
                    ) : null}
                  </div>

                  <input
                    value={documentoMensagem}
                    onChange={(e) => setDocumentoMensagem(e.target.value)}
                    placeholder="Mensagem opcional antes do link do documento"
                    style={{ ...inputStyle, fontSize: '12px', padding: '9px 12px' }}
                  />

                  {loadingDocumentosLead ? (
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      Carregando documentos...
                    </p>
                  ) : documentosLead.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      Este lead ainda não tem documento disponível para compartilhar.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {documentosLead.map((doc) => (
                        <div key={doc.id} style={{ border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.nome || doc.arquivo_nome}
                            </p>
                            <p style={{ margin: '3px 0 0', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                              {doc.arquivo_nome}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void compartilharDocumento(doc.id)}
                            disabled={enviandoDocumentoId === doc.id}
                            style={{ padding: '8px 10px', background: 'rgba(79,122,255,0.16)', color: '#7ea2ff', border: '1px solid rgba(79,122,255,0.3)', borderRadius: '8px', cursor: enviandoDocumentoId === doc.id ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: 'DM Sans, sans-serif', flexShrink: 0, opacity: enviandoDocumentoId === doc.id ? 0.7 : 1 }}
                          >
                            {enviandoDocumentoId === doc.id ? 'Enviando...' : 'Enviar'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {erroDocumento ? (
                    <p style={{ margin: 0, color: '#ff6b6b', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                      {erroDocumento}
                    </p>
                  ) : null}
                </div>
              ) : null}

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
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '340px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--accent)" /> Caixa de Entrada
          </h1>
          <div
            data-tour="inbox-filtros"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
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
                onClick={() => selecionarAba(aba.id as AbaInbox)}
                style={{
                  width: '100%',
                  minHeight: '36px',
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
                  textAlign: 'center',
                  lineHeight: 1.2,
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
          {abaAtiva !== 'portal' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                Status do kanban:
              </span>
              {LEAD_STATUS_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLeadStatusFiltro(option.id)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: leadStatusFiltro === option.id ? '700' : '500',
                    color: leadStatusFiltro === option.id ? '#fff' : 'var(--text-muted)',
                    background: leadStatusFiltro === option.id ? 'var(--accent)' : 'var(--bg-card)',
                    border: leadStatusFiltro === option.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    lineHeight: 1.2,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
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
                  onClick={() => selecionarThreadPortal(t)}
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
                const estadoOperacional = normalizeOperationalConversationState(conversa.estado_operacional, conversa.status)
                const estadoOperacionalMeta = OPERATIONAL_STATE_META[estadoOperacional]
                const leadStatus = normalizeLeadKanbanStatus(conversa.leads?.status)
                const leadStatusMeta = leadStatus ? LEAD_STATUS_META[leadStatus] : null
                const responsavelLabel = getUsuarioNome(getResponsavelConversa(conversa))
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                        {leadStatusMeta ? (
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: leadStatusMeta.bg, color: leadStatusMeta.color, fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {leadStatusMeta.label}
                          </span>
                        ) : null}
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: estadoOperacionalMeta.bg, color: estadoOperacionalMeta.color, fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {OPERATIONAL_STATE_LABELS[estadoOperacional]}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: st.bg, color: st.color, fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                    </div>
                    {conversa.leads?.nb && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '2px', marginBottom: 0 }}>
                        NB {conversa.leads.nb}
                      </p>
                    )}
                    {responsavelLabel ? (
                      <p style={{ fontSize: '10px', color: '#7ea2ff', fontFamily: 'DM Sans, sans-serif', marginTop: '4px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <UserCheck size={10} /> Com {responsavelLabel}
                      </p>
                    ) : null}
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
      ) : renderConversationPanel()}

      {panelInternoAberto && internoData && conversaSelecionada && abaAtiva !== 'portal' && (
        <div style={{ width: '272px', flexShrink: 0, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>Coordenação interna</span>
            </div>
            {conversaSelecionada.leads?.id && (
              <a href={`/leads/${conversaSelecionada.leads.id}#interno`} style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>
                Ver lead →
              </a>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Dono */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'DM Sans, sans-serif' }}>Responsável</p>
              <span style={{ fontSize: '12px', color: internoData.thread?.current_owner ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <UserCheck size={12} color="var(--accent)" />
                {internoData.thread?.current_owner?.nome ?? 'Sem responsável'}
              </span>
            </div>

            {/* Tasks */}
            {internoData.tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'DM Sans, sans-serif' }}>Tasks</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {internoData.tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <button
                        onClick={() => void concluirTask(task.id)}
                        title="Marcar como concluída"
                        style={{ marginTop: '1px', width: '15px', height: '15px', borderRadius: '3px', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.3', wordBreak: 'break-word' }}>{task.titulo}</p>
                        {task.assigned_to_usuario && (
                          <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>→ {task.assigned_to_usuario.nome}</p>
                        )}
                      </div>
                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', background: task.prioridade === 'alta' ? '#ff6b6b20' : task.prioridade === 'media' ? '#f59e0b20' : '#4a506020', color: task.prioridade === 'alta' ? '#ff6b6b' : task.prioridade === 'media' ? '#f59e0b' : 'var(--text-muted)', fontWeight: '600', flexShrink: 0 }}>
                        {task.prioridade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas recentes */}
            {internoData.mensagens.filter(m => m.tipo === 'comentario').length > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'DM Sans, sans-serif' }}>Notas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {internoData.mensagens.filter(m => m.tipo === 'comentario').slice(0, 4).map(msg => (
                    <div key={msg.id} style={{ padding: '7px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 3px', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.mensagem}</p>
                      <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                        {msg.autor?.nome ?? 'Sistema'} · {formatTime(msg.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick note */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <textarea
              value={notaTexto}
              onChange={e => setNotaTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) void adicionarNota() }}
              placeholder="Adicionar nota interna... (⌘Enter)"
              rows={2}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
            <button
              onClick={() => void adicionarNota()}
              disabled={adicionandoNota || !notaTexto.trim()}
              style={{ marginTop: '6px', width: '100%', padding: '7px', background: notaTexto.trim() ? 'var(--accent)' : 'var(--bg-hover)', color: notaTexto.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: notaTexto.trim() ? 'pointer' : 'not-allowed' }}
            >
              {adicionandoNota ? 'Salvando...' : 'Adicionar nota'}
            </button>
          </div>
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
