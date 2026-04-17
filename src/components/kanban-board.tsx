'use client'

import { useState } from 'react'
import { DollarSign, User, ChevronDown, MessageSquare } from 'lucide-react'
import LeadDrawer from './lead-drawer'
import ModalMsgLead from './modal-msg-lead'
import { getContactTargetLabel } from '@/lib/contact-target'

type Lead = {
  id: string
  nome: string
  nb: string
  telefone?: string | null
  status: string
  score: number
  ganho_potencial: number | null
  tipo_beneficio: string | null
  banco: string | null
  origem?: string | null
  contato_abordagem_tipo?: string | null
}

type Column = {
  id: string
  label: string
  color: string
  bg: string
  border: string
}

const COLUMNS: Column[] = [
  { id: 'new',       label: 'Novos',      color: '#4f7aff', bg: '#4f7aff12', border: '#4f7aff30' },
  { id: 'contacted', label: 'Contatados', color: '#f5c842', bg: '#f5c84212', border: '#f5c84230' },
  { id: 'awaiting',  label: 'Aguardando', color: '#ff8c42', bg: '#ff8c4212', border: '#ff8c4230' },
  { id: 'scheduled', label: 'Agendados',  color: '#a78bfa', bg: '#a78bfa12', border: '#a78bfa30' },
  { id: 'converted', label: 'Convertidos',color: '#2dd4a0', bg: '#2dd4a012', border: '#2dd4a030' },
  { id: 'lost',      label: 'Perdidos',   color: '#ff5757', bg: '#ff575712', border: '#ff575730' },
]

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  }).format(v)
}

function LeadCard({
  lead,
  onStatusChange,
  onOpen,
}: {
  lead: Lead
  onStatusChange: (id: string, status: string) => void
  onOpen: (id: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const scoreColor = lead.score >= 80 ? '#2dd4a0' : lead.score >= 60 ? '#f5c842' : '#ff8c42'
  const contactTargetLabel = getContactTargetLabel(lead.contato_abordagem_tipo)

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('leadId', lead.id)
          e.dataTransfer.setData('currentStatus', lead.status)
          setDragging(true)
        }}
        onDragEnd={() => setDragging(false)}
        onClick={() => onOpen(lead.id)}
        style={{
          position: 'relative',
          background: dragging ? 'var(--bg-hover)' : 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px',
          cursor: 'grab',
          opacity: dragging ? 0.5 : 1,
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
        }}
      >
        <button
          onClick={e => { e.stopPropagation(); setShowModal(true) }}
          title="Ver mensagens"
          style={{
            position: 'absolute', top: '10px', right: '10px',
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(79,122,255,0.12)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-card)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <MessageSquare size={12} />
        </button>

        {/* Header: score + nome */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', paddingRight: '32px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
            background: `${scoreColor}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '700', fontFamily: 'Syne, sans-serif',
            color: scoreColor,
          }}>{lead.score}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: '1.3'
            }}>{lead.nome}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
              NB {lead.nb}
            </div>
            {lead.origem === 'manual' && (
              <span style={{
                fontSize: '9px', fontWeight: '700', background: 'rgba(167,139,250,0.12)',
                color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.25)',
                borderRadius: '20px', padding: '1px 7px', textTransform: 'uppercase',
                letterSpacing: '0.04em', display: 'inline-block', marginTop: '3px',
              }}>
                Manual
              </span>
            )}
            <div style={{ marginTop: '4px' }}>
              <span style={{
                fontSize: '9px',
                fontWeight: '700',
                background: 'rgba(79,122,255,0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(79,122,255,0.22)',
                borderRadius: '20px',
                padding: '1px 7px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'inline-block',
              }}>
                {contactTargetLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Ganho */}
        {lead.ganho_potencial && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: '600', color: '#2dd4a0',
            marginBottom: '8px'
          }}>
            <DollarSign size={11} strokeWidth={2.5} />
            {fmt(lead.ganho_potencial)}
          </div>
        )}

        {/* Tipo benefício */}
        {lead.tipo_beneficio && (
          <div style={{
            fontSize: '10px', color: 'var(--text-muted)',
            background: 'var(--bg-card)', borderRadius: '4px',
            padding: '2px 6px', display: 'inline-block', marginBottom: '8px'
          }}>{lead.tipo_beneficio}</div>
        )}

        {/* Mover para */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '4px 8px',
              color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer',
              width: '100%', justifyContent: 'space-between',
              fontFamily: 'DM Sans, sans-serif'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={10} />
              Mover para
            </span>
            <ChevronDown size={10} />
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '8px', overflow: 'hidden', zIndex: 50,
              marginBottom: '4px', boxShadow: '0 8px 24px #00000040'
            }}>
              {COLUMNS.filter(c => c.id !== lead.status).map(col => (
                <button
                  key={col.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(lead.id, col.id)
                    setShowMenu(false)
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', background: 'transparent',
                    border: 'none', color: col.color, fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >{col.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ModalMsgLead
          lead={{ id: lead.id, nome: lead.nome, telefone: lead.telefone || '' }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function KanbanColumn({
  column,
  leads,
  onDrop,
  onStatusChange,
  onOpen,
}: {
  column: Column
  leads: Lead[]
  onDrop: (leadId: string, newStatus: string) => void
  onStatusChange: (id: string, status: string) => void
  onOpen: (id: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const total = leads.reduce((sum, l) => sum + (l.ganho_potencial || 0), 0)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const leadId = e.dataTransfer.getData('leadId')
        if (leadId) onDrop(leadId, column.id)
      }}
      style={{
        width: '220px',
        flexShrink: 0,
        background: dragOver ? column.bg : 'transparent',
        border: `1px solid ${dragOver ? column.border : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '12px',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '200px',
      }}
    >
      {/* Column header */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{
            fontSize: '12px', fontWeight: '600', fontFamily: 'Syne, sans-serif',
            color: column.color
          }}>{column.label}</span>
          <span style={{
            background: column.bg, color: column.color,
            border: `1px solid ${column.border}`,
            borderRadius: '20px', padding: '1px 8px',
            fontSize: '11px', fontWeight: '600'
          }}>{leads.length}</span>
        </div>
        {total > 0 && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {fmt(total)}
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onStatusChange={onStatusChange} onOpen={onOpen} />
        ))}
        {leads.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: '11px', minHeight: '80px',
            border: `2px dashed ${dragOver ? column.border : 'transparent'}`,
            borderRadius: '8px', transition: 'all 0.15s'
          }}>
            {dragOver ? 'Soltar aqui' : 'Vazio'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  async function handleStatusChange(leadId: string, newStatus: string) {
    const prevLeads = leads
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    setUpdating(leadId)

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) {
        setLeads(prevLeads) // rollback
        console.error('Erro ao atualizar status')
      }
    } catch {
      setLeads(prevLeads) // rollback
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {updating && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '8px 14px',
          fontSize: '12px', color: 'var(--text-muted)', zIndex: 100
        }}>Salvando...</div>
      )}
      <div style={{
        display: 'flex', gap: '12px',
        overflowX: 'auto', paddingBottom: '16px',
      }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            leads={leads.filter(l => l.status === col.id)}
            onDrop={handleStatusChange}
            onStatusChange={handleStatusChange}
            onOpen={setSelectedLeadId}
          />
        ))}
      </div>
      <LeadDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
