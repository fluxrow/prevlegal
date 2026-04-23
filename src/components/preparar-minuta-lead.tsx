'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

interface LeadPreview {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  nb: string | null
}

interface Template {
  id: string
  nome: string
  tipo: string
  ativo: boolean
  placeholders_definidos: Array<{ key: string; label: string; description: string }>
}

interface Props {
  lead: LeadPreview
}

export default function PrepararMinutaLead({ lead }: Props) {
  const [canUse, setCanUse] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [generated, setGenerated] = useState<{ pdf_url: string } | null>(null)
  const [markingReady, setMarkingReady] = useState(false)

  async function fetchTemplates() {
    const res = await fetch('/api/contract-templates')
    const json = await res.json()
    if (res.status === 403) {
      setCanUse(false)
      return
    }
    if (!res.ok) {
      toast.error(json?.error || 'Não foi possível carregar templates de contrato')
      return
    }
    setCanUse(true)
    setTemplates((json.templates || []).filter((item: Template) => item.ativo))
  }

  useEffect(() => {
    void fetchTemplates()
  }, [])

  useEffect(() => {
    if (!open || !templateId) {
      setPreviewValues({})
      setMissingFields([])
      setManualValues({})
      return
    }

    setLoading(true)
    fetch(`/api/leads/${lead.id}/preparar-minuta?template_id=${templateId}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error || 'Não foi possível montar o preview')
        }
        setPreviewValues(json.preview?.values || {})
        setMissingFields(json.preview?.missing_fields || [])
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Não foi possível montar o preview')
      })
      .finally(() => setLoading(false))
  }, [lead.id, open, templateId])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) || null,
    [templateId, templates],
  )

  async function generatePdf() {
    if (!templateId) {
      toast.error('Selecione um template antes de gerar a minuta.')
      return
    }

    setSaving(true)
    const res = await fetch(`/api/leads/${lead.id}/preparar-minuta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, manual_values: manualValues }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      if (res.status === 422) {
        setMissingFields(json?.missing_fields || [])
        setPreviewValues(json?.preview_values || previewValues)
      }
      toast.error(json?.error || 'Não foi possível gerar a minuta')
      return
    }

    setGenerated({ pdf_url: json.pdf_url })
    setMissingFields([])
    toast.success('Minuta gerada em PDF.')
  }

  async function markReady() {
    setMarkingReady(true)
    const res = await fetch(`/api/leads/${lead.id}/portal-timeline-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: 'Minuta pronta para envio',
        descricao: 'A minuta foi gerada e está pronta para revisão/envio manual pelo operador.',
        visivel_cliente: false,
      }),
    })
    const json = await res.json()
    setMarkingReady(false)

    if (!res.ok) {
      toast.error(json?.error || 'Não foi possível marcar a minuta como pronta para envio')
      return
    }

    toast.success('Minuta marcada como pronta para envio.')
  }

  if (canUse === false) return null
  if (canUse === null) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-hover)',
          color: 'var(--text-primary)',
          borderRadius: '10px',
          padding: '10px 14px',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
        }}
      >
        Preparar minuta
      </button>

      {open ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 8, 20, 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '20px', color: 'var(--text-primary)' }}>
                  Preparar minuta
                </h3>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Gere a minuta com os dados do lead preenchidos e deixe o PDF pronto para revisão/envio manual.
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '22px' }}>
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', background: 'var(--bg-card)' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value)
                    setGenerated(null)
                    setManualValues({})
                    setMissingFields([])
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Selecione o template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nome}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lead</p>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 700 }}>{lead.nome}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {lead.cpf || 'Sem CPF'} · {lead.telefone || 'Sem telefone'} · {lead.email || 'Sem e-mail'}
                    </p>
                  </div>

                  {generated ? (
                    <div style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.08)', borderRadius: '12px', padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>PDF gerado com sucesso</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <a
                          href={generated.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--text-primary)', borderRadius: '10px', padding: '10px 14px', textDecoration: 'none', fontWeight: 600 }}
                        >
                          Abrir PDF
                        </a>
                        <button
                          onClick={markReady}
                          disabled={markingReady}
                          style={{ border: 'none', background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          {markingReady ? 'Marcando...' : 'Marcar como pronto para envio'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', background: 'var(--bg-card)' }}>
                <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Preview dos dados preenchidos
                </p>
                {!templateId ? (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Selecione um template para ver os placeholders preenchidos.</p>
                ) : loading ? (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Montando preview...</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {(selectedTemplate?.placeholders_definidos || []).map((placeholder) => (
                      <div
                        key={placeholder.key}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          background: missingFields.includes(placeholder.key) ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg)',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {placeholder.label}
                        </p>
                        {missingFields.includes(placeholder.key) ? (
                          <>
                            <p style={{ margin: '4px 0 8px', fontSize: '12px', color: '#f59e0b' }}>
                              Campo faltante para gerar o documento. {placeholder.description}
                            </p>
                            <input
                              value={manualValues[placeholder.key] ?? previewValues[placeholder.key] ?? ''}
                              onChange={(event) =>
                                setManualValues((current) => ({
                                  ...current,
                                  [placeholder.key]: event.target.value,
                                }))
                              }
                              style={{
                                width: '100%',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                              }}
                              placeholder={placeholder.description}
                            />
                          </>
                        ) : (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {manualValues[placeholder.key] || previewValues[placeholder.key] || 'Será preenchido automaticamente no momento da geração.'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => setOpen(false)} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer' }}>
                Fechar
              </button>
              <button
                onClick={generatePdf}
                disabled={saving || !templateId}
                style={{ border: 'none', background: saving || !templateId ? '#6b7280' : 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '10px 16px', cursor: saving || !templateId ? 'not-allowed' : 'pointer', fontWeight: 700 }}
              >
                {saving ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
