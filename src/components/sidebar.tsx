'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard, Users, List, Megaphone, Bot,
    BarChart3, Settings, LogOut, Scale, CalendarDays, Inbox
} from 'lucide-react'

const nav = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/leads', icon: Users, label: 'Leads' },
    { href: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
    { href: '/caixa-de-entrada', icon: Inbox, label: 'Caixa de Entrada' },
    { href: '/listas', icon: List, label: 'Listas' },
    { href: '/campanhas', icon: Megaphone, label: 'Campanhas' },
    { href: '/agente', icon: Bot, label: 'Agente IA' },
    { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { href: '/configuracoes', icon: Settings, label: 'Configurações' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <aside style={{
            width: '220px',
            minHeight: '100vh',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 12px',
            flexShrink: 0
        }}>
            {/* Logo */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px 24px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '16px'
            }}>
                <div style={{
                    width: '30px', height: '30px',
                    background: 'linear-gradient(135deg, #4f7aff, #a78bfa)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Scale size={15} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.3px'
                }}>PrevLegal</span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {nav.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                        <Link key={href} href={href} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: active ? 'var(--accent-glow)' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: active ? '500' : '400',
                            transition: 'all 0.15s',
                            border: active ? '1px solid #4f7aff20' : '1px solid transparent'
                        }}
                            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' } }}
                            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
                        >
                            <Icon size={16} strokeWidth={1.8} />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <button onClick={handleLogout} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                width: '100%',
                textAlign: 'left'
            }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--red-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >
                <LogOut size={16} strokeWidth={1.8} />
                Sair
            </button>
        </aside>
    )
}
