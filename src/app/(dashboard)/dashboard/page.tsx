import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, Calendar, DollarSign, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import RecentLeads from '@/components/recent-leads'
import DashboardOnboardingTour from '@/components/dashboard-onboarding-tour'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Busca stats reais
    const { data: stats } = await supabase.from('v_dashboard_stats').select('*').single()
    const { data: recentLeads } = await supabase
        .from('leads')
        .select('id, nome, status, score, ganho_potencial, created_at')
        .order('created_at', { ascending: false })
        .limit(8)

    const s = stats || {}

    function fmt(v: number) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0)
    }

    const cards = [
        { label: 'Total de Leads', value: s.total_leads || 0, icon: Users, color: 'var(--accent)', sub: `${s.total_novos || 0} novos` },
        { label: 'Potencial Total', value: fmt(s.potencial_total), icon: DollarSign, color: 'var(--green)', sub: `${s.total_convertidos || 0} convertidos` },
        { label: 'Agendamentos', value: s.total_agendados || 0, icon: Calendar, color: 'var(--purple)', sub: `${s.total_aguardando || 0} aguardando` },
        { label: 'Score Médio', value: `${s.score_medio || 0}`, icon: TrendingUp, color: 'var(--yellow)', sub: 'de 100 pontos' },
    ]

    const pipeline = [
        { label: 'Novos', value: s.total_novos || 0, color: 'var(--accent)', icon: ArrowUpRight },
        { label: 'Contatados', value: s.total_contatados || 0, color: 'var(--yellow)', icon: Clock },
        { label: 'Agendados', value: s.total_agendados || 0, color: 'var(--purple)', icon: Calendar },
        { label: 'Convertidos', value: s.total_convertidos || 0, color: 'var(--green)', icon: CheckCircle2 },
        { label: 'Perdidos', value: s.total_perdidos || 0, color: 'var(--red)', icon: XCircle },
    ]

    return (
        <div style={{ padding: '32px', maxWidth: '1200px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.5px',
                    marginBottom: '4px'
                }}>Dashboard</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Visão geral do escritório
                </p>
            </div>

            {/* Stats cards */}
            <div data-tour="dashboard-kpis" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {cards.map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                            <div style={{
                                width: '32px', height: '32px',
                                background: `${color}15`,
                                borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon size={16} color={color} strokeWidth={2} />
                            </div>
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: '4px' }}>
                            {value}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</div>
                    </div>
                ))}
            </div>

            {/* Pipeline */}
            <div data-tour="dashboard-pipeline" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-secondary)' }}>Pipeline</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    {pipeline.map(({ label, value, color, icon: Icon }, i) => (
                        <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                            {i < pipeline.length - 1 && (
                                <div style={{
                                    position: 'absolute', right: '-4px', top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--border)', fontSize: '18px', zIndex: 1
                                }}>›</div>
                            )}
                            <div style={{
                                background: 'var(--bg-surface)',
                                border: `1px solid ${color}30`,
                                borderRadius: '10px',
                                padding: '16px',
                                textAlign: 'center'
                            }}>
                                <Icon size={18} color={color} strokeWidth={1.8} style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color, letterSpacing: '-0.5px' }}>{value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent leads */}
            <div data-tour="dashboard-recentes" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Leads Recentes</h3>
                    <a href="/leads" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>Ver todos →</a>
                </div>
                <RecentLeads leads={recentLeads || []} />
            </div>

            <DashboardOnboardingTour />
        </div>
    )
}
