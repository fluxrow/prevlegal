'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface Step {
  ordem: number
  delay_horas: number
  canal: 'whatsapp' | 'portal'
  mensagem: string
}

interface Rule {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  followup_rule_steps: (Step & { id: string })[]
}

const DEFAULT_STEP: Step = { ordem: 1, delay_horas: 24, canal: 'whatsapp', mensagem: '' }

function StepEditor({
  step,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  step: Step
  index: number
  onChange: (s: Step) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>{index + 1}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 0 100px' }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Delay (horas)</label>
            <input
              type="number"
              min={1}
              value={step.delay_horas}
              onChange={e => onChange({ ...step, delay_horas: Number(e.target.value) })}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 0 110px' }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Canal</label>
            <select
              value={step.canal}
              onChange={e => onChange({ ...step, canal: e.target.value as 'whatsapp' | 'portal' })}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', width: '100%' }}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="portal">Portal</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Mensagem</label>
          <textarea
            value={step.mensagem}
            onChange={e => onChange({ ...step, mensagem: e.target.value })}
            placeholder="Ex: Olá {nome}, ainda tem interesse em analisar seu benefício?"
            rows={2}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', lineHeight: '1.4' }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            Variáveis: {'{nome}'}, {'{nb}'}, {'{escritorio}'}
          </span>
        </div>
      </div>
      {canRemove && (
        <button onClick={onRemove} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff6b6b', padding: '4px', flexShrink: 0 }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function RuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Rule
  onSave: () => void
  onCancel: () => void
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [descricao, setDescricao] = useState(initial?.descricao ?? '')
  const [steps, setSteps] = useState<Step[]>(
    initial?.followup_rule_steps?.length
      ? [...initial.followup_rule_steps].sort((a, b) => a.ordem - b.ordem)
      : [{ ...DEFAULT_STEP }]
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function addStep() {
    setSteps(prev => [...prev, { ...DEFAULT_STEP, ordem: prev.length + 1, delay_horas: 24 * (prev.length + 1) }])
  }

  function updateStep(i: number, s: Step) {
    setSteps(prev => prev.map((p, idx) => idx === i ? s : p))
  }

  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, ordem: idx + 1 })))
  }

  async function salvar() {
    if (!nome.trim()) { setErro('Nome obrigatório'); return }
    const passos = steps.filter(s => s.mensagem.trim())
    if (!passos.length) { setErro('Pelo menos um passo com mensagem é obrigatório'); return }

    setSalvando(true)
    setErro(null)

    if (initial) {
      // Editar nome/descricao
      await fetch(`/api/followup/rules/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), descricao: descricao.trim() || null }),
      })
      // Substituir steps
      await fetch(`/api/followup/rules/${initial.id}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: passos.map((s, i) => ({ ...s, ordem: i + 1 })) }),
      })
    } else {
      const res = await fetch('/api/followup/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), descricao: descricao.trim() || null, steps: passos.map((s, i) => ({ ...s, ordem: i + 1 })) }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErro(d?.error || 'Erro ao salvar')
        setSalvando(false)
        return
      }
    }

    setSalvando(false)
    onSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Nome da regra</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Follow-up lead frio 3 dias"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Descrição (opcional)</label>
          <input
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: Para leads que não responderam em 3 dias"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Passos da sequência</span>
          <button
            onClick={addStep}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', padding: '5px 10px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <Plus size={11} /> Adicionar passo
          </button>
        </div>
        {steps.map((s, i) => (
          <StepEditor key={i} step={s} index={i} onChange={u => updateStep(i, u)} onRemove={() => removeStep(i)} canRemove={steps.length > 1} />
        ))}
      </div>

      {erro && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif' }}>{erro}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => void salvar()}
          disabled={salvando}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
        >
          <Save size={13} /> {salvando ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar regra'}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function FollowupConfig() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [erroRemover, setErroRemover] = useState<string | null>(null)

  async function fetchRules() {
    const res = await fetch('/api/followup/rules')
    if (res.ok) setRules(await res.json())
    setLoading(false)
  }

  useEffect(() => { void fetchRules() }, [])

  async function toggleAtivo(rule: Rule) {
    await fetch(`/api/followup/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !rule.ativo }),
    })
    await fetchRules()
  }

  async function remover(id: string) {
    setRemovendo(id)
    setErroRemover(null)
    const res = await fetch(`/api/followup/rules/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => null)
      setErroRemover(d?.error || 'Erro ao remover')
    } else {
      await fetchRules()
    }
    setRemovendo(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="var(--accent)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>Regras de Follow-up</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Configure as sequências de mensagens automáticas por lead</p>
          </div>
        </div>
        {!criando && (
          <button
            onClick={() => { setCriando(true); setEditando(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            <Plus size={13} /> Nova regra
          </button>
        )}
      </div>

      {criando && (
        <div style={{ marginBottom: '20px', padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--accent)40' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '700', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nova regra</h3>
          <RuleForm onSave={() => { setCriando(false); void fetchRules() }} onCancel={() => setCriando(false)} />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Carregando...</p>
      ) : rules.length === 0 && !criando ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '12px', border: '1px dashed var(--border)' }}>
          <Zap size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Nenhuma regra cadastrada ainda.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', margin: '4px 0 0' }}>Crie a primeira regra para começar a usar follow-ups nos seus leads.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rules.map(rule => {
            const aberto = expandido === rule.id
            const emEdicao = editando === rule.id
            return (
              <div key={rule.id} style={{ borderRadius: '12px', border: `1px solid ${rule.ativo ? 'var(--border)' : 'var(--border)'}`, overflow: 'hidden', opacity: rule.ativo ? 1 : 0.6 }}>
                <div
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'var(--bg-surface)' }}
                  onClick={() => setExpandido(aberto ? null : rule.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{rule.nome}</span>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', background: rule.ativo ? '#2dd4a020' : '#4a506020', color: rule.ativo ? '#2dd4a0' : 'var(--text-muted)', fontWeight: '700' }}>
                        {rule.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    {rule.descricao && (
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{rule.descricao}</p>
                    )}
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                      {rule.followup_rule_steps?.length ?? 0} passo(s) · {
                        rule.followup_rule_steps?.sort((a, b) => a.ordem - b.ordem).map(s => `+${s.delay_horas}h`).join(' → ')
                      }
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => void toggleAtivo(rule)}
                      style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', background: rule.ativo ? '#f59e0b20' : '#2dd4a020', color: rule.ativo ? '#f59e0b' : '#2dd4a0', border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {rule.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => { setEditando(emEdicao ? null : rule.id); setExpandido(rule.id) }}
                      style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '7px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {emEdicao ? 'Cancelar' : 'Editar'}
                    </button>
                    <button
                      onClick={() => void remover(rule.id)}
                      disabled={removendo === rule.id}
                      style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #ff6b6b40', borderRadius: '7px', cursor: 'pointer', color: '#ff6b6b' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {aberto ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                </div>

                {aberto && (
                  <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    {emEdicao ? (
                      <RuleForm
                        initial={rule}
                        onSave={() => { setEditando(null); void fetchRules() }}
                        onCancel={() => setEditando(null)}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {rule.followup_rule_steps?.sort((a, b) => a.ordem - b.ordem).map((s, i) => (
                          <div key={s.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '9px', fontWeight: '700', color: '#fff' }}>{i + 1}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: '0 0 3px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                                +{s.delay_horas}h · via {s.canal}
                              </p>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.4', wordBreak: 'break-word' }}>{s.mensagem}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {erroRemover && (
            <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif' }}>{erroRemover}</p>
          )}
        </div>
      )}
    </div>
  )
}
