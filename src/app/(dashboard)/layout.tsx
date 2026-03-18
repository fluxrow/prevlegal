import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import NotificacoesBell from '@/components/notificacoes-bell'
import BuscaGlobal from '@/components/busca-global'
import UsuarioAvatar from '@/components/usuario-avatar'
import SessionActivityTracker from '@/components/session-activity-tracker'
import { APP_IDLE_MINUTES } from '@/lib/session-security'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <SessionActivityTracker
                    mode="app"
                    idleMinutes={APP_IDLE_MINUTES}
                    touchUrl="/api/session/touch"
                    logoutUrl="/api/session/logout"
                    loginUrl="/login"
                />
                <header style={{
                    height: '52px',
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 20px',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        <BuscaGlobal />
                        <UsuarioAvatar />
                        <NotificacoesBell />
                    </div>
                </header>
                <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
