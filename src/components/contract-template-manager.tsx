'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

interface PlaceholderDefinition {
  key: string
  label: string
  description: string
}

interface ContractTemplate {
  id: string
  nome: string
  tipo: string
  corpo_html: string
  placeholders_definidos: PlaceholderDefinition[]
  ativo: boolean
  created_at: string
}

const EMPTY_FORM = {
  nome: '',
  tipo: 'honorarios_planejamento',
  corpo_html: '',
  ativo: true,
}

export default function ContractTemplateManager() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [placeholders, setPlaceholders] = useState<PlaceholderDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  async function fetchTemplates() {
    setLoading(true)
    const res = await fetch('/api/contract-templates')
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Não foi possível carregar os templates')
      setLoading(false)
      return
    }
    setTemplates(json.templates || [])
    setPlaceholders(json.availablePlaceholders || [])
    setLoading(false)
  }

  useEffect(() => {
    void fetchTemplates()
  }, [])

  const detectedPlaceholders = useMemo(() => {
    return placeholders.filter((item) => form.corpo_html.includes(`{{${item.key}}}`))
  }, [form.corpo_html, placeholders])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function startEdit(template: ContractTemplate) {
    setEditingId(template.id)
    setForm({
      nome: template.nome,
      tipo: template.tipo,
      corpo_html: template.corpo_html,
      ativo: template.ativo,
    })
  }

  async function saveTemplate() {
    if (!form.nome.trim() || !form.corpo_html.trim()) {
      toast.error('Preencha nome e corpo do template.')
      return
    }

    setSaving(true)
    const url = editingId ? `/api/contract-templates/${editingId}` : '/api/contract-templates'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        placeholders_definidos: detectedPlaceholders,
      }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(json?.error || 'Não foi possível salvar o template')
      return
    }

    toast.success(editingId ? 'Template atualizado.' : 'Template criado.')
    setEditingId(null)
    setForm(EMPTY_FORM)
    await fetchTemplates()
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm('Excluir este template de contrato?')) return
    const res = await fetch(`/api/contract-templates/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error || 'Não foi possível excluir o template')
      return
    }
    toast.success('Template excluído.')
    await fetchTemplates()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    display: 'block',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '18px', color: 'var(--text-primary)' }}>
              Templates do escritório
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Cadastre a minuta padrão e mantenha versões ativas para o fluxo comercial.
            </p>
          </div>
          <button
            onClick={startCreate}
            style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
          >
            Novo template
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Carregando templates...</p>
        ) : templates.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Nenhum template cadastrado ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {templates.map((template) => (
              <div key={template.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{template.nome}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {template.tipo} · {template.ativo ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEdit(template)} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => deleteTemplate(template.id)} style={{ border: '1px solid rgba(255,87,87,0.25)', background: 'rgba(255,87,87,0.08)', color: '#ff5757', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                      Excluir
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {template.corpo_html.slice(0, 220)}
                  {template.corpo_html.length > 220 ? '…' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
          <h2 style={{ margin: '0 0 16px', fontFamily: 'Syne, sans-serif', fontSize: '18px', color: 'var(--text-primary)' }}>
            {editingId ? 'Editar template' : 'Criar template'}
          </h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input value={form.nome} onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))} style={inputStyle} placeholder="Contrato Padrão Planejamento Previdenciário" />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm((current) => ({ ...current, tipo: e.target.value }))} style={inputStyle}>
                <option value="honorarios_planejamento">Honorários de planejamento</option>
                <option value="honorarios_beneficio">Honorários de benefício</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Corpo HTML</label>
              <textarea
                value={form.corpo_html}
                onChange={(e) => setForm((current) => ({ ...current, corpo_html: e.target.value }))}
                style={{ ...inputStyle, minHeight: '280px', resize: 'vertical' }}
                placeholder="<p>{{cliente_nome}}</p>"
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((current) => ({ ...current, ativo: e.target.checked }))}
              />
              Template ativo para uso
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={startCreate} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer' }}>
                Limpar
              </button>
              <button onClick={saveTemplate} disabled={saving} style={{ border: 'none', background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar template' : 'Criar template'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
          <h2 style={{ margin: '0 0 14px', fontFamily: 'Syne, sans-serif', fontSize: '18px', color: 'var(--text-primary)' }}>
            Placeholders disponíveis
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {placeholders.map((placeholder) => (
              <div key={placeholder.key} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', background: form.corpo_html.includes(`{{${placeholder.key}}}`) ? 'rgba(79,122,255,0.08)' : 'var(--bg-card)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {placeholder.label}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <code style={{ fontFamily: 'DM Mono, monospace' }}>{`{{${placeholder.key}}}`}</code> · {placeholder.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
