import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracoesTabs from '@/components/configuracoes-tabs'

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
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Gerencie usuários, integrações e automações do escritório</p>
      </div>
      <ConfiguracoesTabs />
    </div>
  )
}
