'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { CONTACT_TARGET_OPTIONS } from '@/lib/contact-target'

type EditableLead = {
  id: string
  nome: string
  cpf?: string | null
  telefone?: string | null
  telefone_enriquecido?: string | null
  contato_abordagem_tipo?: string | null
  contato_abordagem_origem?: string | null
  contato_alternativo_tipo?: string | null
  contato_alternativo_origem?: string | null
  email?: string | null
  anotacao?: string | null
  status?: string | null
  nb?: string | null
  nit?: string | null
  banco?: string | null
  tipo_beneficio?: string | null
  aps?: string | null
  data_nascimento?: string | null
  sexo?: string | null
  categoria_profissional?: string | null
  categoria?: string | null
  dib?: string | null
  der?: string | null
  forma_pagamento?: string | null
  isencao_ir?: string | null
  pensionista?: string | null
  bloqueado?: boolean | null
  ganho_potencial?: number | null
  valor_rma?: number | null
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'awaiting', label: 'Aguardando' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
]

const CONTACT_EDIT_OPTIONS = [
  { value: '', label: 'Não definido' },
  ...CONTACT_TARGET_OPTIONS.filter((option) => option.value),
]

function toDateInput(value?: string | null) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function toText(value?: string | null) {
  return String(value || '')
}

function toNumberText(value?: number | null) {
  return value === null || value === undefined ? '' : String(value)
}

function buildInitialForm(lead: EditableLead) {
  return {
    nome: lead.nome || '',
    telefone: toText(lead.telefone),
    telefone_enriquecido: toText(lead.telefone_enriquecido),
    contato_abordagem_tipo: toText(lead.contato_abordagem_tipo),
    contato_abordagem_origem: toText(lead.contato_abordagem_origem),
    contato_alternativo_tipo: toText(lead.contato_alternativo_tipo),
    contato_alternativo_origem: toText(lead.contato_alternativo_origem),
    email: toText(lead.email),
    anotacao: toText(lead.anotacao),
    cpf: toText(lead.cpf),
    status: lead.status || 'new',
    nb: toText(lead.nb),
    nit: toText(lead.nit),
    banco: toText(lead.banco),
    tipo_beneficio: toText(lead.tipo_beneficio),
    aps: toText(lead.aps),
    data_nascimento: toDateInput(lead.data_nascimento),
    sexo: toText(lead.sexo),
    categoria_profissional: toText(lead.categoria_profissional || lead.categoria),
    dib: toDateInput(lead.dib),
    der: toDateInput(lead.der),
    forma_pagamento: toText(lead.forma_pagamento),
    isencao_ir: toText(lead.isencao_ir),
    pensionista: toText(lead.pensionista),
    bloqueado: lead.bloqueado ? 'true' : 'false',
    ganho_potencial: toNumberText(lead.ganho_potencial),
    valor_rma: toNumberText(lead.valor_rma),
  }
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(3px)',
  zIndex: 220,
}

const modalStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(880px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 48px)',
  overflowY: 'auto',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  zIndex: 221,
  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  options,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
        {label}
      </label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, minHeight: '92px', resize: 'vertical' }} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} placeholder={placeholder} />
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 16px' }}>
        {children}
      </div>
    </div>
  )
}

export default function EditarLeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: EditableLead
  onClose: () => void
  onSaved: (lead: EditableLead) => void
}) {
  const [form, setForm] = useState(() => buildInitialForm(lead))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(buildInitialForm(lead))
    setError('')
  }, [lead])

  async function save() {
    if (!form.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setSaving(true)
    setError('')

    const response = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error || 'Não foi possível salvar o lead')
      setSaving(false)
      return
    }

    onSaved(data.lead)
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={modalStyle}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
              Editar Lead
            </p>
            <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{lead.nome}</h2>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Atualize os dados do lead conforme a conversa avance, sem depender de importação nova.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'grid', gap: '16px' }}>
          {error ? (
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.18)', color: '#ff8d8d', fontSize: '12px' }}>
              {error}
            </div>
          ) : null}

          <Section title="Contato e CRM">
            <Field label="Nome" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} />
            <Field label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={STATUS_OPTIONS} />
            <Field label="Contato de abordagem" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} />
            <Field label="Tipo do contato de abordagem" value={form.contato_abordagem_tipo} onChange={(value) => setForm((prev) => ({ ...prev, contato_abordagem_tipo: value }))} options={CONTACT_EDIT_OPTIONS} />
            <Field label="Origem do contato de abordagem" value={form.contato_abordagem_origem} onChange={(value) => setForm((prev) => ({ ...prev, contato_abordagem_origem: value }))} />
            <Field label="Contato enriquecido / alternativo" value={form.telefone_enriquecido} onChange={(value) => setForm((prev) => ({ ...prev, telefone_enriquecido: value }))} />
            <Field label="Tipo do contato alternativo" value={form.contato_alternativo_tipo} onChange={(value) => setForm((prev) => ({ ...prev, contato_alternativo_tipo: value }))} options={CONTACT_EDIT_OPTIONS} />
            <Field label="Origem do contato alternativo" value={form.contato_alternativo_origem} onChange={(value) => setForm((prev) => ({ ...prev, contato_alternativo_origem: value }))} />
            <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} type="email" />
            <Field label="CPF" value={form.cpf} onChange={(value) => setForm((prev) => ({ ...prev, cpf: value }))} />
            <Field label="NB" value={form.nb} onChange={(value) => setForm((prev) => ({ ...prev, nb: value }))} />
          </Section>

          <Section title="Contexto de abordagem">
            <div style={{ gridColumn: '1 / -1' }}>
              <Field
                label="Contatos relacionados e contexto operacional"
                value={form.anotacao}
                onChange={(value) => setForm((prev) => ({ ...prev, anotacao: value }))}
                placeholder="Ex.: contato veio do filho, celular alternativo do titular, usar abordagem indireta"
                multiline
              />
            </div>
          </Section>

          <Section title="Benefício e elegibilidade">
            <Field label="NIT" value={form.nit} onChange={(value) => setForm((prev) => ({ ...prev, nit: value }))} />
            <Field label="Banco" value={form.banco} onChange={(value) => setForm((prev) => ({ ...prev, banco: value }))} />
            <Field label="Tipo de benefício" value={form.tipo_beneficio} onChange={(value) => setForm((prev) => ({ ...prev, tipo_beneficio: value }))} />
            <Field label="APS" value={form.aps} onChange={(value) => setForm((prev) => ({ ...prev, aps: value }))} />
            <Field label="DIB" value={form.dib} onChange={(value) => setForm((prev) => ({ ...prev, dib: value }))} type="date" />
            <Field label="DER" value={form.der} onChange={(value) => setForm((prev) => ({ ...prev, der: value }))} type="date" />
          </Section>

          <Section title="Perfil do cliente">
            <Field label="Nascimento" value={form.data_nascimento} onChange={(value) => setForm((prev) => ({ ...prev, data_nascimento: value }))} type="date" />
            <Field label="Sexo" value={form.sexo} onChange={(value) => setForm((prev) => ({ ...prev, sexo: value }))} />
            <Field label="Categoria" value={form.categoria_profissional} onChange={(value) => setForm((prev) => ({ ...prev, categoria_profissional: value }))} />
            <Field label="Pensionista" value={form.pensionista} onChange={(value) => setForm((prev) => ({ ...prev, pensionista: value }))} />
            <Field label="Forma de pagamento" value={form.forma_pagamento} onChange={(value) => setForm((prev) => ({ ...prev, forma_pagamento: value }))} />
            <Field label="Isenção IR" value={form.isencao_ir} onChange={(value) => setForm((prev) => ({ ...prev, isencao_ir: value }))} />
          </Section>

          <Section title="Potencial e risco">
            <Field label="Ganho potencial" value={form.ganho_potencial} onChange={(value) => setForm((prev) => ({ ...prev, ganho_potencial: value }))} type="number" placeholder="0.00" />
            <Field label="Valor RMA" value={form.valor_rma} onChange={(value) => setForm((prev) => ({ ...prev, valor_rma: value }))} type="number" placeholder="0.00" />
            <Field
              label="Benefício bloqueado"
              value={form.bloqueado}
              onChange={(value) => setForm((prev) => ({ ...prev, bloqueado: value }))}
              options={[
                { value: 'false', label: 'Não' },
                { value: 'true', label: 'Sim' },
              ]}
            />
          </Section>
        </div>

        <div style={{ padding: '18px 22px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            As alterações ficam salvas direto no lead e passam a valer para as próximas interações.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
