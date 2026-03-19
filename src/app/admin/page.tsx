'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SessionActivityTracker from '@/components/session-activity-tracker'
import { ADMIN_IDLE_MINUTES } from '@/lib/session-config'
import {
  Plus, Building2, Users, CheckCircle, Clock, LogOut,
  Edit2, Trash2, X, Save, MessageSquare, Search,
  TrendingUp, AlertTriangle, ToggleLeft, ToggleRight, Filter, BarChart2,
} from 'lucide-react'

interface Tenant {
  id: string
  nome: string
  slug: string
  cnpj: string
  responsavel_nome: string
  responsavel_email: string
  responsavel_telefone: string
  oab_estado: string
  oab_numero: string
  plano: string
  status: string
  notas: string
  twilio_account_sid?: string | null
  twilio_auth_token?: string | null
  twilio_whatsapp_number?: string | null
  trial_expira_em: string | null
  created_at: string
}

const STATUS: Record<string, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#22c55e' },
  trial:     { label: 'Trial',     color: '#f5c842' },
  suspenso:  { label: 'Suspenso',  color: '#ff5757' },
  cancelado: { label: 'Cancelado', color: '#6b7280' },
}

const PLANO: Record<string, { label: string; color: string; mrr: number }> = {
  entrada:      { label: 'Entrada',      color: '#6b7280', mrr: 1997  },
  profissional: { label: 'Profissional', color: '#4f7aff', mrr: 3497  },
  enterprise:   { label: 'Enterprise',   color: '#7c3aed', mrr: 5000  },
  basico:       { label: 'Básico',       color: '#6b7280', mrr: 1997  },
}

const FORM0 = {
  nome: '', slug: '', cnpj: '',
  responsavel_nome: '', responsavel_email: '', responsavel_telefone: '',
  oab_estado: '', oab_numero: '',
  twilio_account_sid: '', twilio_auth_token: '', twilio_whatsapp_number: '',
  plano: 'profissional', status: 'trial', notas: '',
  trial_expira_em: '',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#080b14', border: '1px solid #1f2937',
  borderRadius: '8px', padding: '8px 10px', color: '#fff',
  fontSize: '13px', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: '700', color: '#9ca3af',
  display: 'block', marginBottom: '4px',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

function FormField({ label, value, onChange, type = 'text', options, col }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; options?: { value: string; label: string }[]; col?: string
}) {
  return (
    <div style={{ gridColumn: col }}>
      <label style={labelStyle}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  )
}

function diasRestantes(data: string | null): number | null {
  if (!data) return null
  const diff = new Date(data).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [metricas, setMetricas] = useState({ totalLeads: 0, totalConversas: 0 })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPlano, setFiltroPlano] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof FORM0>(FORM0)
  const [salvando, setSalvando] = useState(false)
  const [resetandoSenha, setResetandoSenha] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/admin/tenants')
    if (res.status === 401) { router.push('/admin/login'); return }
    if (res.status === 428) { router.push('/admin/reauth?next=/admin'); return }
    const json = await res.json()
    setTenants(json.tenants || [])
    setMetricas(json.metricas || { totalLeads: 0, totalConversas: 0 })
    setLoading(false)
  }

  async function salvar() {
    setSalvando(true)
    const url = editId ? `/api/admin/tenants/${editId}` : '/api/admin/tenants'
    const method = editId ? 'PATCH' : 'POST'
    const body = { ...form, trial_expira_em: form.trial_expira_em || null }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 428) { setSalvando(false); router.push(`/admin/reauth?next=${encodeURIComponent('/admin')}`); return }
    if (res.ok) { fetchData(); fecharForm() }
    setSalvando(false)
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' })
    if (res.status === 428) { router.push('/admin/reauth?next=/admin'); return }
    fetchData()
  }

  async function toggleStatus(t: Tenant) {
    const novoStatus = t.status === 'ativo' ? 'suspenso' : 'ativo'
    setTogglingId(t.id)
    const res = await fetch(`/api/admin/tenants/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    if (res.status === 428) { setTogglingId(null); router.push('/admin/reauth?next=/admin'); return }
    await fetchData()
    setTogglingId(null)
  }

  async function resetarSenha() {
    if (!editId) return
    setResetandoSenha(true)
    setResetMsg('')

    const res = await fetch(`/api/admin/tenants/${editId}/reset-senha`, { method: 'POST' })
    const data = await res.json()

    if (res.status === 428) {
      setResetandoSenha(false)
      router.push(`/admin/reauth?next=${encodeURIComponent('/admin')}`)
      return
    }

    if (res.ok) {
      setResetMsg(`Sucesso: ${data.mensagem}`)
    } else {
      setResetMsg(`Erro: ${data.error || 'Erro ao enviar reset'}`)
    }

    setResetandoSenha(false)
  }

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  function abrirEdicao(t: Tenant) {
    setForm({
      nome: t.nome, slug: t.slug, cnpj: t.cnpj || '',
      responsavel_nome: t.responsavel_nome || '',
      responsavel_email: t.responsavel_email,
      responsavel_telefone: t.responsavel_telefone || '',
      oab_estado: t.oab_estado || '', oab_numero: t.oab_numero || '',
      twilio_account_sid: t.twilio_account_sid || '',
      twilio_auth_token: t.twilio_auth_token || '',
      twilio_whatsapp_number: t.twilio_whatsapp_number || '',
      plano: t.plano, status: t.status, notas: t.notas || '',
      trial_expira_em: t.trial_expira_em ? t.trial_expira_em.split('T')[0] : '',
    })
    setEditId(t.id)
    setResetMsg('')
    setResetandoSenha(false)
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditId(null)
    setForm(FORM0)
    setResetMsg('')
    setResetandoSenha(false)
  }
  function setField(field: keyof typeof FORM0) {
    return (v: string) => setForm(f => ({ ...f, [field]: v }))
  }

  const filtrados = tenants.filter(t => {
    const matchBusca = t.nome.toLowerCase().includes(busca.toLowerCase()) ||
      t.responsavel_email.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = !filtroStatus || t.status === filtroStatus
    const matchPlano = !filtroPlano || t.plano === filtroPlano
    return matchBusca && matchStatus && matchPlano
  })

  const mrr = tenants
    .filter(t => t.status === 'ativo')
    .reduce((acc, t) => acc + (PLANO[t.plano]?.mrr || 0), 0)

  const trialsAlerta = tenants.filter(t => {
    if (t.status !== 'trial') return false
    const dias = diasRestantes(t.trial_expira_em)
    return dias !== null && dias <= 7 && dias >= 0
  })

  const kpis = [
    { label: 'Total', value: tenants.length, color: '#4f7aff', icon: <Building2 size={16} /> },
    { label: 'Ativos', value: tenants.filter(t => t.status === 'ativo').length, color: '#22c55e', icon: <CheckCircle size={16} /> },
    { label: 'Trial', value: tenants.filter(t => t.status === 'trial').length, color: '#f5c842', icon: <Clock size={16} /> },
    { label: 'MRR Est.', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#2dd4a0', icon: <TrendingUp size={16} /> },
    { label: 'Leads', value: metricas.totalLeads.toLocaleString('pt-BR'), color: '#a855f7', icon: <Users size={16} /> },
    { label: 'Conversas', value: metricas.totalConversas.toLocaleString('pt-BR'), color: '#f97316', icon: <MessageSquare size={16} /> },
  ]

  const selectStyle: React.CSSProperties = {
    background: '#111827', border: '1px solid #1f2937', borderRadius: '8px',
    padding: '8px 12px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', fontFamily: 'DM Sans, sans-serif', color: '#fff' }}>
      <SessionActivityTracker mode="admin" idleMinutes={ADMIN_IDLE_MINUTES} touchUrl="/api/admin/session/touch" loginUrl="/admin/login" logoutUrl="/api/admin/auth" />
      <div style={{ height: '56px', background: '#111827', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #4f7aff, #7c3aed)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={15} color="#fff" />
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'Syne, sans-serif' }}>Fluxrow</span>
          <span style={{ fontSize: '11px', background: '#4f7aff20', color: '#4f7aff', border: '1px solid #4f7aff40', borderRadius: '20px', padding: '2px 10px', fontWeight: '600' }}>Admin</span>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9ca3af', background: 'none', border: '1px solid #1f2937', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>
          <LogOut size={13} /> Sair
        </button>
      </div>

      <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
        {trialsAlerta.length > 0 && (
          <div style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={16} color="#f5c842" />
            <span style={{ fontSize: '13px', color: '#f5c842', fontWeight: '600' }}>
              {trialsAlerta.length} trial{trialsAlerta.length > 1 ? 's' : ''} expirando em até 7 dias:
            </span>
            <span style={{ fontSize: '13px', color: '#d1a430' }}>
              {trialsAlerta.map(t => {
                const dias = diasRestantes(t.trial_expira_em)
                return `${t.nome} (${dias}d)`
              }).join(', ')}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                <span style={{ color: k.color }}>{k.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#fff', fontFamily: 'Syne, sans-serif', margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
            <div style={{ position: 'relative', maxWidth: '280px', flex: 1 }}>
              <Search size={14} color="#6b7280" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar escritório ou email..."
                style={{ width: '100%', background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '8px 12px 8px 32px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} color="#6b7280" />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={selectStyle}>
                <option value="">Todos os status</option>
                {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
              <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value)} style={selectStyle}>
                <option value="">Todos os planos</option>
                {Object.entries(PLANO).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}
              </select>
              {(filtroStatus || filtroPlano) && (
                <button onClick={() => { setFiltroStatus(''); setFiltroPlano('') }}
                  style={{ fontSize: '11px', color: '#ff5757', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
                  Limpar
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => { setForm(FORM0); setEditId(null); setResetMsg(''); setResetandoSenha(false); setShowForm(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg, #4f7aff, #7c3aed)', border: 'none', borderRadius: '10px', padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Plus size={14} /> Novo escritório
          </button>
        </div>

        {(filtroStatus || filtroPlano || busca) && (
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
            {filtrados.length} de {tenants.length} escritório{tenants.length !== 1 ? 's' : ''}
          </p>
        )}

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                {['Escritório', 'Responsável / OAB', 'Plano', 'Status', 'Trial / Cadastro', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Carregando...</td></tr>
              )}
              {!loading && filtrados.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Nenhum escritório encontrado</td></tr>
              )}
              {filtrados.map((t, i) => {
                const s = STATUS[t.status] || STATUS.trial
                const p = PLANO[t.plano] || PLANO.profissional
                const dias = diasRestantes(t.trial_expira_em)
                const trialAlerta = t.status === 'trial' && dias !== null && dias <= 7 && dias >= 0
                const trialExpirado = t.status === 'trial' && dias !== null && dias < 0

                return (
                  <tr key={t.id} style={{
                    borderBottom: '1px solid #1f2937',
                    background: i % 2 === 0 ? 'transparent' : '#0d1117',
                    opacity: t.status === 'cancelado' ? 0.5 : 1,
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: '0 0 2px' }}>{t.nome}</p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{t.slug}</p>
                      {t.notas && (
                        <p style={{ fontSize: '11px', color: '#4b5563', margin: '3px 0 0', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.notas}>
                          {t.notas}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '13px', color: '#d1d5db', margin: '0 0 2px' }}>{t.responsavel_nome || '—'}</p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{t.responsavel_email}</p>
                      {t.oab_numero && (
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>OAB/{t.oab_estado} {t.oab_numero}</p>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600' }}>
                        {p.label}
                      </span>
                      <p style={{ fontSize: '11px', color: '#4b5563', margin: '5px 0 0' }}>
                        R$ {p.mrr.toLocaleString('pt-BR')}/mês
                      </p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600' }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280' }}>
                      {t.status === 'trial' && t.trial_expira_em ? (
                        <span style={{ color: trialExpirado ? '#ff5757' : trialAlerta ? '#f5c842' : '#6b7280', fontWeight: trialAlerta || trialExpirado ? '600' : '400' }}>
                          {trialExpirado ? `Expirado há ${Math.abs(dias!)}d` : `${dias}d restantes`}
                        </span>
                      ) : (
                        new Date(t.created_at).toLocaleDateString('pt-BR')
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {(t.status === 'ativo' || t.status === 'suspenso') && (
                          <button
                            onClick={() => toggleStatus(t)}
                            disabled={togglingId === t.id}
                            title={t.status === 'ativo' ? 'Suspender' : 'Ativar'}
                            style={{
                              width: '30px', height: '30px', borderRadius: '7px',
                              background: t.status === 'ativo' ? 'rgba(34,197,94,0.1)' : 'rgba(255,87,87,0.1)',
                              border: `1px solid ${t.status === 'ativo' ? 'rgba(34,197,94,0.25)' : 'rgba(255,87,87,0.25)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: togglingId === t.id ? 'not-allowed' : 'pointer',
                              color: t.status === 'ativo' ? '#22c55e' : '#ff5757',
                              opacity: togglingId === t.id ? 0.5 : 1,
                            }}
                          >
                            {t.status === 'ativo' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/${t.id}`)}
                          title="Ver detalhes"
                          style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(79,122,255,0.1)', border: '1px solid rgba(79,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4f7aff' }}
                        >
                          <BarChart2 size={13} />
                        </button>
                        <button
                          onClick={() => abrirEdicao(t)}
                          title="Editar"
                          style={{ width: '30px', height: '30px', borderRadius: '7px', background: '#1f2937', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => excluir(t.id, t.nome)}
                          title="Excluir"
                          style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff5757' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <>
          <div onClick={fecharForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '580px', maxHeight: '92vh', overflowY: 'auto', background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '28px', zIndex: 1000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', fontFamily: 'Syne, sans-serif', margin: 0 }}>
                {editId ? 'Editar escritório' : 'Novo escritório'}
              </h2>
              <button onClick={fecharForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <FormField label="Nome do escritório *" value={form.nome} onChange={setField('nome')} col="1 / -1" />
              <FormField label="Slug (identificador único)" value={form.slug} onChange={setField('slug')} />
              <FormField label="CNPJ" value={form.cnpj} onChange={setField('cnpj')} />
              <FormField label="Responsável" value={form.responsavel_nome} onChange={setField('responsavel_nome')} />
              <FormField label="Telefone" value={form.responsavel_telefone} onChange={setField('responsavel_telefone')} />
              <FormField label="Email *" value={form.responsavel_email} onChange={setField('responsavel_email')} type="email" col="1 / -1" />
              <FormField label="OAB Estado" value={form.oab_estado} onChange={setField('oab_estado')} />
              <FormField label="OAB Número" value={form.oab_numero} onChange={setField('oab_numero')} />
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #1f2937', paddingTop: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Twilio (opcional — usa credenciais globais se vazio)
                </p>
              </div>
              <FormField label="Account SID" value={form.twilio_account_sid} onChange={setField('twilio_account_sid')} col="1 / -1" />
              <FormField label="Auth Token" value={form.twilio_auth_token} onChange={setField('twilio_auth_token')} />
              <FormField label="Número WhatsApp (ex: whatsapp:+5541...)" value={form.twilio_whatsapp_number} onChange={setField('twilio_whatsapp_number')} />
              <FormField label="Plano" value={form.plano} onChange={setField('plano')} options={[
                { value: 'entrada', label: 'Entrada — R$ 1.997/mês' },
                { value: 'profissional', label: 'Profissional — R$ 3.497/mês' },
                { value: 'enterprise', label: 'Enterprise — R$ 5.000+/mês' },
              ]} />
              <FormField label="Status" value={form.status} onChange={setField('status')} options={[
                { value: 'trial', label: 'Trial' },
                { value: 'ativo', label: 'Ativo' },
                { value: 'suspenso', label: 'Suspenso' },
                { value: 'cancelado', label: 'Cancelado' },
              ]} />
              {form.status === 'trial' && (
                <FormField label="Trial expira em" value={form.trial_expira_em} onChange={setField('trial_expira_em')} type="date" col="1 / -1" />
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notas internas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              {editId && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ height: '1px', background: '#1f2937', margin: '8px 0 16px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#d1d5db', margin: '0 0 3px' }}>
                        Redefinicao de senha
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        Envia email de redefinicao para o responsavel do escritorio
                      </p>
                    </div>
                    <button
                      onClick={resetarSenha}
                      disabled={resetandoSenha}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', borderRadius: '8px',
                        background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)',
                        color: '#f5a623', fontSize: '12px', fontWeight: '600',
                        cursor: resetandoSenha ? 'not-allowed' : 'pointer',
                        opacity: resetandoSenha ? 0.6 : 1, transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { if (!resetandoSenha) (e.currentTarget as HTMLElement).style.background = 'rgba(245,166,35,0.18)' }}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(245,166,35,0.1)'}
                    >
                      {resetandoSenha ? 'Enviando...' : 'Enviar reset de senha'}
                    </button>
                  </div>
                  {resetMsg && (
                    <p style={{
                      marginTop: '10px', fontSize: '12px', padding: '8px 12px',
                      borderRadius: '6px',
                      background: resetMsg.startsWith('Sucesso:') ? 'rgba(34,197,94,0.08)' : 'rgba(255,87,87,0.08)',
                      color: resetMsg.startsWith('Sucesso:') ? '#22c55e' : '#ff5757',
                      border: `1px solid ${resetMsg.startsWith('Sucesso:') ? 'rgba(34,197,94,0.2)' : 'rgba(255,87,87,0.2)'}`,
                    }}>
                      {resetMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button onClick={fecharForm} style={{ fontSize: '13px', color: '#9ca3af', background: 'none', border: '1px solid #1f2937', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!form.nome || !form.responsavel_email || salvando}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#fff', background: (!form.nome || !form.responsavel_email || salvando) ? '#374151' : 'linear-gradient(135deg, #4f7aff, #7c3aed)', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: salvando ? 'not-allowed' : 'pointer' }}
              >
                <Save size={13} /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
