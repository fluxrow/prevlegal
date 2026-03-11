'use client'
import { useEffect, useState } from 'react'
import { Megaphone, Plus, CheckCircle, Clock, FileText, Users, Zap } from 'lucide-react'

interface Campanha {
  id: string
  nome: string
  status: string
  total_leads: number
  total_enviados: number
  total_falhos: number
  total_respondidos: number
  mensagem_template: string
  created_at: string
  listas?: { nome: string }
}

interface Lista {
  id: string
  nome: string
  total_leads: number
  com_whatsapp: number
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#94a3b8', bg: '#94a3b820' },
  ativa:     { label: 'Ativa',     color: '#22c55e', bg: '#22c55e20' },
  pausada:   { label: 'Pausada',   color: '#f59e0b', bg: '#f59e0b20' },
  concluida: { label: 'Concluída', color: '#4f7aff', bg: '#4f7aff20' },
  cancelada: { label: 'Cancelada', color: '#ef4444', bg: '#ef444420' },
}

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [disparando, setDisparando] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', lista_id: '', mensagem_template: '',
    delay_min_ms: 1500, delay_max_ms: 3500,
    tamanho_lote: 50, pausa_entre_lotes_s: 30,
    limite_diario: 500, apenas_verificados: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [c, l] = await Promise.all([
      fetch('/api/campanhas').then(r => r.json()),
      fetch('/api/listas').then(r => r.json())
    ])
    setCampanhas(c.campanhas || [])
    setListas(l.listas || [])
    setLoading(false)
  }

  async function criarCampanha() {
    setSaving(true)
    const res = await fetch('/api/campanhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ nome: '', lista_id: '', mensagem_template: '', delay_min_ms: 1500, delay_max_ms: 3500, tamanho_lote: 50, pausa_entre_lotes_s: 30, limite_diario: 500, apenas_verificados: true })
      await fetchAll()
    }
    setSaving(false)
  }

  async function disparar(id: string) {
    if (!confirm('Confirmar disparo da campanha? O processo iniciará imediatamente.')) return
    setDisparando(id)
    const res = await fetch(`/api/campanhas/${id}/disparar`, { method: 'POST' })
    const data = await res.json()
    if (data.success) alert(`✅ Disparo concluído: ${data.enviados} enviados, ${data.falhos} falhos`)
    else alert('❌ Erro: ' + data.error)
    setDisparando(null)
    await fetchAll()
  }

  const pct = (n: number, t: number) => t > 0 ? Math.round((n / t) * 100) : 0

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Campanhas</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Crie e dispare campanhas de WhatsApp para suas listas de leads
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px',
          borderRadius: '8px', background: 'var(--accent)', color: '#fff',
          border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
        }}>
          <Plus size={14} /> Nova campanha
        </button>
      </div>

      {/* Formulário nova campanha */}
      {showForm && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '24px', marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>
            Nova Campanha
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nome da campanha *</label>
              <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Disparo NOMES RJ BNG - Março" style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--bg-hover)',
                  color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box'
                }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Lista de leads *</label>
              <select value={form.lista_id} onChange={e => setForm(p => ({ ...p, lista_id: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--bg-hover)',
                  color: 'var(--text-primary)', fontSize: '13px'
                }}>
                <option value="">Selecionar lista...</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nome} ({l.com_whatsapp} com WhatsApp)</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Mensagem template * — use {'{nome}'}, {'{nb}'}, {'{banco}'}, {'{valor}'}, {'{ganho}'}
            </label>
            <textarea value={form.mensagem_template} onChange={e => setForm(p => ({ ...p, mensagem_template: e.target.value }))}
              rows={4} placeholder="Olá {nome}! Identificamos que o seu benefício {nb} pode ter direito a revisão..." style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg-hover)',
                color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box'
              }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { key: 'limite_diario', label: 'Limite diário', suffix: 'msgs' },
              { key: 'tamanho_lote', label: 'Tamanho do lote', suffix: 'msgs' },
              { key: 'pausa_entre_lotes_s', label: 'Pausa entre lotes', suffix: 's' },
              { key: 'delay_min_ms', label: 'Delay mínimo', suffix: 'ms' },
            ].map(({ key, label, suffix }) => (
              <div key={key}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input type="number" value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--bg-hover)',
                    color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box'
                  }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{suffix}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <input type="checkbox" id="apenas_verificados" checked={form.apenas_verificados}
              onChange={e => setForm(p => ({ ...p, apenas_verificados: e.target.checked }))} />
            <label htmlFor="apenas_verificados" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Enviar apenas para leads com WhatsApp verificado
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={criarCampanha} disabled={saving || !form.nome || !form.lista_id || !form.mensagem_template} style={{
              padding: '9px 20px', borderRadius: '8px', background: 'var(--accent)',
              color: '#fff', border: 'none', fontSize: '13px', fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1
            }}>
              {saving ? 'Salvando...' : 'Criar campanha'}
            </button>
            <button onClick={() => setShowForm(false)} style={{
              padding: '9px 20px', borderRadius: '8px', background: 'transparent',
              color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer'
            }}>Cancelar</button>
          </div>
        </div>
      )}

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando campanhas...</div>}

      {!loading && campanhas.length === 0 && !showForm && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)'
        }}>
          <Megaphone size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '14px' }}>Nenhuma campanha criada</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Crie uma campanha para disparar mensagens para seus leads</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {campanhas.map(c => {
          const st = STATUS_LABEL[c.status] || STATUS_LABEL.rascunho
          const pctEnv = pct(c.total_enviados, c.total_leads)
          const isDisparando = disparando === c.id
          return (
            <div key={c.id} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.nome}</h3>
                    <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '99px', color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {c.listas?.nome} · {c.total_leads.toLocaleString('pt-BR')} leads · criada em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {['rascunho', 'pausada'].includes(c.status) && (
                  <button onClick={() => disparar(c.id)} disabled={isDisparando} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                    borderRadius: '8px', background: isDisparando ? 'var(--bg-hover)' : '#22c55e20',
                    color: isDisparando ? 'var(--text-muted)' : '#22c55e',
                    border: '1px solid ' + (isDisparando ? 'var(--border)' : '#22c55e40'),
                    fontSize: '12px', fontWeight: '500', cursor: isDisparando ? 'not-allowed' : 'pointer'
                  }}>
                    <Zap size={13} />
                    {isDisparando ? 'Disparando...' : 'Disparar agora'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
                {[
                  { label: 'Enviados', value: c.total_enviados, color: '#4f7aff' },
                  { label: 'Respondidos', value: c.total_respondidos || 0, color: '#22c55e' },
                  { label: 'Falhos', value: c.total_falhos || 0, color: '#ef4444' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color }}>{value}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{label}</span>
                  </div>
                ))}
              </div>

              {c.total_leads > 0 && (
                <div style={{ height: '4px', borderRadius: '99px', background: 'var(--bg-hover)', overflow: 'hidden' }}>
                  <div style={{ width: pctEnv + '%', background: 'var(--accent)', transition: 'width 0.4s' }} />
                </div>
              )}

              {c.mensagem_template && (
                <div style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                  background: 'var(--bg-hover)', fontSize: '12px', color: 'var(--text-muted)',
                  fontStyle: 'italic', whiteSpace: 'pre-wrap'
                }}>
                  "{c.mensagem_template.substring(0, 120)}{c.mensagem_template.length > 120 ? '...' : ''}"
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
