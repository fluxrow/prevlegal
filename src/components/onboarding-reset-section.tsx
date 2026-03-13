'use client'
import { HelpCircle, RotateCcw } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'

export default function OnboardingResetSection() {
  const leadsOnboarding = useOnboarding('leads')
  const inboxOnboarding = useOnboarding('caixa-de-entrada')
  const agenteOnboarding = useOnboarding('agente')

  const tours = [
    { label: 'Leads', fn: leadsOnboarding.reset },
    { label: 'Caixa de Entrada', fn: inboxOnboarding.reset },
    { label: 'Agente IA', fn: agenteOnboarding.reset },
  ]

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <HelpCircle size={16} color="var(--accent)" />
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>
          Tours de Onboarding
        </h3>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
        Reinicie os tutoriais guiados de cada página sempre que quiser.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tours.map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: 'var(--text-secondary)',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '7px 12px',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <RotateCcw size={12} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}
