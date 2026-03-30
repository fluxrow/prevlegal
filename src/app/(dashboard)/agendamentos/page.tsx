'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Video, Clock, User, RefreshCw, CheckCircle2, XCircle, AlertCircle, MessageSquare, Send, CalendarClock, CheckCheck, Pencil, Save, UserCog, Plus } from 'lucide-react'
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
  leads: { id: string; nome: string; telefone: string; banco?: string } | null
  usuarios: { id: string; nome: string } | null
}

interface UsuarioOpcao {
  id: string
  nome: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  agendado:  { label: 'Agendado',  color: 'text-blue-400 bg-blue-400/10' },
  confirmado:{ label: 'Confirmado', color: 'text-cyan-300 bg-cyan-400/10' },
  remarcado: { label: 'Remarcado', color: 'text-amber-300 bg-amber-400/10' },
  realizado: { label: 'Realizado', color: 'text-emerald-400 bg-emerald-400/10' },
  cancelado: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10' },
}

function toLocalDateTimeValue(iso: string) {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}

export default function AgendamentosPage() {
  const searchParams = useSearchParams()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novaDataHora, setNovaDataHora] = useState('')
  const [novaDuracaoMinutos, setNovaDuracaoMinutos] = useState('30')
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false)

  useEffect(() => {
    if (searchParams.get('google') === 'conectado') {
      toast.success('Google Calendar conectado com sucesso!')
      setGoogleConnected(true)
    }
    if (searchParams.get('google') === 'erro') {
      toast.error('Erro ao conectar Google Calendar. Tente novamente.')
    }
  }, [searchParams])

  useEffect(() => {
    load()
    checkGoogle()
    loadUsuarios()
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
      if (res.ok) setGoogleConnected((await res.json()).connected)
    } catch {
      setGoogleConnected(false)
    }
  }

  async function loadUsuarios() {
    try {
      const res = await fetch('/api/usuarios')
      if (!res.ok) return
      const data = await res.json()
      setUsuarios((data.usuarios || []).filter((usuario: { ativo: boolean }) => usuario.ativo).map((usuario: { id: string; nome: string }) => ({ id: usuario.id, nome: usuario.nome })))
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

  const pendentesConfirmacao = agendamentos.filter((ag) => ['agendado', 'remarcado'].includes(ag.status))
  const confirmados = agendamentos.filter((ag) => ag.status === 'confirmado')
  const finalizados = agendamentos.filter((ag) => ['realizado', 'cancelado'].includes(ag.status))

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
          {lista.map((ag) => {
            const statusInfo = STATUS_LABELS[ag.status] ?? { label: ag.status, color: 'text-slate-400 bg-slate-400/10' }
            const date = parseISO(ag.data_hora)
            const inboxHref = buildInboxHref({ telefone: ag.leads?.telefone })
            const whatsappHref = buildWhatsAppHref(ag.leads?.telefone)
            const urgente = ag.status !== 'realizado' && ag.status !== 'cancelado' && (isToday(date) || isPast(date))

            return (
              <div
                key={ag.id}
                className={`p-4 rounded-xl border bg-[#13131f] transition-colors ${urgente ? 'border-amber-500/30' : 'border-[#1e1e30] hover:border-[#2e2e45]'}`}
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
                      {urgente && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-300 bg-amber-400/10">
                          Precisa atenção
                        </span>
                      )}
                      {ag.honorario && (
                        <span className="text-xs text-slate-500">
                          R$ {ag.honorario.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {ag.leads && (
                      <div className="flex items-center gap-1 mt-1.5 text-sm font-medium text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {ag.leads.nome}
                        {ag.leads.telefone && (
                          <span className="text-slate-500 font-normal text-xs ml-1">· {ag.leads.telefone}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {ag.duracao_minutos} min
                      </span>
                      {ag.meet_link && (
                        <a
                          href={ag.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Video className="w-3 h-3" />
                          Google Meet
                        </a>
                      )}
                      {ag.usuarios && (
                        <span className="text-xs text-slate-600">
                          {ag.usuarios.nome}
                        </span>
                      )}
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

                    {ag.leads?.telefone && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <a
                          href={inboxHref}
                          className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300 transition-colors hover:bg-blue-500/15"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Abrir conversa
                        </a>
                        {whatsappHref && (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15"
                          >
                            <Send className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}

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

                    {ag.observacoes && (
                      <p className="mt-2 text-xs text-slate-500">{ag.observacoes}</p>
                    )}
                  </div>

                  {!['realizado', 'cancelado'].includes(ag.status) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {['agendado', 'remarcado'].includes(ag.status) && (
                        <button
                          onClick={() => void updateStatus(ag.id, 'confirmado')}
                          disabled={savingId === ag.id}
                          className="p-1.5 rounded-md text-slate-500 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                          title="Confirmar"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
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
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
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
            onClick={load}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div data-tour="agendamentos-google" className="mb-6">
        {googleConnected === false && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Google Calendar não conectado</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conecte para criar links do Google Meet automaticamente
                </p>
              </div>
            </div>
            <a
              href="/api/google/auth"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Conectar Google
            </a>
          </div>
        )}

        {googleConnected === true && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Google Calendar conectado
          </div>
        )}

        {googleConnected === null && (
          <div className="text-sm text-slate-500">
            Verificando integração com Google Calendar...
          </div>
        )}
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

      <div data-tour="agendamentos-lista">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
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
            {renderLista(
              pendentesConfirmacao,
              'Fila que precisa confirmação',
              'Agendamentos novos ou remarcados que ainda pedem ação humana.',
            )}
            {renderLista(
              confirmados,
              'Confirmados',
              'Reuniões já validadas e prontas para acontecer.',
            )}
            {renderLista(
              finalizados,
              'Histórico recente',
              'Realizados ou cancelados, para acompanhamento operacional.',
            )}
          </div>
        )}
      </div>

      <AgendamentosOnboardingTour />
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
