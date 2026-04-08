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
      if (res.ok) setGoogleStatus(await res.json())
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
        className={`rounded-xl border bg-[#13131f] ${compact ? 'p-4' : 'p-4'} transition-colors ${urgente ? 'border-amber-500/30' : 'border-[#1e1e30] hover:border-[#2e2e45]'}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-center w-14">
            <div className="text-2xl font-bold text-white leading-none">
              {format(date, 'dd')}
            </div>
            <div className="text-xs text-slate-500 uppercase mt-0.5">
              {format(date, 'MMM', { locale: ptBR })}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-300 bg-amber-400/10">
                  Precisa atenção
                </span>
              ) : null}
              {ag.honorario ? (
                <span className="text-xs text-slate-500">
                  R$ {ag.honorario.toLocaleString('pt-BR')}
                </span>
              ) : null}
            </div>

            {ag.leads ? (
              <div className="flex items-center gap-1 mt-1.5 text-sm font-medium text-slate-200">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {ag.leads.nome}
                {ag.leads.telefone ? (
                  <span className="text-slate-500 font-normal text-xs ml-1">· {ag.leads.telefone}</span>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {ag.duracao_minutos} min
              </span>
              {ag.meet_link ? (
                <a
                  href={ag.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Video className="w-3 h-3" />
                  Google Meet
                </a>
              ) : null}
              {ag.usuarios ? (
                <span className="text-xs text-slate-600">
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
                  className="rounded-md border border-white/10 bg-[#0d0f17] px-2.5 py-1.5 text-[11px] text-slate-200 outline-none"
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300 transition-colors hover:bg-blue-500/15"
                >
                  <MessageSquare className="w-3 h-3" />
                  Abrir conversa
                </a>
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15"
                  >
                    <Send className="w-3 h-3" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}

            {editandoId === ag.id ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#0d0f17] p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Remarcar reunião
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="datetime-local"
                    value={novaDataHora}
                    onChange={(e) => setNovaDataHora(e.target.value)}
                    className="rounded-md border border-white/10 bg-[#13131f] px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={novaDuracaoMinutos}
                    onChange={(e) => setNovaDuracaoMinutos(e.target.value)}
                    className="w-28 rounded-md border border-white/10 bg-[#13131f] px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                  <button
                    onClick={() => void salvarRemarcacao(ag.id)}
                    disabled={savingId === ag.id}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}

            {ag.observacoes ? (
              <p className="mt-2 text-xs text-slate-500">{ag.observacoes}</p>
            ) : null}
          </div>

          {!['realizado', 'cancelado'].includes(ag.status) ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              {['agendado', 'remarcado'].includes(ag.status) ? (
                <button
                  onClick={() => void updateStatus(ag.id, 'confirmado')}
                  disabled={savingId === ag.id}
                  className="p-1.5 rounded-md text-slate-500 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                  title="Confirmar"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              ) : null}
              <button
                onClick={() => iniciarRemarcacao(ag)}
                disabled={savingId === ag.id}
                className="p-1.5 rounded-md text-slate-500 hover:text-amber-300 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
                title="Remarcar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => void updateStatus(ag.id, 'realizado')}
                disabled={savingId === ag.id}
                className="p-1.5 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
                title="Marcar como realizado"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => void cancelar(ag.id)}
                disabled={savingId === ag.id}
                className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
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
      <div className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{titulo}</h2>
            <p className="text-xs text-slate-500 mt-1">{descricao}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400">
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Agendamentos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consultas sincronizadas com Google Calendar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNovoAgendamento(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" />
            Novo agendamento
          </button>
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div data-tour="agendamentos-google" className="mb-6">
        {googleStatus && !googleStatus.effective.connected ? (
          <div className="flex items-center justify-between p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Nenhum Google Calendar conectado</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  O PrevLegal tenta usar o calendário do responsável e, se ele não tiver conexão própria, usa o padrão do escritório.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/api/google/auth?target=user&next=/agendamentos"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Conectar meu Google
              </a>
              {role === 'admin' ? (
                <a
                  href="/api/google/auth?target=tenant&next=/agendamentos"
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Conectar calendário do escritório
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {googleStatus?.effective.connected ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {googleStatus.currentUser.connected
                ? 'Seu Google Calendar está conectado'
                : 'Calendário padrão do escritório disponível como fallback'}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-1 ${googleStatus.currentUser.connected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>
                Meu calendário: {googleStatus.currentUser.connected ? (googleStatus.currentUser.email || 'conectado') : 'não conectado'}
              </span>
              <span className={`rounded-full px-2.5 py-1 ${googleStatus.tenantDefault.connected ? 'bg-blue-500/10 text-blue-300' : 'bg-white/5 text-slate-400'}`}>
                Escritório: {googleStatus.tenantDefault.connected ? (googleStatus.tenantDefault.email || 'conectado') : 'não conectado'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Ao criar um agendamento, o PrevLegal tenta usar o calendário do responsável. Sem conexão individual, ele cai no padrão do escritório.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <a
                href="/api/google/auth?target=user&next=/agendamentos"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                <Video className="w-3.5 h-3.5" />
                {googleStatus.currentUser.connected ? 'Reconectar meu Google' : 'Conectar meu Google'}
              </a>
              {role === 'admin' ? (
                <a
                  href="/api/google/auth?target=tenant&next=/agendamentos"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                >
                  <Video className="w-3.5 h-3.5" />
                  {googleStatus.tenantDefault.connected ? 'Reconectar calendário do escritório' : 'Conectar calendário do escritório'}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {googleStatus === null ? (
          <div className="text-sm text-slate-500">
            Verificando integração com Google Calendar...
          </div>
        ) : null}
      </div>

      <div data-tour="agendamentos-status" className="mb-6 flex flex-wrap gap-2">
        {Object.values(STATUS_LABELS).map(({ label, color }) => (
          <span
            key={label}
            className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}
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

      <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-[#11131b]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Calendário operacional</h2>
            <p className="mt-1 text-xs text-slate-500">
              Visualize os agendamentos por cor e clique para operar como numa agenda de trabalho.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((current) => subMonths(current, 1))}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-40 text-center text-sm font-semibold capitalize text-slate-200">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <button
              onClick={() => setCurrentMonth((current) => addMonths(current, 1))}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02]">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
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
                className={`min-h-36 border-b border-r border-white/10 p-2 align-top ${outside ? 'bg-[#0b0d12]' : 'bg-[#11131b]'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isCurrentDay
                        ? 'bg-blue-500 text-white'
                        : outside
                          ? 'text-slate-600'
                          : 'text-slate-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {items.length > 0 ? (
                    <span className="text-[10px] font-medium text-slate-500">
                      {items.length} ag.
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  {items.slice(0, 3).map((ag) => {
                    const date = parseISO(ag.data_hora)
                    const statusStyle = STATUS_CALENDAR_STYLES[ag.status] ?? STATUS_CALENDAR_STYLES.agendado

                    return (
                      <button
                        key={ag.id}
                        onClick={() => setSelectedAgendamento(ag)}
                        className={`flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors hover:bg-white/10 ${statusStyle.badge} ${statusStyle.border}`}
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
                  {items.length > 3 ? (
                    <button
                      onClick={() => setSelectedAgendamento(items[0])}
                      className="w-full rounded-lg border border-dashed border-white/10 px-2 py-1 text-left text-[10px] font-medium text-slate-400 transition-colors hover:bg-white/5"
                    >
                      +{items.length - 3} mais agendamentos
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div data-tour="agendamentos-lista">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-[#13131f] animate-pulse" />
            ))}
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-400">Nenhum agendamento encontrado</p>
            <p className="text-sm mt-1">Os agendamentos criados pelo agente ou manualmente aparecerão aqui</p>
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
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1118] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-300">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Visão de calendário
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {selectedAgendamento.leads?.nome || 'Agendamento'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Edite o compromisso sem sair da leitura mensal.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAgendamento(null)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
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
