'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard, Users, List, Megaphone, Bot,
    BarChart3, Settings, LogOut, Scale, CalendarDays, Inbox, UserCircle, DollarSign, Zap
} from 'lucide-react'

const nav = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/leads', icon: Users, label: 'Leads' },
    { href: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
    { href: '/caixa-de-entrada', icon: Inbox, label: 'Caixa de Entrada' },
    { href: '/listas', icon: List, label: 'Listas' },
    { href: '/campanhas', icon: Megaphone, label: 'Campanhas' },
    { href: '/automacoes', icon: Zap, label: 'Automações' },
    { href: '/agente', icon: Bot, label: 'Agente IA' },
    { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { href: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    { href: '/configuracoes', icon: Settings, label: 'Configurações' },
    { href: '/perfil', icon: UserCircle, label: 'Perfil' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [pendencias, setPendencias] = useState({ total: 0, agendamentos: 0 })
    const [canAutoCollapse, setCanAutoCollapse] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        async function fetchPendencias() {
            const res = await fetch('/api/pendencias')
            if (res.ok) setPendencias(await res.json())
        }

        fetchPendencias()
        const iv = setInterval(fetchPendencias, 20000)
        return () => clearInterval(iv)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const media = window.matchMedia('(hover: hover) and (pointer: fine)')
        const syncCollapseMode = () => {
            const enabled = media.matches
            setCanAutoCollapse(enabled)
            setCollapsed(enabled)
        }

        syncCollapseMode()
        media.addEventListener('change', syncCollapseMode)
        return () => media.removeEventListener('change', syncCollapseMode)
    }, [])

    async function handleLogout() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const isCollapsed = canAutoCollapse && collapsed
    const sidebarWidth = isCollapsed ? '78px' : '220px'

    return (
        <aside style={{
            width: sidebarWidth,
            minHeight: '100vh',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 12px',
            flexShrink: 0,
            transition: 'width 0.22s ease',
            overflow: 'hidden',
            position: 'relative',
        }}
            onMouseEnter={() => { if (canAutoCollapse) setCollapsed(false) }}
            onMouseLeave={() => { if (canAutoCollapse) setCollapsed(true) }}
        >
            {canAutoCollapse && (
                <div
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '10px',
                        width: '4px',
                        height: '28px',
                        borderRadius: '999px',
                        background: isCollapsed ? 'rgba(79,122,255,0.35)' : 'rgba(79,122,255,0.18)',
                        transition: 'all 0.15s ease',
                    }}
                />
            )}
            {/* Logo */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isCollapsed ? '0px' : '10px',
                padding: '8px 12px 24px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '16px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
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
                    letterSpacing: '-0.3px',
                    opacity: isCollapsed ? 0 : 1,
                    width: isCollapsed ? 0 : 'auto',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s ease, width 0.2s ease',
                }}>PrevLegal</span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {nav.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                        <Link key={href} href={href} title={isCollapsed ? label : undefined} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isCollapsed ? '0px' : '10px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: active ? 'var(--accent-glow)' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: active ? '500' : '400',
                            transition: 'all 0.15s',
                            border: active ? '1px solid #4f7aff20' : '1px solid transparent',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                            position: 'relative',
                        }}
                            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' } }}
                            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
                        >
                            <Icon size={16} strokeWidth={1.8} />
                            <span style={{
                                opacity: isCollapsed ? 0 : 1,
                                width: isCollapsed ? 0 : 'auto',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                transition: 'opacity 0.15s ease, width 0.2s ease',
                            }}>
                                {label}
                            </span>
                            {pendencias.total > 0 && label === 'Caixa de Entrada' && (
                                <span style={{
                                    marginLeft: isCollapsed ? 0 : 'auto',
                                    position: isCollapsed ? 'absolute' : 'static',
                                    top: isCollapsed ? '6px' : undefined,
                                    right: isCollapsed ? '6px' : undefined,
                                    background: '#ef4444',
                                    color: '#fff',
                                    borderRadius: '100px',
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    minWidth: '18px',
                                    textAlign: 'center',
                                }}>
                                    {pendencias.total > 99 ? '99+' : pendencias.total}
                                </span>
                            )}
                            {pendencias.agendamentos > 0 && label === 'Agendamentos' && (
                                <span style={{
                                    marginLeft: isCollapsed ? 0 : 'auto',
                                    position: isCollapsed ? 'absolute' : 'static',
                                    top: isCollapsed ? '6px' : undefined,
                                    right: isCollapsed ? '6px' : undefined,
                                    background: '#f59e0b',
                                    color: '#fff',
                                    borderRadius: '100px',
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    minWidth: '18px',
                                    textAlign: 'center',
                                }}>
                                    {pendencias.agendamentos}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <button
                onClick={handleLogout}
                title={isCollapsed ? 'Sair' : undefined}
                style={{
                display: 'flex',
                alignItems: 'center',
                gap: isCollapsed ? '0px' : '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                width: '100%',
                textAlign: 'left',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--red-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >
                <LogOut size={16} strokeWidth={1.8} />
                <span style={{
                    opacity: isCollapsed ? 0 : 1,
                    width: isCollapsed ? 0 : 'auto',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s ease, width 0.2s ease',
                }}>
                    Sair
                </span>
            </button>
        </aside>
    )
}
