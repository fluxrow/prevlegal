import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/kanban-board'
import LeadsOnboardingTour from '@/components/leads-onboarding-tour'
import LeadsNovoLeadButton from '@/components/leads-novo-lead-button'
import { Users, DollarSign, TrendingUp } from 'lucide-react'
import { getTenantContext } from '@/lib/tenant-context'
import type { LeadStatus } from '@/lib/types'

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'Novos' },
  { value: 'contacted', label: 'Contatados' },
  { value: 'awaiting', label: 'Aguardando' },
  { value: 'scheduled', label: 'Agendados' },
  { value: 'converted', label: 'Convertidos' },
  { value: 'lost', label: 'Perdidos' },
]

const VALID_STATUS = new Set<LeadStatus>(STATUS_OPTIONS.map((option) => option.value))

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) redirect('/login')
  const resolvedSearchParams = await searchParams
  const statusParam = resolvedSearchParams?.status
  const statusFilter = statusParam && VALID_STATUS.has(statusParam as LeadStatus)
    ? (statusParam as LeadStatus)
    : null

  let leadsQuery = supabase
    .from('leads')
    .select('id, nome, nb, telefone, status, score, ganho_potencial, tipo_beneficio, banco, origem')
    .eq('tenant_id', context.tenantId)
    .eq('lgpd_optout', false)

  if (!context.isAdmin) {
    leadsQuery = leadsQuery.eq('responsavel_id', context.usuarioId)
  }

  if (statusFilter) {
    leadsQuery = leadsQuery.eq('status', statusFilter)
  }

  const { data: leads } = await leadsQuery.order('score', { ascending: false })

  const total = leads?.length || 0
  const potencial = leads?.reduce((s, l) => s + (l.ganho_potencial || 0), 0) || 0
  const scoreM = total > 0
    ? Math.round(leads!.reduce((s, l) => s + l.score, 0) / total)
    : 0

  function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL', maximumFractionDigits: 0
    }).format(v)
  }

  const activeStatusLabel = STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? null

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '2px' }}>
            Leads
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Arraste os cards para mover entre etapas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LeadsNovoLeadButton />
          <a data-tour="leads-import" href="/leads/import" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: 'var(--bg-surface)',
            color: 'var(--text-secondary)', borderRadius: '8px', textDecoration: 'none',
            fontSize: '13px', fontWeight: '600', fontFamily: 'Syne, sans-serif',
            border: '1px solid var(--border)',
          }}>+ Importar lista</a>
        </div>
      </div>

      {statusFilter && activeStatusLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(79,122,255,0.08)',
          border: '1px solid rgba(79,122,255,0.18)',
          borderRadius: '10px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Exibindo apenas leads no recorte <strong style={{ color: 'var(--text-primary)' }}>{activeStatusLabel}</strong>.
          </div>
          <a
            href="/leads"
            style={{
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Limpar filtro
          </a>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <a
          href="/leads"
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: '600',
            color: statusFilter ? 'var(--text-muted)' : 'var(--text-primary)',
            background: statusFilter ? 'var(--bg-surface)' : 'rgba(79,122,255,0.12)',
            border: statusFilter ? '1px solid var(--border)' : '1px solid rgba(79,122,255,0.2)',
          }}
        >
          Todos
        </a>
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value
          return (
            <a
              key={option.value}
              href={`/leads?status=${option.value}`}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: '600',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(79,122,255,0.12)' : 'var(--bg-surface)',
                border: isActive ? '1px solid rgba(79,122,255,0.2)' : '1px solid var(--border)',
              }}
            >
              {option.label}
            </a>
          )
        })}
      </div>

      {/* Mini stats */}
      <div data-tour="leads-stats" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { icon: Users, label: `${total} leads`, color: 'var(--accent)' },
          { icon: DollarSign, label: fmt(potencial), color: 'var(--green)' },
          { icon: TrendingUp, label: `Score médio ${scoreM}`, color: 'var(--yellow)' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '8px 14px',
            fontSize: '13px', color: 'var(--text-secondary)'
          }}>
            <Icon size={14} color={color} strokeWidth={2} />
            {label}
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div data-tour="leads-kanban">
        <KanbanBoard initialLeads={leads || []} />
      </div>

      <LeadsOnboardingTour />
    </div>
  )
}
