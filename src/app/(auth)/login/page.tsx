'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function handleLogin() {
        setLoading(true)
        setError('')
        const res = await fetch('/api/session/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({ email, password }),
        })

        if (!res.ok) {
            setError('E-mail ou senha incorretos.')
            setLoading(false)
        } else {
            window.location.assign('/dashboard')
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, #4f7aff12 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            {/* Grid pattern */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                pointerEvents: 'none'
            }} />

            {/* Card */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                padding: '0 24px'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(135deg, #4f7aff, #a78bfa)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '800',
                            fontFamily: 'Syne, sans-serif',
                            color: '#fff'
                        }}>P</div>
                        <span style={{
                            fontFamily: 'Syne, sans-serif',
                            fontSize: '22px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.5px'
                        }}>PrevLegal</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        Gestão previdenciária inteligente
                    </p>
                </div>

                {/* Form card */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '32px',
                }}>
                    <h2 style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '24px',
                        color: 'var(--text-primary)'
                    }}>Entrar na plataforma</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    fontFamily: 'DM Sans, sans-serif'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    fontFamily: 'DM Sans, sans-serif'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'var(--red-bg)',
                                border: '1px solid #ff575730',
                                borderRadius: '8px',
                                color: 'var(--red)',
                                fontSize: '13px'
                            }}>{error}</div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '11px',
                                background: loading ? 'var(--bg-hover)' : 'var(--accent)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                fontFamily: 'Syne, sans-serif',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                letterSpacing: '0.3px'
                            }}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </div>

                <p style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                }}>
                    © 2026 PrevLegal · Fluxrow
                </p>
            </div>
        </div>
    )
}
