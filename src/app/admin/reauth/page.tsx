'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

function AdminReauthPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/admin'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const res = await fetch('/api/admin/reauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })

    if (res.ok) router.replace(next)
    else setErro('Não foi possível confirmar sua identidade.')

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '420px', background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="#4f7aff" />
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', color: '#fff', margin: 0 }}>Reautenticação do admin</h1>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>
          Esta área exige confirmação recente para continuar.
        </p>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#080b14', border: '1px solid #1f2937', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Senha</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#080b14', border: '1px solid #1f2937', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }} />
        {erro && <p style={{ color: '#ff5757', fontSize: '13px', marginBottom: '14px' }}>{erro}</p>}
        <button type="submit" disabled={loading || !email || !senha} style={{ width: '100%', padding: '11px', background: loading || !email || !senha ? '#1f2937' : 'linear-gradient(135deg, #4f7aff, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          {loading ? 'Confirmando...' : 'Confirmar e continuar'}
        </button>
      </form>
    </div>
  )
}

export default function AdminReauthPage() {
  return (
    <Suspense fallback={null}>
      <AdminReauthPageContent />
    </Suspense>
  )
}
