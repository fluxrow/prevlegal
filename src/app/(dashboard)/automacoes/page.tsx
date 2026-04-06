import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FollowupConfig from '@/components/followup-config'
import { Zap, GitMerge } from 'lucide-react'

export const metadata = {
  title: 'Automações | PrevLegal',
  description: 'Gerencie sequências de follow-up e automações para seus leads',
}

export default async function AutomacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: '28px 32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '22px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px',
          marginBottom: '4px',
        }}>
          Automações
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          Configure sequências de follow-up e automações por evento para seus leads
        </p>
      </div>

      {/* Seções */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Follow-up */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border)',
          }}>
            <Zap size={15} color="var(--accent)" />
            <h2 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              fontFamily: 'Syne, sans-serif',
            }}>
              Sequências de Follow-up
            </h2>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              fontWeight: '600',
            }}>
              Ativo
            </span>
          </div>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '24px',
          }}>
            <FollowupConfig />
          </div>
        </section>

        {/* Gatilhos automáticos — em breve */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border)',
          }}>
            <GitMerge size={15} color="var(--text-muted)" />
            <h2 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '700',
              color: 'var(--text-muted)',
              fontFamily: 'Syne, sans-serif',
            }}>
              Gatilhos Automáticos
            </h2>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'var(--bg-hover)',
              color: 'var(--text-muted)',
              fontWeight: '600',
            }}>
              Em breve — Fase E
            </span>
          </div>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border)',
            borderRadius: '14px',
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <GitMerge size={28} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              Gatilhos por evento em desenvolvimento
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', opacity: 0.7 }}>
              Ex: lead qualificado → ativa sequência de confirmação de agenda automaticamente
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
