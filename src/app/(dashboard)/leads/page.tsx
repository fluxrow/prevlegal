import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/kanban-board'
import LeadsOnboardingTour from '@/components/leads-onboarding-tour'
import LeadsNovoLeadButton from '@/components/leads-novo-lead-button'
import { Users, DollarSign, TrendingUp } from 'lucide-react'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leads } = await supabase
    .from('leads')
    .select('id, nome, nb, status, score, ganho_potencial, tipo_beneficio, banco, origem')
    .eq('lgpd_optout', false)
    .order('score', { ascending: false })

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
