'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import GestaoUsuarios from '@/components/gestao-usuarios'
import OnboardingResetSection from '@/components/onboarding-reset-section'
import FollowupConfig from '@/components/followup-config'
import { Users, Zap, Settings } from 'lucide-react'

type Tab = 'usuarios' | 'followup' | 'geral'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'usuarios', label: 'Usuários', icon: <Users size={14} /> },
  { id: 'followup', label: 'Follow-up', icon: <Zap size={14} /> },
  { id: 'geral',    label: 'Geral',    icon: <Settings size={14} /> },
]

export default function ConfiguracoesTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const abaAtiva = (searchParams.get('tab') as Tab) || 'usuarios'

  function setAba(tab: Tab) {
    router.replace(`/configuracoes?tab=${tab}`, { scroll: false })
  }

  return (
    <div>
      {/* Abas */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px',
              fontSize: '13px', fontWeight: abaAtiva === tab.id ? '700' : '400',
              color: abaAtiva === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: abaAtiva === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: '-1px',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {abaAtiva === 'usuarios' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
          <GestaoUsuarios />
        </div>
      )}

      {abaAtiva === 'followup' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
          <FollowupConfig />
        </div>
      )}

      {abaAtiva === 'geral' && (
        <OnboardingResetSection />
      )}
    </div>
  )
}
