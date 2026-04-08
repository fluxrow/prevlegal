'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  User,
  UserCog,
  Video,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AgendamentosOnboardingTour from '@/components/agendamentos-onboarding-tour'
import NovoAgendamentoModal from '@/components/novo-agendamento-modal'
import { buildInboxHref, buildWhatsAppHref } from '@/lib/contact-shortcuts'

interface Agendamento {
  id: string
  data_hora: string
  duracao_minutos: number
  status: string
  observacoes: string | null
  honorario: number | null
  google_event_id: string | null
  meet_link: string | null
  calendar_owner_scope?: 'tenant' | 'user' | null
  calendar_owner_email?: string | null
  leads: { id: string; nome: string; telefone: string; banco?: string } | null
  usuarios: { id: string; nome: string } | null
}

interface UsuarioOpcao {
  id: string
  nome: string
  googleCalendarConnected?: boolean
  googleCalendarEmail?: string | null
}

interface GoogleConnectionStatus {
  currentUser: { connected: boolean; email: string | null; connectedAt: string | null }
  tenantDefault: { connected: boolean; email: string | null; connectedAt: string | null }
  effective: { connected: boolean; source: 'user' | 'tenant' | 'none'; email: string | null }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  agendado: { label: 'Agendado', color: 'text-blue-400 bg-blue-400/10' },
  confirmado: { label: 'Confirmado', color: 'text-cyan-300 bg-cyan-400/10' },
  remarcado: { label: 'Remarcado', color: 'text-amber-300 bg-amber-400/10' },
  realizado: { label: 'Realizado', color: 'text-emerald-400 bg-emerald-400/10' },
  cancelado: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10' },
}

const STATUS_CALENDAR_STYLES: Record<string, { badge: string; dot: string; border: string }> = {
  agendado: { badge: 'bg-blue-500/12 text-blue-300', dot: 'bg-blue-400', border: 'border-blue-500/20' },
  confirmado: { badge: 'bg-cyan-500/12 text-cyan-200', dot: 'bg-cyan-300', border: 'border-cyan-500/20' },
  remarcado: { badge: 'bg-amber-500/12 text-amber-200', dot: 'bg-amber-300', border: 'border-amber-500/20' },
  realizado: { badge: 'bg-emerald-500/12 text-emerald-200', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
  cancelado: { badge: 'bg-red-500/12 text-red-200', dot: 'bg-red-400', border: 'border-red-500/20' },
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function toLocalDateTimeValue(iso: string) {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}

const PAGE_SHELL_STYLE: React.CSSProperties = {
  background:
    'radial-gradient(circle at top left, var(--accent-glow), transparent 28%), linear-gradient(180deg, var(--bg) 0%, var(--bg) 100%)',
}

const HERO_CARD_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-card) 100%)',
  border: '1px solid var(--border)',
  boxShadow: '0 22px 60px rgba(15, 23, 42, 0.10)',
}

const SURFACE_CARD_STYLE: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.08)',
}

const EMPHASIS_CARD_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-card) 100%)',
  border: '1px solid var(--border)',
  boxShadow: '0 20px 56px rgba(15, 23, 42, 0.10)',
}

type RailSection = {
  key: string
  title: string
  description: string
  items: Agendamento[]
  tone: string
  bg: string
}

export default function AgendamentosPage() {
  const searchParams = useSearchParams()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novaDataHora, setNovaDataHora] = useState('')
  const [novaDuracaoMinutos, setNovaDuracaoMinutos] = useState('30')
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)

  useEffect(() => {
    const googleTarget = searchParams.get('google_target')
    if (searchParams.get('google') === 'conectado') {
      toast.success(
        googleTarget === 'tenant'
          ? 'Calendário padrão do escritório conectado com sucesso!'
          : 'Seu Google Calendar foi conectado com sucesso!',
      )
      void checkGoogle()
    }
    if (searchParams.get('google') === 'erro') {
      toast.error(
        googleTarget === 'tenant'
          ? 'Erro ao conectar o calendário do escritório. Tente novamente.'
          : 'Erro ao conectar seu Google Calendar. Tente novamente.',
      )
    }
    if (searchParams.get('google') === 'forbidden') {
      toast.error('Apenas admins podem conectar o calendário padrão do escritório.')
    }
  }, [searchParams])

  useEffect(() => {
    void load()
    void checkGoogle()
    void loadUsuarios()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/agendamentos')
      if (!res.ok) throw new Error()
      setAgendamentos(await res.json())
    } catch {
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  async function checkGoogle() {
    try {
      const res = await fetch('/api/google/status')
      if (!res.ok) {
        setGoogleStatus({
          currentUser: { connected: false, email: null, connectedAt: null },
          tenantDefault: { connected: false, email: null, connectedAt: null },
          effective: { connected: false, source: 'none', email: null },
        })
        return
      }
      setGoogleStatus(await res.json())
    } catch {
      setGoogleStatus({
        currentUser: { connected: false, email: null, connectedAt: null },
        tenantDefault: { connected: false, email: null, connectedAt: null },
        effective: { connected: false, source: 'none', email: null },
      })
    }
  }

  async function loadUsuarios() {
    try {
      const res = await fetch('/api/usuarios')
      if (!res.ok) return
      const data = await res.json()
      setUsuarios(
        (data.usuarios || [])
          .filter((usuario: { ativo: boolean }) => usuario.ativo)
          .map((usuario: {
            id: string
            nome: string
            google_calendar_connected_at?: string | null
            google_calendar_email?: string | null
          }) => ({
            id: usuario.id,
            nome: usuario.nome,
            googleCalendarConnected: Boolean(usuario.google_calendar_connected_at),
            googleCalendarEmail: usuario.google_calendar_email || null,
          })),
      )
      setRole(data.role || null)
    } catch {
      setUsuarios([])
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      setSavingId(id)
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(
        status === 'realizado'
          ? 'Marcado como realizado'
          : status === 'confirmado'
            ? 'Agendamento confirmado'
            : 'Status atualizado',
      )
      await load()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setSavingId(null)
    }
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar este agendamento? O evento será removido do Google Calendar.')) return
    await updateStatus(id, 'cancelado')
  }

  async function reatribuirResponsavel(id: string, usuario_id: string) {
    try {
      setSavingId(id)
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id }),
      })
      if (!res.ok) throw new Error()
      toast.success('Responsável atualizado')
      await load()
    } catch {
      toast.error('Erro ao atualizar responsável')
    } finally {
      setSavingId(null)
    }
  }

  function iniciarRemarcacao(ag: Agendamento) {
    setEditandoId(ag.id)
    setNovaDataHora(toLocalDateTimeValue(ag.data_hora))
    setNovaDuracaoMinutos(String(ag.duracao_minutos))
    setSelectedAgendamento(ag)
  }

  async function salvarRemarcacao(id: string) {
    if (!novaDataHora) return

    try {
      setSavingId(id)
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_hora: new Date(novaDataHora).toISOString(),
          duracao_minutos: Number(novaDuracaoMinutos || 30),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Agendamento remarcado')
      setEditandoId(null)
      await load()
    } catch {
      toast.error('Erro ao remarcar agendamento')
    } finally {
      setSavingId(null)
    }
  }

  const statusFilter = searchParams.get('status')
  const pendentesConfirmacao = agendamentos.filter((ag) => ['agendado', 'remarcado'].includes(ag.status))
  const confirmados = agendamentos.filter((ag) => ag.status === 'confirmado')
  const finalizados = agendamentos.filter((ag) => ['realizado', 'cancelado'].includes(ag.status))
  const showPendentes = !statusFilter || statusFilter === 'pendentes'
  const showConfirmados = !statusFilter || statusFilter === 'confirmados'
  const showFinalizados = !statusFilter || statusFilter === 'finalizados'
  const statusCards = [
    { label: 'Pedem ação', value: pendentesConfirmacao.length, tone: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    { label: 'Confirmados', value: confirmados.length, tone: 'var(--green)', bg: 'var(--green-bg)' },
    { label: 'Histórico', value: finalizados.length, tone: 'var(--text-secondary)', bg: 'var(--bg-hover)' },
    {
      label: 'Google ativo',
      value: googleStatus?.effective.connected ? (googleStatus.effective.source === 'user' ? 'Meu' : 'Escritório') : 'Não',
      tone: googleStatus?.effective.connected ? 'var(--accent)' : 'var(--text-secondary)',
      bg: googleStatus?.effective.connected ? 'var(--accent-glow)' : 'var(--bg-hover)',
    },
  ]

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  })

  function agendamentosDoDia(day: Date) {
    return agendamentos
      .filter((ag) => isSameDay(parseISO(ag.data_hora), day))
      .sort((a, b) => parseISO(a.data_hora).getTime() - parseISO(b.data_hora).getTime())
  }

  function renderAgendamentoDetail(ag: Agendamento, compact = false) {
    const statusInfo = STATUS_LABELS[ag.status] ?? { label: ag.status, color: 'text-slate-400 bg-slate-400/10' }
    const statusCalendar = STATUS_CALENDAR_STYLES[ag.status] ?? STATUS_CALENDAR_STYLES.agendado
    const calendarOwnerLabel = ag.calendar_owner_scope === 'user' ? 'Calendário do responsável' : 'Calendário do escritório'
    const date = parseISO(ag.data_hora)
    const urgente = ag.status !== 'realizado' && ag.status !== 'cancelado' && (isToday(date) || isPast(date))
    const inboxHref = buildInboxHref({ telefone: ag.leads?.telefone })
    const whatsappHref = buildWhatsAppHref(ag.leads?.telefone)

    return (
      <div
        className={`rounded-2xl border p-4 transition-all ${compact ? '' : 'hover:-translate-y-0.5'}`}
        style={{
          ...SURFACE_CARD_STYLE,
          borderColor: urgente ? 'rgba(245, 200, 66, 0.28)' : 'var(--border)',
        }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-center w-14">
            <div className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
              {format(date, 'dd')}
            </div>
            <div className="text-xs uppercase mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {format(date, 'MMM', { locale: ptBR })}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {format(date, 'HH:mm')}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusCalendar.badge} ${statusCalendar.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusCalendar.dot}`} />
                {calendarOwnerLabel}
              </span>
              {urgente ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: 'var(--yellow)', background: 'var(--yellow-bg)' }}>
                  Precisa atenção
                </span>
              ) : null}
              {ag.honorario ? (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  R$ {ag.honorario.toLocaleString('pt-BR')}
                </span>
              ) : null}
            </div>

            {ag.leads ? (
              <div className="flex items-center gap-1 mt-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <User className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                {ag.leads.nome}
                {ag.leads.telefone ? (
                  <span className="font-normal text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>· {ag.leads.telefone}</span>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Clock className="w-3 h-3" />
                {ag.duracao_minutos} min
              </span>
              {ag.meet_link ? (
                <a
                  href={ag.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <Video className="w-3 h-3" />
                  Google Meet
                </a>
              ) : null}
              {ag.usuarios ? (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {ag.usuarios.nome}
                </span>
              ) : null}
            </div>

            {role === 'admin' && usuarios.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <UserCog className="w-3 h-3" />
                  Responsável
                </span>
                <select
                  value={ag.usuarios?.id || ''}
                  onChange={(e) => void reatribuirResponsavel(ag.id, e.target.value)}
                  disabled={savingId === ag.id}
                  className="rounded-md px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecionar</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {ag.leads?.telefone ? (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <a
                  href={inboxHref}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{ border: '1px solid rgba(79,122,255,0.2)', background: 'var(--accent-glow)', color: 'var(--accent)' }}
                >
                  <MessageSquare className="w-3 h-3" />
                  Abrir conversa
                </a>
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                    style={{ border: '1px solid rgba(45,212,160,0.18)', background: 'var(--green-bg)', color: 'var(--green)' }}
                  >
                    <Send className="w-3 h-3" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}

            {editandoId === ag.id ? (
              <div className="mt-3 rounded-xl p-3" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Remarcar reunião
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="datetime-local"
                    value={novaDataHora}
                    onChange={(e) => setNovaDataHora(e.target.value)}
                    className="rounded-md px-3 py-2 text-xs outline-none"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={novaDuracaoMinutos}
                    onChange={(e) => setNovaDuracaoMinutos(e.target.value)}
                    className="w-28 rounded-md px-3 py-2 text-xs outline-none"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={() => void salvarRemarcacao(ag.id)}
                    disabled={savingId === ag.id}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-white transition-colors disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}

            {ag.observacoes ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{ag.observacoes}</p>
            ) : null}
          </div>

          {!['realizado', 'cancelado'].includes(ag.status) ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              {['agendado', 'remarcado'].includes(ag.status) ? (
                <button
                  onClick={() => void updateStatus(ag.id, 'confirmado')}
                  disabled={savingId === ag.id}
                  className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Confirmar"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              ) : null}
              <button
                onClick={() => iniciarRemarcacao(ag)}
                disabled={savingId === ag.id}
                className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
                title="Remarcar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => void updateStatus(ag.id, 'realizado')}
                disabled={savingId === ag.id}
                className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
                title="Marcar como realizado"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => void cancelar(ag.id)}
                disabled={savingId === ag.id}
                className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
                title="Cancelar"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  function renderLista(lista: Agendamento[], titulo: string, descricao: string) {
    if (lista.length === 0) return null

    return (
      <div className="mb-8 rounded-[24px] p-5" style={SURFACE_CARD_STYLE}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{titulo}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{descricao}</p>
          </div>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {lista.length}
          </span>
        </div>
        <div className="space-y-3">
          {lista.map((ag) => (
            <div key={ag.id} onClick={() => setSelectedAgendamento(ag)} className="cursor-pointer">
              {renderAgendamentoDetail(ag)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderSidebarCard(ag: Agendamento) {
    const date = parseISO(ag.data_hora)
    const statusInfo = STATUS_LABELS[ag.status] ?? { label: ag.status, color: 'text-slate-400 bg-slate-400/10' }
    const calendarOwnerLabel = ag.calendar_owner_scope === 'user' ? 'Calendário do responsável' : 'Calendário do escritório'
    const urgente = ag.status !== 'realizado' && ag.status !== 'cancelado' && (isToday(date) || isPast(date))

    return (
      <button
        key={ag.id}
        onClick={() => setSelectedAgendamento(ag)}
        className="w-full rounded-2xl p-3 text-left transition-all hover:-translate-y-0.5"
        style={SURFACE_CARD_STYLE}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 flex-shrink-0 text-center">
            <div className="text-2xl font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
              {format(date, 'dd')}
            </div>
            <div className="mt-0.5 text-[11px] uppercase" style={{ color: 'var(--text-secondary)' }}>
              {format(date, 'MMM', { locale: ptBR })}
            </div>
            <div className="mt-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {format(date, 'HH:mm')}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {urgente ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: 'var(--yellow)', background: 'var(--yellow-bg)' }}>
                  Hoje
                </span>
              ) : null}
            </div>

            <div className="mt-2 truncate text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {ag.leads?.nome || 'Agendamento'}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {ag.duracao_minutos} min
              </span>
              <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
                {calendarOwnerLabel}
              </span>
            </div>

            {ag.observacoes ? (
              <p className="mt-2 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {ag.observacoes}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    )
  }

  function renderRailSection(section: RailSection) {
    return (
      <section key={section.key} className="rounded-[24px] p-4" style={SURFACE_CARD_STYLE}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: section.tone }}>
              {section.title}
            </div>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
              {section.description}
            </p>
          </div>
          <span
            className="inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: section.bg, color: section.tone }}
          >
            {section.items.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {section.items.length > 0 ? (
            section.items.map((ag) => renderSidebarCard(ag))
          ) : (
            <div
              className="rounded-2xl border border-dashed px-4 py-6 text-center text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg)' }}
            >
              Nada nesta fila agora.
            </div>
          )}
        </div>
      </section>
    )
  }

  const railSections: RailSection[] = [
    {
      key: 'pendentes',
      title: 'Precisa confirmação',
      description: 'Novos ou remarcados que ainda pedem ação humana.',
      items: pendentesConfirmacao,
      tone: 'var(--yellow)',
      bg: 'var(--yellow-bg)',
    },
    {
      key: 'confirmados',
      title: 'Confirmados',
      description: 'Compromissos já validados e prontos para acontecer.',
      items: confirmados,
      tone: 'var(--green)',
      bg: 'var(--green-bg)',
    },
    {
      key: 'historico',
      title: 'Histórico recente',
      description: 'Realizados ou cancelados para leitura rápida.',
      items: finalizados.slice(0, 4),
      tone: 'var(--text-secondary)',
      bg: 'var(--bg-hover)',
    },
  ]

  const railFocus = selectedAgendamento
    || pendentesConfirmacao[0]
    || confirmados[0]
    || finalizados[0]
    || null

  return (
    <div className="mx-auto max-w-[1680px] p-6 md:p-8" style={PAGE_SHELL_STYLE}>
      <div className="mb-6 rounded-[28px] p-5 md:p-6" style={HERO_CARD_STYLE}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              <Calendar className="w-3.5 h-3.5" />
              Agenda operacional
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
              Agendamentos
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Centralize marcações, remarcações, responsáveis e validação do Google numa agenda que funciona como painel de operação, não só como calendário.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNovoAgendamento(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--accent)', boxShadow: '0 16px 32px var(--accent-glow)' }}
            >
              <Plus className="w-4 h-4" />
              Novo agendamento
            </button>
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {statusCards.map((card) => (
            <div key={card.label} className="rounded-2xl px-4 py-3" style={{ background: card.bg, border: '1px solid var(--border-subtle)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>
                {card.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.03em]" style={{ color: card.tone }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-tour="agendamentos-google" className="mb-6">
        {googleStatus && !googleStatus.effective.connected ? (
          <div className="flex items-center justify-between p-4 rounded-[22px] gap-4 flex-wrap" style={{ ...SURFACE_CARD_STYLE, borderColor: 'rgba(245, 200, 66, 0.28)', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--yellow-bg) 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--yellow-bg)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--yellow)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--yellow)' }}>Nenhum Google Calendar conectado</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  O PrevLegal tenta usar o calendário do responsável e, se ele não tiver conexão própria, usa o padrão do escritório.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/api/google/auth?target=user&next=/agendamentos"
                className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2 hover:-translate-y-0.5"
                style={{ background: 'var(--accent)', boxShadow: '0 14px 28px var(--accent-glow)' }}
              >
                <Video className="w-4 h-4" />
                Conectar meu Google
              </a>
              {role === 'admin' ? (
                <a
                  href="/api/google/auth?target=tenant&next=/agendamentos"
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                >
                  <Video className="w-4 h-4" />
                  Conectar calendário do escritório
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {googleStatus?.effective.connected ? (
          <div className="rounded-[22px] p-4" style={{ ...SURFACE_CARD_STYLE, borderColor: 'rgba(45, 212, 160, 0.24)', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--green-bg) 100%)' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--green)' }}>
              <CheckCircle2 className="w-4 h-4" />
              {googleStatus.currentUser.connected
                ? 'Seu Google Calendar está conectado'
                : 'Calendário padrão do escritório disponível como fallback'}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full px-2.5 py-1" style={{ background: googleStatus.currentUser.connected ? 'var(--green-bg)' : 'var(--bg)', color: googleStatus.currentUser.connected ? 'var(--green)' : 'var(--text-secondary)' }}>
                Meu calendário: {googleStatus.currentUser.connected ? (googleStatus.currentUser.email || 'conectado') : 'não conectado'}
              </span>
              <span className="rounded-full px-2.5 py-1" style={{ background: googleStatus.tenantDefault.connected ? 'var(--accent-glow)' : 'var(--bg)', color: googleStatus.tenantDefault.connected ? 'var(--accent)' : 'var(--text-secondary)' }}>
                Escritório: {googleStatus.tenantDefault.connected ? (googleStatus.tenantDefault.email || 'conectado') : 'não conectado'}
              </span>
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Ao criar um agendamento, o PrevLegal tenta usar o calendário do responsável. Sem conexão individual, ele cai no padrão do escritório.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <a
                href="/api/google/auth?target=user&next=/agendamentos"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                <Video className="w-3.5 h-3.5" />
                {googleStatus.currentUser.connected ? 'Reconectar meu Google' : 'Conectar meu Google'}
              </a>
              {role === 'admin' ? (
                <a
                  href="/api/google/auth?target=tenant&next=/agendamentos"
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                >
                  <Video className="w-3.5 h-3.5" />
                  {googleStatus.tenantDefault.connected ? 'Reconectar calendário do escritório' : 'Conectar calendário do escritório'}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {googleStatus === null ? (
          <div className="rounded-[22px] px-4 py-3 text-sm" style={{ ...SURFACE_CARD_STYLE, color: 'var(--text-secondary)' }}>
            Verificando integração com Google Calendar...
          </div>
        ) : null}
      </div>

      <div data-tour="agendamentos-status" className="mb-6 flex flex-wrap gap-2">
        {Object.values(STATUS_LABELS).map(({ label, color }) => (
          <span
            key={label}
            className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}
            style={{ boxShadow: 'inset 0 0 0 1px var(--border-subtle)' }}
          >
            {label}
          </span>
        ))}
      </div>

      {statusFilter ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-blue-300">Filtro operacional ativo</p>
            <p className="mt-1 text-xs text-slate-500">
              Exibindo {statusFilter === 'pendentes' ? 'agendamentos que pedem ação' : statusFilter === 'confirmados' ? 'agendamentos confirmados' : 'histórico recente'}.
            </p>
          </div>
          <a
            href="/agendamentos"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
          >
            Limpar filtro
          </a>
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,1.42fr)_360px] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1.48fr)_380px] xl:gap-6">
        <div className="mb-8 overflow-hidden rounded-[28px] lg:mb-0" style={SURFACE_CARD_STYLE}>
          <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Calendário operacional</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Visualize os agendamentos por cor e clique para operar como numa agenda de trabalho.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth((current) => subMonths(current, 1))}
                className="rounded-xl p-2 transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)' }}
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-40 text-center text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <button
                onClick={() => setCurrentMonth((current) => addMonths(current, 1))}
                className="rounded-xl p-2 transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)' }}
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const items = agendamentosDoDia(day)
              const outside = !isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className="min-h-[96px] border-b border-r p-2 align-top md:min-h-[112px] lg:min-h-[98px] xl:min-h-[108px]"
                  style={{
                    borderColor: 'var(--border)',
                    background: outside ? 'rgba(124, 135, 152, 0.04)' : 'var(--bg-card)',
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        background: isCurrentDay ? 'var(--accent)' : 'transparent',
                        color: isCurrentDay
                          ? '#fff'
                          : outside
                            ? 'var(--text-muted)'
                            : 'var(--text-primary)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {items.length > 0 ? (
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {items.length} ag.
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {items.slice(0, 2).map((ag) => {
                      const date = parseISO(ag.data_hora)
                      const statusStyle = STATUS_CALENDAR_STYLES[ag.status] ?? STATUS_CALENDAR_STYLES.agendado

                      return (
                        <button
                          key={ag.id}
                          onClick={() => setSelectedAgendamento(ag)}
                          className={`flex w-full items-start gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors hover:-translate-y-0.5 ${statusStyle.badge} ${statusStyle.border}`}
                          style={{ backdropFilter: 'blur(10px)' }}
                        >
                          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${statusStyle.dot}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-semibold">
                              {format(date, 'HH:mm')} · {ag.leads?.nome || 'Lead'}
                            </span>
                            <span className="block truncate text-[10px] opacity-80">
                              {STATUS_LABELS[ag.status]?.label || ag.status}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                    {items.length > 2 ? (
                      <button
                        onClick={() => setSelectedAgendamento(items[0])}
                        className="w-full rounded-xl border border-dashed px-2 py-1.5 text-left text-[10px] font-medium transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg)' }}
                      >
                        +{items.length - 2} mais agendamentos
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <section className="rounded-[24px] p-4" style={EMPHASIS_CARD_STYLE}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--accent)' }}>
                    Em foco
                  </div>
                  <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                    O próximo compromisso ou item selecionado para operar sem sair da agenda.
                  </p>
                </div>
                {railFocus ? (
                  <button
                    onClick={() => setSelectedAgendamento(railFocus)}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)' }}
                  >
                    Abrir
                  </button>
                ) : null}
              </div>

              <div className="mt-4">
                {railFocus ? (
                  <div onClick={() => setSelectedAgendamento(railFocus)} className="cursor-pointer">
                    {renderAgendamentoDetail(railFocus, true)}
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border border-dashed px-4 py-8 text-center text-xs"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg)' }}
                  >
                    Nenhum compromisso em foco agora.
                  </div>
                )}
              </div>
            </section>
            {railSections.map((section) => renderRailSection(section))}
          </div>
        </aside>
      </div>

      <div data-tour="agendamentos-lista" className="lg:hidden">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={SURFACE_CARD_STYLE} />
            ))}
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="rounded-[28px] text-center py-16 px-6" style={SURFACE_CARD_STYLE}>
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Nenhum agendamento encontrado</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Os agendamentos criados pelo agente ou manualmente aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-8">
            {showPendentes ? renderLista(
              pendentesConfirmacao,
              'Fila que precisa confirmação',
              'Agendamentos novos ou remarcados que ainda pedem ação humana.',
            ) : null}
            {showConfirmados ? renderLista(
              confirmados,
              'Confirmados',
              'Reuniões já validadas e prontas para acontecer.',
            ) : null}
            {showFinalizados ? renderLista(
              finalizados,
              'Histórico recente',
              'Realizados ou cancelados, para acompanhamento operacional.',
            ) : null}
          </div>
        )}
      </div>

      <AgendamentosOnboardingTour />
      {selectedAgendamento ? (
        <>
          <div
            className="fixed inset-0 z-[310] bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedAgendamento(null)}
          />
          <div className="fixed inset-x-4 top-1/2 z-[311] mx-auto w-full max-w-3xl -translate-y-1/2">
            <div className="overflow-hidden rounded-[28px] shadow-[0_28px_90px_rgba(0,0,0,0.35)]" style={SURFACE_CARD_STYLE}>
              <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ border: '1px solid rgba(79,122,255,0.18)', background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                    <CalendarClock className="w-3.5 h-3.5" />
                    Visão de calendário
                  </div>
                  <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedAgendamento.leads?.nome || 'Agendamento'}
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Edite o compromisso sem sair da leitura mensal.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAgendamento(null)}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)' }}
                >
                  Fechar
                </button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-5">
                {renderAgendamentoDetail(selectedAgendamento, true)}
              </div>
            </div>
          </div>
        </>
      ) : null}
      <NovoAgendamentoModal
        open={showNovoAgendamento}
        onClose={() => setShowNovoAgendamento(false)}
        onCreated={() => {
          void load()
          setShowNovoAgendamento(false)
        }}
      />
    </div>
  )
}
