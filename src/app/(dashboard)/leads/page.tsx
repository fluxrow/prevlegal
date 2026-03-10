import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'

export default async function LeadsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>Leads</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Kanban de gestão de leads</p>
            </div>
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '60px',
                textAlign: 'center'
            }}>
                <Users size={40} color="var(--text-muted)" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                    Kanban de leads — em construção
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Importe uma lista para começar
                </p>
            </div>
        </div>
    )
}
