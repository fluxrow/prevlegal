'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SessionActivityTracker from '@/components/session-activity-tracker'
import { ADMIN_IDLE_MINUTES } from '@/lib/session-config'
import {
  ArrowLeft,
  Building2,
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Zap,
  Plus,
  Pencil,
  Trash2,
  Power,
  ShieldCheck,
  MessageCircleMore,
} from 'lucide-react'

interface Metricas {
  totalLeads: number
  leadsConvertidos: number
  taxaConversao: string
  totalConversas: number
  conversasHumano: number
  totalCampanhas: number
  totalContratos: number
  receitaTotal: number
  portalNaoLidas: number
  totalAgendamentos: number
  totalUsuarios: number
}

interface Tenant {
  id: string
  nome: string
  slug: string
  responsavel_nome: string
  responsavel_email: string
  responsavel_telefone: string
  plano: string
  status: string
  trial_expira_em: string | null
  created_at: string
  notas: string
  twilio_account_sid?: string | null
  twilio_auth_token?: string | null
  twilio_whatsapp_number?: string | null
}

interface ConversaResumo {
  telefone: string | null
  ultima_mensagem: string | null
  ultima_mensagem_at: string | null
  status: string
}

const CONVERSA_STATUS_ADMIN: Record<string, { label: string; color: string }> = {
  agente: { label: '🤖 Agente', color: '#4f7aff' },
  humano: { label: '👤 Humano', color: '#22c55e' },
  aguardando_cliente: { label: '⏳ Aguardando', color: '#f59e0b' },
  resolvido: { label: '✅ Resolvido', color: '#14b8a6' },
  encerrado: { label: '✓ Enc.', color: '#6b7280' },
}

interface CampanhaResumo {
  nome: string
  status: string
  total_enviados: number | null
  total_convertidos: number | null
  created_at: string
}

interface WhatsAppNumber {
  id: string
  provider: 'twilio' | 'zapi'
  label: string | null
  phone: string | null
  purpose: string | null
  ativo: boolean
  is_default: boolean
  metadata?: Record<string, unknown> | null
  twilio_account_sid?: string | null
  twilio_auth_token?: string | null
  twilio_whatsapp_number?: string | null
  zapi_instance_id?: string | null
  zapi_instance_token?: string | null
  zapi_client_token?: string | null
  zapi_base_url?: string | null
  zapi_connected_phone?: string | null
}

interface ChannelFormState {
  provider: 'twilio' | 'zapi'
  label: string
  phone: string
  purpose: string
  ativo: string
  is_default: string
  twilio_account_sid: string
  twilio_auth_token: string
  twilio_whatsapp_number: string
  zapi_instance_id: string
  zapi_instance_token: string
  zapi_client_token: string
  zapi_base_url: string
  zapi_connected_phone: string
}

const STATUS: Record<string, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: '#22c55e' },
  trial: { label: 'Trial', color: '#f5c842' },
  suspenso: { label: 'Suspenso', color: '#ff5757' },
  cancelado: { label: 'Cancelado', color: '#6b7280' },
}

const PLANO: Record<string, { label: string; color: string }> = {
  entrada: { label: 'Entrada', color: '#6b7280' },
  profissional: { label: 'Profissional', color: '#4f7aff' },
  enterprise: { label: 'Enterprise', color: '#7c3aed' },
  basico: { label: 'Básico', color: '#6b7280' },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#080b14',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#fff',
  fontSize: '13px',
  boxSizing: 'border-box',
  fontFamily: 'DM Sans, sans-serif',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#9ca3af',
  display: 'block',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

function KpiCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '26px', fontWeight: '700', color: '#fff', fontFamily: 'Syne, sans-serif', margin: 0 }}>{value}</p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  options,
  col,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  options?: Array<{ value: string; label: string }>
  col?: string
  placeholder?: string
}) {
  return (
    <div style={{ gridColumn: col }}>
      <label style={labelStyle}>{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

function badgeStyle(color: string) {
  return {
    fontSize: '10px',
    fontWeight: '700',
    color,
    border: `1px solid ${color}40`,
    background: `${color}16`,
    borderRadius: '999px',
    padding: '3px 9px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  }
}

function formatProvider(provider: 'twilio' | 'zapi') {
  return provider === 'twilio' ? 'Twilio' : 'Z-API'
}

function formatPurpose(purpose: string | null) {
  if (purpose === 'inbox') return 'Inbox'
  if (purpose === 'campanha') return 'Campanha'
  return 'Ambos'
}

function emptyChannelForm(tenant?: Tenant, provider: 'twilio' | 'zapi' = 'twilio'): ChannelFormState {
  return {
    provider,
    label: provider === 'twilio' ? 'Twilio Principal' : 'Z-API Principal',
    phone: provider === 'twilio' ? String(tenant?.twilio_whatsapp_number || '') : '',
    purpose: 'ambos',
    ativo: 'true',
    is_default: 'true',
    twilio_account_sid: String(tenant?.twilio_account_sid || ''),
    twilio_auth_token: String(tenant?.twilio_auth_token || ''),
    twilio_whatsapp_number: String(tenant?.twilio_whatsapp_number || ''),
    zapi_instance_id: '',
    zapi_instance_token: '',
    zapi_client_token: '',
    zapi_base_url: 'https://api.z-api.io',
    zapi_connected_phone: '',
  }
}

function toChannelForm(channel: WhatsAppNumber): ChannelFormState {
  return {
    provider: channel.provider,
    label: channel.label || '',
    phone: channel.phone || '',
    purpose: channel.purpose || 'ambos',
    ativo: channel.ativo ? 'true' : 'false',
    is_default: channel.is_default ? 'true' : 'false',
    twilio_account_sid: channel.twilio_account_sid || '',
    twilio_auth_token: channel.twilio_auth_token || '',
    twilio_whatsapp_number: channel.twilio_whatsapp_number || '',
    zapi_instance_id: channel.zapi_instance_id || '',
    zapi_instance_token: channel.zapi_instance_token || '',
    zapi_client_token: channel.zapi_client_token || '',
    zapi_base_url: channel.zapi_base_url || 'https://api.z-api.io',
    zapi_connected_phone: channel.zapi_connected_phone || '',
  }
}

function maskSecret(value?: string | null) {
  if (!value) return '—'
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function ActionButton({
  label,
  onClick,
  icon,
  color = '#9ca3af',
  disabled = false,
}: {
  label: string
  onClick: () => void
  icon: React.ReactNode
  color?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 11px',
        background: `${color}14`,
        color,
        border: `1px solid ${color}30`,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        fontFamily: 'DM Sans, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<{
    tenant: Tenant
    metricas: Metricas
    ultimasConversas: ConversaResumo[]
    ultimosCampanhas: CampanhaResumo[]
  } | null>(null)
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [channelForm, setChannelForm] = useState<ChannelFormState>(emptyChannelForm())
  const [channelMsg, setChannelMsg] = useState('')
  const [savingChannel, setSavingChannel] = useState(false)
  const [actingChannelId, setActingChannelId] = useState<string | null>(null)

  useEffect(() => {
    loadPage()
  }, [id])

  async function loadPage() {
    setLoading(true)
    const [metricasRes, channelsRes] = await Promise.all([
      fetch(`/api/admin/tenants/${id}/metricas`),
      fetch(`/api/admin/tenants/${id}/whatsapp-numbers`),
    ])

    if (metricasRes.status === 401 || channelsRes.status === 401) {
      router.push('/admin/login')
      return
    }

    if (metricasRes.status === 428 || channelsRes.status === 428) {
      router.push(`/admin/reauth?next=${encodeURIComponent(`/admin/${id}`)}`)
      return
    }

    const metricasJson = metricasRes.ok ? await metricasRes.json() : null
    const channelsJson = channelsRes.ok ? await channelsRes.json() : null

    if (metricasJson) setData(metricasJson)
    setWhatsappNumbers(channelsJson?.numbers || [])
    setLoading(false)
  }

  function setChannelField<K extends keyof ChannelFormState>(field: K, value: ChannelFormState[K]) {
    setChannelForm((prev) => ({ ...prev, [field]: value }))
  }

  function openNewChannel(provider: 'twilio' | 'zapi') {
    setEditingChannelId(null)
    setChannelMsg('')
    setChannelForm(emptyChannelForm(data?.tenant, provider))
    setShowChannelForm(true)
  }

  function openEditChannel(channel: WhatsAppNumber) {
    setEditingChannelId(channel.id)
    setChannelMsg('')
    setChannelForm(toChannelForm(channel))
    setShowChannelForm(true)
  }

  function closeChannelForm() {
    setShowChannelForm(false)
    setEditingChannelId(null)
    setChannelMsg('')
    setChannelForm(emptyChannelForm(data?.tenant))
  }

  async function saveChannel() {
    setSavingChannel(true)
    setChannelMsg('')
    const url = editingChannelId
      ? `/api/admin/tenants/${id}/whatsapp-numbers/${editingChannelId}`
      : `/api/admin/tenants/${id}/whatsapp-numbers`
    const method = editingChannelId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...channelForm,
        ativo: channelForm.ativo === 'true',
        is_default: channelForm.is_default === 'true',
      }),
    })

    if (res.status === 401) {
      router.push('/admin/login')
      return
    }
    if (res.status === 428) {
      router.push(`/admin/reauth?next=${encodeURIComponent(`/admin/${id}`)}`)
      return
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setChannelMsg(json.error || 'Nao foi possivel salvar o canal')
      setSavingChannel(false)
      return
    }

    await loadPage()
    closeChannelForm()
    setSavingChannel(false)
  }

  async function patchChannel(channelId: string, body: Record<string, unknown>) {
    setActingChannelId(channelId)
    setChannelMsg('')

    const res = await fetch(`/api/admin/tenants/${id}/whatsapp-numbers/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.status === 401) {
      router.push('/admin/login')
      return
    }
    if (res.status === 428) {
      router.push(`/admin/reauth?next=${encodeURIComponent(`/admin/${id}`)}`)
      return
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setChannelMsg(json.error || 'Nao foi possivel atualizar o canal')
      setActingChannelId(null)
      return
    }

    await loadPage()
    setActingChannelId(null)
  }

  async function deleteChannel(channel: WhatsAppNumber) {
    if (!confirm(`Remover o canal "${channel.label || channel.phone || channel.id}"?`)) return

    setActingChannelId(channel.id)
    setChannelMsg('')
    const res = await fetch(`/api/admin/tenants/${id}/whatsapp-numbers/${channel.id}`, {
      method: 'DELETE',
    })

    if (res.status === 401) {
      router.push('/admin/login')
      return
    }
    if (res.status === 428) {
      router.push(`/admin/reauth?next=${encodeURIComponent(`/admin/${id}`)}`)
      return
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setChannelMsg(json.error || 'Nao foi possivel excluir o canal')
      setActingChannelId(null)
      return
    }

    await loadPage()
    setActingChannelId(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Carregando...</div>
      </div>
    )
  }

  if (!data) return null

  const { tenant, metricas, ultimasConversas, ultimosCampanhas } = data
  const status = STATUS[tenant.status] || STATUS.trial
  const plano = PLANO[tenant.plano] || PLANO.profissional
  const plataformaUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', fontFamily: 'DM Sans, sans-serif', color: '#fff' }}>
      <SessionActivityTracker mode="admin" idleMinutes={ADMIN_IDLE_MINUTES} touchUrl="/api/admin/session/touch" loginUrl="/admin/login" logoutUrl="/api/admin/auth" />

      <div style={{ height: '56px', background: '#111827', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}>
            <ArrowLeft size={15} /> Voltar
          </button>
          <span style={{ color: '#374151' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={15} color="#4f7aff" />
            <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'Syne, sans-serif' }}>{tenant.nome}</span>
            <span style={{ fontSize: '11px', background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40`, borderRadius: '20px', padding: '2px 10px', fontWeight: '600' }}>{status.label}</span>
            <span style={{ fontSize: '11px', background: `${plano.color}20`, color: plano.color, border: `1px solid ${plano.color}40`, borderRadius: '20px', padding: '2px 10px', fontWeight: '600' }}>{plano.label}</span>
          </div>
        </div>
        <a
          href={plataformaUrl}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#4f7aff', textDecoration: 'none' }}
        >
          <ExternalLink size={12} /> Abrir plataforma
        </a>
      </div>

      <div style={{ padding: '28px', maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Responsável</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: '0 0 2px' }}>{tenant.responsavel_nome || '—'}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{tenant.responsavel_email}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Telefone</p>
            <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>{tenant.responsavel_telefone || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cliente desde</p>
            <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>{new Date(tenant.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Slug</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, fontFamily: 'monospace' }}>{tenant.slug}</p>
          </div>
          {tenant.notas && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Notas</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: '1.5' }}>{tenant.notas}</p>
            </div>
          )}
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', color: '#fff', fontFamily: 'Syne, sans-serif', margin: '0 0 6px' }}>
                <MessageCircleMore size={16} color="#4f7aff" /> Canais WhatsApp
              </h3>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: '1.5' }}>
                Cadastre multiplos numeros por escritorio, escolha o provider (`Twilio` ou `Z-API`) e defina qual canal sera o padrao operacional.
                Canais pausados podem ficar como rascunho enquanto as credenciais ainda nao foram plugadas.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <ActionButton label="Novo Twilio" onClick={() => openNewChannel('twilio')} icon={<Plus size={13} />} color="#4f7aff" />
              <ActionButton label="Novo Z-API" onClick={() => openNewChannel('zapi')} icon={<Plus size={13} />} color="#2dd4a0" />
            </div>
          </div>

          {channelMsg ? (
            <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', background: '#ff575714', border: '1px solid #ff575730', color: '#ff8d8d', fontSize: '12px' }}>
              {channelMsg}
            </div>
          ) : null}

          {whatsappNumbers.length === 0 ? (
            <div style={{ border: '1px dashed #263042', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
              Nenhum canal cadastrado ainda. O runtime continua com fallback para o modelo legado, mas o ideal agora é operar por `whatsapp_numbers`.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px', marginBottom: showChannelForm ? '20px' : 0 }}>
              {whatsappNumbers.map((channel) => (
                <div key={channel.id} style={{ border: '1px solid #1f2937', borderRadius: '12px', padding: '16px 18px', background: '#0b1220' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{channel.label || formatProvider(channel.provider)}</span>
                        <span style={badgeStyle(channel.provider === 'twilio' ? '#4f7aff' : '#2dd4a0')}>{formatProvider(channel.provider)}</span>
                        <span style={badgeStyle(channel.ativo ? '#22c55e' : '#6b7280')}>{channel.ativo ? 'Ativo' : 'Pausado'}</span>
                        {channel.is_default ? <span style={badgeStyle('#f5c842')}>Padrão</span> : null}
                        {Boolean(channel.metadata?.warmup_enabled) ? (
                          <span style={badgeStyle('#f97316')}>Warm-up</span>
                        ) : null}
                        <span style={badgeStyle('#9ca3af')}>{formatPurpose(channel.purpose)}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Número</p>
                          <p style={{ fontSize: '13px', color: '#d1d5db', margin: 0, fontFamily: 'monospace' }}>{channel.phone || channel.twilio_whatsapp_number || channel.zapi_connected_phone || '—'}</p>
                        </div>
                        {channel.provider === 'twilio' ? (
                          <>
                            <div>
                              <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Account SID</p>
                              <p style={{ fontSize: '13px', color: '#d1d5db', margin: 0, fontFamily: 'monospace' }}>{maskSecret(channel.twilio_account_sid)}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Auth Token</p>
                              <p style={{ fontSize: '13px', color: '#d1d5db', margin: 0, fontFamily: 'monospace' }}>{maskSecret(channel.twilio_auth_token)}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Instance ID</p>
                              <p style={{ fontSize: '13px', color: '#d1d5db', margin: 0, fontFamily: 'monospace' }}>{channel.zapi_instance_id || '—'}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Base URL</p>
                              <p style={{ fontSize: '13px', color: '#d1d5db', margin: 0 }}>{channel.zapi_base_url || 'https://api.z-api.io'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                      <ActionButton label="Editar" onClick={() => openEditChannel(channel)} icon={<Pencil size={12} />} color="#9ca3af" />
                      {!channel.is_default ? (
                        <ActionButton
                          label="Definir padrão"
                          onClick={() => patchChannel(channel.id, { is_default: true, ativo: true })}
                          icon={<ShieldCheck size={12} />}
                          color="#f5c842"
                          disabled={actingChannelId === channel.id}
                        />
                      ) : null}
                      <ActionButton
                        label={channel.ativo ? 'Pausar' : 'Ativar'}
                        onClick={() => patchChannel(channel.id, { ativo: !channel.ativo, is_default: channel.ativo ? false : channel.is_default })}
                        icon={<Power size={12} />}
                        color={channel.ativo ? '#ff8d8d' : '#22c55e'}
                        disabled={actingChannelId === channel.id}
                      />
                      <ActionButton
                        label="Excluir"
                        onClick={() => deleteChannel(channel)}
                        icon={<Trash2 size={12} />}
                        color="#ff8d8d"
                        disabled={actingChannelId === channel.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showChannelForm ? (
            <div style={{ marginTop: '18px', borderTop: '1px solid #1f2937', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }}>
                    {editingChannelId ? 'Editar canal' : `Novo canal ${channelForm.provider === 'twilio' ? 'Twilio' : 'Z-API'}`}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    O canal padrao ativo alimenta o runtime tenant-aware e sincroniza o fallback legado de Twilio quando o provider for `twilio`.
                  </p>
                </div>
                <button
                  onClick={closeChannelForm}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '12px' }}
                >
                  Fechar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                <Field
                  label="Provider"
                  value={channelForm.provider}
                  onChange={(value) => setChannelForm((prev) => ({ ...emptyChannelForm(data.tenant, value as 'twilio' | 'zapi'), label: prev.label || emptyChannelForm(data.tenant, value as 'twilio' | 'zapi').label }))}
                  options={[
                    { value: 'twilio', label: 'Twilio' },
                    { value: 'zapi', label: 'Z-API' },
                  ]}
                />
                <Field label="Label" value={channelForm.label} onChange={(value) => setChannelField('label', value)} />
                <Field label="Número principal" value={channelForm.phone} onChange={(value) => setChannelField('phone', value)} placeholder="whatsapp:+55..." />
                <Field
                  label="Uso"
                  value={channelForm.purpose}
                  onChange={(value) => setChannelField('purpose', value)}
                  options={[
                    { value: 'ambos', label: 'Ambos' },
                    { value: 'inbox', label: 'Inbox' },
                    { value: 'campanha', label: 'Campanha' },
                  ]}
                />
                <Field
                  label="Ativo"
                  value={channelForm.ativo}
                  onChange={(value) => setChannelField('ativo', value)}
                  options={[
                    { value: 'true', label: 'Sim' },
                    { value: 'false', label: 'Não' },
                  ]}
                />
                <Field
                  label="Padrão"
                  value={channelForm.is_default}
                  onChange={(value) => setChannelField('is_default', value)}
                  options={[
                    { value: 'true', label: 'Sim' },
                    { value: 'false', label: 'Não' },
                  ]}
                />

                {channelForm.provider === 'twilio' ? (
                  <>
                    <Field label="Account SID" value={channelForm.twilio_account_sid} onChange={(value) => setChannelField('twilio_account_sid', value)} col="1 / span 2" />
                    <Field label="Auth Token" value={channelForm.twilio_auth_token} onChange={(value) => setChannelField('twilio_auth_token', value)} type="password" />
                    <Field label="Número WhatsApp Twilio" value={channelForm.twilio_whatsapp_number} onChange={(value) => setChannelField('twilio_whatsapp_number', value)} col="1 / -1" placeholder="whatsapp:+14155238886" />
                  </>
                ) : (
                  <>
                    <Field label="Instance ID" value={channelForm.zapi_instance_id} onChange={(value) => setChannelField('zapi_instance_id', value)} />
                    <Field label="Instance Token" value={channelForm.zapi_instance_token} onChange={(value) => setChannelField('zapi_instance_token', value)} type="password" />
                    <Field label="Client Token" value={channelForm.zapi_client_token} onChange={(value) => setChannelField('zapi_client_token', value)} type="password" />
                    <Field label="Base URL" value={channelForm.zapi_base_url} onChange={(value) => setChannelField('zapi_base_url', value)} col="1 / span 2" placeholder="https://api.z-api.io" />
                    <Field label="Telefone conectado" value={channelForm.zapi_connected_phone} onChange={(value) => setChannelField('zapi_connected_phone', value)} placeholder="+55..." />
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  `Twilio` e o trilho oficial com template e compliance da Meta. `Z-API` oferece mais agilidade, mas com risco operacional maior.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <ActionButton label="Cancelar" onClick={closeChannelForm} icon={<ArrowLeft size={12} />} color="#6b7280" />
                  <ActionButton label={savingChannel ? 'Salvando...' : 'Salvar canal'} onClick={saveChannel} icon={<ShieldCheck size={12} />} color="#4f7aff" disabled={savingChannel} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Métricas de uso</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <KpiCard label="Leads" value={metricas.totalLeads.toLocaleString('pt-BR')} color="#4f7aff" icon={<Users size={15} />} />
          <KpiCard label="Convertidos" value={metricas.leadsConvertidos} color="#22c55e" icon={<CheckCircle size={15} />} />
          <KpiCard label="Conversão" value={`${metricas.taxaConversao}%`} color="#2dd4a0" icon={<TrendingUp size={15} />} />
          <KpiCard label="Conversas" value={metricas.totalConversas} color="#a855f7" icon={<MessageSquare size={15} />} />
          <KpiCard label="Campanhas" value={metricas.totalCampanhas} color="#f97316" icon={<Zap size={15} />} />
          <KpiCard label="Receita" value={fmt(metricas.receitaTotal)} color="#f5c842" icon={<DollarSign size={15} />} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Últimas conversas</h3>
            {ultimasConversas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Nenhuma conversa ainda</p>
            ) : ultimasConversas.map((conversa, index) => (
              <div key={`${conversa.telefone || 'sem-telefone'}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: index < ultimasConversas.length - 1 ? '1px solid #1f2937' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#d1d5db', margin: '0 0 3px', fontFamily: 'monospace' }}>{conversa.telefone || 'Sem telefone'}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversa.ultima_mensagem || '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: (CONVERSA_STATUS_ADMIN[conversa.status] || CONVERSA_STATUS_ADMIN.encerrado).color, fontWeight: '600' }}>
                    {(CONVERSA_STATUS_ADMIN[conversa.status] || CONVERSA_STATUS_ADMIN.encerrado).label}
                  </span>
                  {conversa.ultima_mensagem_at && (
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '3px 0 0' }}>
                      {new Date(conversa.ultima_mensagem_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Últimas campanhas</h3>
            {ultimosCampanhas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Nenhuma campanha ainda</p>
            ) : ultimosCampanhas.map((campanha, index) => (
              <div key={`${campanha.nome}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: index < ultimosCampanhas.length - 1 ? '1px solid #1f2937' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#d1d5db', margin: '0 0 3px', fontWeight: '500' }}>{campanha.nome}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                    {(campanha.total_enviados || 0).toLocaleString('pt-BR')} disparos · {campanha.total_convertidos || 0} convertidos
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: campanha.status === 'encerrada' || campanha.status === 'concluida' ? '#22c55e' : campanha.status === 'ativa' ? '#4f7aff' : '#6b7280' }}>
                    {campanha.status}
                  </span>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '3px 0 0' }}>
                    {new Date(campanha.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Resumo operacional</h3>
            {[
              { label: 'Conversas com humano ativo', value: metricas.conversasHumano, color: '#22c55e' },
              { label: 'Msgs portal não lidas', value: metricas.portalNaoLidas, color: '#4f7aff' },
              { label: 'Agendamentos', value: metricas.totalAgendamentos, color: '#a855f7' },
              { label: 'Contratos registrados', value: metricas.totalContratos, color: '#2dd4a0' },
              { label: 'Usuários do sistema', value: metricas.totalUsuarios, color: '#f97316' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{item.label}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: item.color, fontFamily: 'Syne, sans-serif' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Saúde da conta</h3>
            {[
              { label: 'Agente IA configurado', ok: metricas.totalConversas > 0, info: 'Baseado em conversas ativas' },
              { label: 'Leads importados', ok: metricas.totalLeads > 0, info: `${metricas.totalLeads} leads` },
              { label: 'Campanhas criadas', ok: metricas.totalCampanhas > 0, info: `${metricas.totalCampanhas} campanhas` },
              { label: 'Receita registrada', ok: metricas.receitaTotal > 0, info: fmt(metricas.receitaTotal) },
              { label: 'Equipe configurada', ok: metricas.totalUsuarios > 0, info: `${metricas.totalUsuarios} usuário(s)` },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.ok ? '#22c55e' : '#374151', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '11px', color: item.ok ? '#6b7280' : '#374151' }}>{item.info}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
