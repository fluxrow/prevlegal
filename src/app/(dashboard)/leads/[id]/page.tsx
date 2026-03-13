'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, FileText, CreditCard, MessageSquare } from 'lucide-react'

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

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: 'Novo', color: '#4f7aff' },
  contacted: { label: 'Contatado', color: '#f5c842' },
  awaiting: { label: 'Aguardando', color: '#a855f7' },
  scheduled: { label: 'Agendado', color: '#2dd4a0' },
  converted: { label: 'Convertido', color: '#22c55e' },
  lost: { label: 'Perdido', color: '#ff5757' },
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <h3 style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: 'DM Sans, sans-serif',
          margin: 0,
        }}>{title}</h3>
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
      <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', margin: 0, fontWeight: '500' }}>
        {value ?? '—'}
      </p>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [id])

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
      {/* Back button */}
      <button
        onClick={() => router.push('/leads')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: 'var(--text-muted)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
          marginBottom: '20px', padding: 0,
        }}
      >
        <ArrowLeft size={15} /> Voltar para Leads
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: '0 0 10px' }}>
            {lead.nome}
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              background: `${status.color}20`, color: status.color,
              border: `1px solid ${status.color}40`,
              borderRadius: '20px', padding: '3px 12px',
              fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif',
            }}>
              {status.label}
            </span>
            {lead.nb && (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
                NB {lead.nb}
              </span>
            )}
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

      {/* Dados Pessoais */}
      <Section icon={<User size={14} />} title="Dados Pessoais">
        <Field label="CPF" value={lead.cpf} />
        <Field label="Data de Nascimento" value={lead.data_nascimento} />
        <Field label="Idade" value={lead.idade ? `${lead.idade} anos` : null} />
        <Field label="Sexo" value={lead.sexo} />
        <Field label="Categoria" value={lead.categoria} />
        <Field label="Telefone" value={lead.telefone} />
        <Field label="E-mail" value={lead.email} />
      </Section>

      {/* Benefício */}
      <Section icon={<FileText size={14} />} title="Benefício Previdenciário">
        <Field label="NB" value={lead.nb} />
        <Field label="Tipo de Benefício" value={lead.tipo_beneficio} />
        <Field label="DIB" value={lead.dib} />
        <Field label="DER" value={lead.der} />
        <Field label="APS" value={lead.aps} />
        <Field label="Isenção IR" value={lead.isencao_ir} />
      </Section>

      {/* Pagamento */}
      <Section icon={<CreditCard size={14} />} title="Pagamento">
        <Field label="Banco" value={lead.banco} />
        <Field label="Forma de Pagamento" value={lead.forma_pagamento} />
      </Section>

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
    </div>
  )
}
