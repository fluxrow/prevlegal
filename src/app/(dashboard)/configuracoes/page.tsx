import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'

export default async function ConfiguracoesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div style={{ padding: '32px' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>Configurações</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '32px' }}>Preferências do escritório</p>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
                <Settings size={40} color="var(--text-muted)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Em breve</p>
            </div>
        </div>
    )
}
