'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
    if (res.ok) router.push('/admin')
    else setErro('Email ou senha inválidos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #4f7aff 0%, #7c3aed 100%)', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 8px 24px rgba(79,122,255,0.3)' }}>
            <Lock size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', fontFamily: 'Syne, sans-serif', margin: '0 0 6px' }}>Fluxrow Admin</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Painel exclusivo de gestão de clientes</p>
        </div>

        <form onSubmit={handleLogin} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="fbcfarias@icloud.com"
                style={{ width: '100%', background: '#080b14', border: '1px solid #1f2937', borderRadius: '10px', padding: '10px 12px 10px 36px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                style={{ width: '100%', background: '#080b14', border: '1px solid #1f2937', borderRadius: '10px', padding: '10px 36px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans' }}
              />
              <button
                type="button"
                onClick={() => setShowSenha(s => !s)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: 0 }}
              >
                {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {erro && <p style={{ color: '#ff5757', fontSize: '13px', textAlign: 'center', marginBottom: '16px', marginTop: 0 }}>{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: 'linear-gradient(135deg, #4f7aff, #7c3aed)', border: 'none', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'DM Sans' }}
          >
            {loading ? 'Entrando...' : 'Entrar no painel'}
          </button>
        </form>
      </div>
    </div>
  )
}
