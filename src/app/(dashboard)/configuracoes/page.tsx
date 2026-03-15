import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GestaoUsuarios from '@/components/gestao-usuarios'
import OnboardingResetSection from '@/components/onboarding-reset-section'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Configurações
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Gerencie os usuários do escritório</p>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
        <GestaoUsuarios />
      </div>

      <OnboardingResetSection />
    </div>
  )
}
