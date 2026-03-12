'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Video, Clock, User, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  agendado:  { label: 'Agendado',  color: 'text-blue-400 bg-blue-400/10' },
  realizado: { label: 'Realizado', color: 'text-emerald-400 bg-emerald-400/10' },
  cancelado: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10' },
}

export default function AgendamentosPage() {
  const searchParams = useSearchParams()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)

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

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(status === 'realizado' ? 'Marcado como realizado' : 'Status atualizado')
      load()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar este agendamento? O evento será removido do Google Calendar.')) return
    await updateStatus(id, 'cancelado')
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
        <button
          onClick={load}
          className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Banner Google Calendar */}
      {googleConnected === false && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
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
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Google Calendar conectado
        </div>
      )}

      {/* Lista */}
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
          <p className="text-sm mt-1">Os agendamentos criados pelo agente aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentos.map(ag => {
            const statusInfo = STATUS_LABELS[ag.status] ?? { label: ag.status, color: 'text-slate-400 bg-slate-400/10' }
            const date = parseISO(ag.data_hora)

            return (
              <div
                key={ag.id}
                className="p-4 rounded-xl border border-[#1e1e30] bg-[#13131f] hover:border-[#2e2e45] transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Data */}
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
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

                    <div className="flex items-center gap-3 mt-1.5">
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

                    {ag.observacoes && (
                      <p className="mt-1.5 text-xs text-slate-500">{ag.observacoes}</p>
                    )}
                  </div>

                  {/* Ações */}
                  {ag.status === 'agendado' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateStatus(ag.id, 'realizado')}
                        className="p-1.5 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                        title="Marcar como realizado"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => cancelar(ag.id)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
      )}
    </div>
  )
}
