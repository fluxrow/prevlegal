'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

export default function ReauthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/dashboard'
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/session/reauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) router.replace(next)
    else setError('Não foi possível confirmar sua identidade.')

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="var(--accent)" />
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Confirme sua identidade</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
          Esta área exige reautenticação recente por segurança.
        </p>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Senha atual
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }}
        />
        {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{ width: '100%', padding: '11px', background: loading || !password ? 'var(--bg-hover)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
        >
          {loading ? 'Confirmando...' : 'Confirmar e continuar'}
        </button>
      </form>
    </div>
  )
}
