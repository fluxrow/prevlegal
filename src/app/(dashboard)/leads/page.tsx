import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/kanban-board'
import LeadsOnboardingTour from '@/components/leads-onboarding-tour'
import LeadsNovoLeadButton from '@/components/leads-novo-lead-button'
import { Users, DollarSign, TrendingUp } from 'lucide-react'
import { getTenantContext } from '@/lib/tenant-context'
import type { LeadStatus } from '@/lib/types'
import { normalizeOperationProfile } from '@/lib/operation-profile'
import { normalizeOperationalConversationState } from '@/lib/inbox-operational-state'

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
    .select('id, nome, nb, telefone, status, score, ganho_potencial, tipo_beneficio, banco, origem, contato_abordagem_tipo')
    .eq('tenant_id', context.tenantId)
    .eq('lgpd_optout', false)

  if (!context.isAdmin) {
    leadsQuery = leadsQuery.eq('responsavel_id', context.usuarioId)
  }

  if (statusFilter) {
    leadsQuery = leadsQuery.eq('status', statusFilter)
  }

  const [
    { data: leads },
    { data: defaultAgent },
  ] = await Promise.all([
    leadsQuery.order('score', { ascending: false }),
    supabase
      .from('agentes')
      .select('perfil_operacao')
      .eq('tenant_id', context.tenantId)
      .eq('ativo', true)
      .eq('is_default', true)
      .maybeSingle(),
  ])

  const leadIds = (leads || []).map((lead) => lead.id)
  const latestConversationByLead = new Map<
    string,
    { estado_operacional: string | null; status: string | null }
  >()

  if (leadIds.length > 0) {
    const { data: conversations } = await supabase
      .from('conversas')
      .select('lead_id, status, estado_operacional, ultima_mensagem_at')
      .eq('tenant_id', context.tenantId)
      .in('lead_id', leadIds)
      .order('ultima_mensagem_at', { ascending: false })

    for (const conversation of conversations || []) {
      if (!conversation.lead_id || latestConversationByLead.has(conversation.lead_id)) continue
      latestConversationByLead.set(conversation.lead_id, {
        estado_operacional: conversation.estado_operacional || null,
        status: conversation.status || null,
      })
    }
  }

  const leadsWithOperationalState = (leads || []).map((lead) => {
    const conversation = latestConversationByLead.get(lead.id)
    return {
      ...lead,
      estado_operacional: conversation
        ? normalizeOperationalConversationState(conversation.estado_operacional, conversation.status)
        : null,
    }
  })

  const operationProfile = normalizeOperationProfile(defaultAgent?.perfil_operacao || null)

  const total = leadsWithOperationalState.length
  const potencial = leadsWithOperationalState.reduce((s, l) => s + (l.ganho_potencial || 0), 0) || 0
  const scoreM = total > 0
    ? Math.round(leadsWithOperationalState.reduce((s, l) => s + l.score, 0) / total)
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
          <LeadsNovoLeadButton operationProfile={operationProfile} />
          <Link data-tour="leads-import" href="/leads/import" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: 'var(--bg-surface)',
            color: 'var(--text-secondary)', borderRadius: '8px', textDecoration: 'none',
            fontSize: '13px', fontWeight: '600', fontFamily: 'Syne, sans-serif',
            border: '1px solid var(--border)',
          }}>+ Importar lista</Link>
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
          <Link
            href="/leads"
            style={{
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Limpar filtro
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <Link
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
        </Link>
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value
          return (
            <Link
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
            </Link>
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
        <KanbanBoard initialLeads={leadsWithOperationalState} />
      </div>

      <LeadsOnboardingTour />
    </div>
  )
}
