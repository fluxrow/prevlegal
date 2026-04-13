'use client'
import { useState } from 'react'
import { X, User, Phone, CreditCard, Building2, Save, UserPlus } from 'lucide-react'

interface Props {
  onClose: () => void
  onCriado: (lead: unknown) => void
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

const BANCOS = ['BB', 'Bradesco', 'Caixa', 'Itaú', 'Santander', 'BRB', 'Sicoob', 'Sicredi', 'Outro']
const STATUS_OPCOES = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'awaiting', label: 'Aguardando' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'converted', label: 'Convertido' },
]

function NovoLeadSection({ icon, title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{children}</div>
    </div>
  )
}

export default function NovoLeadModal({ onClose, onCriado }: Props) {
  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', nb: '',
    banco: '', valor_rma: '', ganho_potencial: '',
    status: 'new', tem_whatsapp: true,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setErro('')
  }

  function formatCpf(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
  }

  function formatTel(v: string) {
    return v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15)
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    if (!form.telefone.trim()) { setErro('Telefone é obrigatório'); return }
    setSalvando(true)
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setErro(json.error || 'Erro ao criar lead'); setSalvando(false); return }
    onCriado(json.lead)
    onClose()
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '9px', padding: '9px 12px', color: 'var(--text-primary)',
    fontSize: '13px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '520px', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '28px', zIndex: 1000,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(79,122,255,0.12)', border: '1px solid rgba(79,122,255,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={16} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>Novo lead</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Cadastro manual — cliente avulso</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Dados pessoais */}
        <NovoLeadSection icon={<User size={14} />} title="Dados pessoais">
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Nome completo *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Maria da Silva" style={inp} />
          </div>
          <div>
            <label style={lbl}>Telefone *</label>
            <input value={form.telefone} onChange={e => set('telefone', formatTel(e.target.value))} placeholder="(41) 99999-9999" style={inp} />
          </div>
          <div>
            <label style={lbl}>CPF (opcional)</label>
            <input value={form.cpf} onChange={e => set('cpf', formatCpf(e.target.value))} placeholder="000.000.000-00" style={inp} />
          </div>
          {/* Toggle WhatsApp */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>💬</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tem WhatsApp</span>
            </div>
            <button onClick={() => set('tem_whatsapp', !form.tem_whatsapp)}
              style={{ width: '40px', height: '22px', borderRadius: '11px', background: form.tem_whatsapp ? 'var(--green)' : 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: '2px', left: form.tem_whatsapp ? '20px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
            </button>
          </div>
        </NovoLeadSection>

        {/* Dados do benefício */}
        <NovoLeadSection icon={<CreditCard size={14} />} title="Dados do benefício">
          <div>
            <label style={lbl}>Número do benefício (NB)</label>
            <input value={form.nb} onChange={e => set('nb', e.target.value)} placeholder="000.000.000-0" style={inp} />
          </div>
          <div>
            <label style={lbl}>Banco</label>
            <select value={form.banco} onChange={e => set('banco', e.target.value)} style={inp}>
              <option value="">Selecione</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Valor RMA (R$)</label>
            <input type="number" value={form.valor_rma} onChange={e => set('valor_rma', e.target.value)} placeholder="0,00" style={inp} />
          </div>
          <div>
            <label style={lbl}>Ganho potencial (R$)</label>
            <input type="number" value={form.ganho_potencial} onChange={e => set('ganho_potencial', e.target.value)} placeholder="0,00" style={inp} />
          </div>
        </NovoLeadSection>

        {/* Status inicial */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
            <span style={{ color: 'var(--accent)' }}><Building2 size={14} /></span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status inicial</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATUS_OPCOES.map(s => (
              <button key={s.value} onClick={() => set('status', s.value)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'DM Sans', transition: 'all 0.15s',
                  background: form.status === s.value ? 'rgba(79,122,255,0.15)' : 'var(--bg)',
                  border: `1px solid ${form.status === s.value ? 'rgba(79,122,255,0.4)' : 'var(--border)'}`,
                  color: form.status === s.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '8px', padding: '9px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--red)' }}>
            {erro}
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 18px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !form.nome || !form.telefone}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: '600',
              color: '#fff', background: (!form.nome || !form.telefone || salvando) ? 'var(--bg-hover)' : 'var(--accent)',
              border: 'none', borderRadius: '9px', padding: '9px 20px',
              cursor: (!form.nome || !form.telefone || salvando) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans',
            }}>
            <Save size={13} /> {salvando ? 'Salvando...' : 'Criar lead'}
          </button>
        </div>
      </div>
    </>
  )
}
