'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Convite {
  id: string
  email: string
  role: string
  expires_at: string
}

function AceitarConviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'valido' | 'invalido' | 'registrando' | 'sucesso' | 'erro'>('loading')
  const [convite, setConvite] = useState<Convite | null>(null)
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalido'); return }
    fetch(`/api/usuarios/convite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.convite) { setConvite(d.convite); setStatus('valido') }
        else setStatus('invalido')
      })
  }, [token])

  async function aceitar() {
    if (!nome.trim() || !senha.trim()) { setErro('Preencha nome e senha'); return }
    if (senha.length < 8) { setErro('Senha deve ter pelo menos 8 caracteres'); return }
    setStatus('registrando')
    const res = await fetch('/api/usuarios/aceitar-convite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nome, senha }),
    })
    const json = await res.json()
    if (res.ok) { setStatus('sucesso'); setTimeout(() => router.push('/dashboard'), 2500) }
    else { setErro(json.error || 'Erro ao criar conta'); setStatus('valido') }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#080b14', border: '1px solid #1f2937',
    borderRadius: '10px', padding: '11px 14px', color: '#fff',
    fontSize: '14px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 24px' }}>

        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={32} color="#4f7aff" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#6b7280', marginTop: '16px', fontSize: '14px' }}>Verificando convite...</p>
          </div>
        )}

        {status === 'invalido' && (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={48} color="#ff5757" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '20px', margin: '0 0 8px' }}>Convite inválido</h2>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Este convite não existe, já foi usado ou expirou.</p>
          </div>
        )}

        {status === 'sucesso' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color="#2dd4a0" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '20px', margin: '0 0 8px' }}>Conta criada!</h2>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Redirecionando para o sistema...</p>
          </div>
        )}

        {(status === 'valido' || status === 'registrando') && convite && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #4f7aff, #7c3aed)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <CheckCircle size={22} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '20px', margin: '0 0 6px' }}>Você foi convidado!</h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                Acesso como <strong style={{ color: '#4f7aff' }}>{convite.role}</strong> no escritório
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seu nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Dr. João Silva" style={inp} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input value={convite.email} disabled style={{ ...inp, opacity: 0.5 }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Criar senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres" style={inp} />
            </div>

            {erro && <p style={{ color: '#ff5757', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>{erro}</p>}

            <button onClick={aceitar} disabled={status === 'registrando'}
              style={{ width: '100%', background: 'linear-gradient(135deg, #4f7aff, #7c3aed)', border: 'none', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: status === 'registrando' ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {status === 'registrando'
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Criando conta...</>
                : 'Criar conta e entrar'}
            </button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function AceitarConvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#4f7aff" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <AceitarConviteForm />
    </Suspense>
  )
}
