'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, FileText, CreditCard, MessageSquare, Upload, Trash2, File, ExternalLink } from 'lucide-react'
import CalculadoraPrev from '@/components/calculadora-prev'

interface Lead {
  id: string
  nome: string
  cpf: string
  telefone: string
  email: string
  status: string
  score: number
  ganho_potencial: number
  nb: string
  tipo_beneficio: string
  dib: string
  der: string
  aps: string
  data_nascimento: string
  idade: number
  sexo: string
  categoria: string
  banco: string
  forma_pagamento: string
  isencao_ir: string
  created_at: string
}

interface Anotacao {
  id: string
  texto: string
  created_at: string
  usuario_id: string
}

interface Documento {
  id: string
  nome: string
  tipo: string
  arquivo_url: string
  arquivo_nome: string
  arquivo_tamanho: number
  arquivo_tipo: string
  descricao: string
  created_at: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: 'Novo', color: '#4f7aff' },
  contacted: { label: 'Contatado', color: '#f5c842' },
  awaiting: { label: 'Aguardando', color: '#a855f7' },
  scheduled: { label: 'Agendado', color: '#2dd4a0' },
  converted: { label: 'Convertido', color: '#22c55e' },
  lost: { label: 'Perdido', color: '#ff5757' },
}

const TIPO_LABEL: Record<string, string> = {
  cnis: '📋 CNIS',
  procuracao: '📜 Procuração',
  identidade: '🪪 Identidade',
  laudo: '🏥 Laudo',
  peticao: '⚖️ Petição',
  outro: '📄 Outro',
}

const TIPOS_DOC = ['cnis', 'procuracao', 'identidade', 'laudo', 'peticao', 'outro']

function formatBytes(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <h3 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: 0, fontWeight: '500' }}>{value ?? '—'}</p>
    </div>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)',
  fontSize: '13px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [loading, setLoading] = useState(true)

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [docForm, setDocForm] = useState({ nome: '', tipo: 'outro', descricao: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchLead() {
      const res = await fetch(`/api/leads/${id}`)
      if (res.ok) {
        const data = await res.json()
        setLead(data.lead)
        setAnotacoes(data.anotacoes || [])
      }
      setLoading(false)
    }
    fetchLead()
    fetchDocumentos()
  }, [id])

  async function fetchDocumentos() {
    const res = await fetch(`/api/leads/${id}/documentos`)
    if (res.ok) setDocumentos(await res.json())
  }

  async function handleUpload() {
    if (!selectedFile || !docForm.nome) return
    setUploadingDoc(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const upRes = await fetch(`/api/leads/${id}/documentos/upload`, { method: 'POST', body: fd })
      if (!upRes.ok) throw new Error('Upload falhou')
      const upData = await upRes.json()

      const saveRes = await fetch(`/api/leads/${id}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: docForm.nome,
          tipo: docForm.tipo,
          descricao: docForm.descricao,
          arquivo_url: upData.url,
          arquivo_nome: upData.nome,
          arquivo_tamanho: upData.tamanho,
          arquivo_tipo: upData.tipo,
        }),
      })
      if (saveRes.ok) {
        setShowUploadForm(false)
        setDocForm({ nome: '', tipo: 'outro', descricao: '' })
        setSelectedFile(null)
        fetchDocumentos()
      }
    } catch (e) {
      console.error(e)
    }
    setUploadingDoc(false)
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm('Remover este documento?')) return
    await fetch(`/api/leads/${id}/documentos?docId=${docId}`, { method: 'DELETE' })
    fetchDocumentos()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
        Carregando...
      </div>
    )
  }

  if (!lead) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Lead não encontrado</p>
        <button onClick={() => router.push('/leads')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          ← Voltar para Leads
        </button>
      </div>
    )
  }

  const status = STATUS_LABEL[lead.status] || { label: lead.status, color: '#888' }

  return (
    <div style={{ padding: '32px', maxWidth: '820px', margin: '0 auto' }}>
      {/* Back */}
      <button
        onClick={() => router.push('/leads')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', marginBottom: '20px', padding: 0 }}
      >
        <ArrowLeft size={15} /> Voltar para Leads
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: '0 0 10px' }}>{lead.nome}</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40`, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>
              {status.label}
            </span>
            {lead.nb && <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>NB {lead.nb}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 20px' }}>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#2dd4a0', fontFamily: 'Syne, sans-serif', margin: 0 }}>{lead.score ?? '—'}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</p>
          </div>
          {lead.ganho_potencial > 0 && (
            <div style={{ textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 20px' }}>
              <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent)', fontFamily: 'Syne, sans-serif', margin: 0 }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.ganho_potencial)}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ganho Potencial</p>
            </div>
          )}
        </div>
      </div>

      <Section icon={<User size={14} />} title="Dados Pessoais">
        <Field label="CPF" value={lead.cpf} />
        <Field label="Data de Nascimento" value={lead.data_nascimento} />
        <Field label="Idade" value={lead.idade ? `${lead.idade} anos` : null} />
        <Field label="Sexo" value={lead.sexo} />
        <Field label="Categoria" value={lead.categoria} />
        <Field label="Telefone" value={lead.telefone} />
        <Field label="E-mail" value={lead.email} />
      </Section>

      <Section icon={<FileText size={14} />} title="Benefício Previdenciário">
        <Field label="NB" value={lead.nb} />
        <Field label="Tipo de Benefício" value={lead.tipo_beneficio} />
        <Field label="DIB" value={lead.dib} />
        <Field label="DER" value={lead.der} />
        <Field label="APS" value={lead.aps} />
        <Field label="Isenção IR" value={lead.isencao_ir} />
      </Section>

      <Section icon={<CreditCard size={14} />} title="Pagamento">
        <Field label="Banco" value={lead.banco} />
        <Field label="Forma de Pagamento" value={lead.forma_pagamento} />
      </Section>

      {/* Documentos */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={14} color="var(--accent)" />
            <h3 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
              Documentos ({documentos.length})
            </h3>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <Upload size={12} /> Anexar documento
          </button>
        </div>

        {/* Formulário de upload */}
        {showUploadForm && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '4px' }}>Nome do documento *</label>
                <input value={docForm.nome} onChange={e => setDocForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: CNIS atualizado" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '4px' }}>Tipo</label>
                <select value={docForm.tipo} onChange={e => setDocForm(f => ({ ...f, tipo: e.target.value }))} style={inputSt}>
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: '4px' }}>Descrição (opcional)</label>
              <input value={docForm.descricao} onChange={e => setDocForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Observações sobre o documento" style={inputSt} />
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${selectedFile ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: selectedFile ? 'rgba(79,122,255,0.05)' : 'transparent', transition: 'all 0.2s', marginBottom: '12px' }}
            >
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              {selectedFile ? (
                <div>
                  <File size={20} color="var(--accent)" style={{ marginBottom: '4px' }} />
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 2px' }}>{selectedFile.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{formatBytes(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload size={20} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 4px' }}>Clique para selecionar o arquivo</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>PDF, Word, imagens, planilhas — até 20MB</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowUploadForm(false); setSelectedFile(null) }}
                style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !docForm.nome || uploadingDoc}
                style={{ fontSize: '13px', fontWeight: '600', color: '#fff', background: (!selectedFile || !docForm.nome || uploadingDoc) ? '#2a2f45' : 'var(--accent)', border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: (!selectedFile || !docForm.nome || uploadingDoc) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s' }}
              >
                {uploadingDoc ? 'Enviando...' : 'Salvar documento'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {documentos.length === 0 && !showUploadForm && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <FileText size={24} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Nenhum documento anexado</p>
          </div>
        )}

        {documentos.map(doc => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--border)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(79,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
              {TIPO_LABEL[doc.tipo]?.split(' ')[0] || '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nome}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                {TIPO_LABEL[doc.tipo]}{doc.arquivo_tamanho ? ` · ${formatBytes(doc.arquivo_tamanho)}` : ''} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
              </p>
              {doc.descricao && <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: '2px 0 0' }}>{doc.descricao}</p>}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <a
                href={doc.arquivo_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--text-muted)' }}
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => handleDeleteDoc(doc.id)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff5757' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Anotações */}
      {anotacoes.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: 'var(--accent)' }}><MessageSquare size={14} /></span>
            <h3 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
              Anotações ({anotacoes.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {anotacoes.map(a => (
              <div key={a.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 6px', lineHeight: 1.5 }}>{a.texto}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                  {new Date(a.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculadora Previdenciária */}
      <CalculadoraPrev leadId={id} />
    </div>
  )
}
