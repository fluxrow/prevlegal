'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function RedefinirSenhaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase
    let ativo = true
    let sessionTimer: ReturnType<typeof setTimeout> | null = null

    async function validarLink() {
      const tokenHash = searchParams.get('token_hash')
      const type = (searchParams.get('type') || 'recovery') as EmailOtpType
      const code = searchParams.get('code')
      const hash = typeof window !== 'undefined' ? window.location.hash : ''

      if (hash.includes('error=')) {
        if (ativo) setStatus('invalid')
        return
      }

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })

        if (!ativo) return
        setStatus(error ? 'invalid' : 'ready')
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!ativo) return
        setStatus(error ? 'invalid' : 'ready')
        return
      }

      sessionTimer = setTimeout(async () => {
        const { data } = await supabase.auth.getSession()
        if (!ativo) return
        setStatus(data.session ? 'ready' : 'invalid')
      }, 400)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setStatus('ready')
      }
    })

    validarLink()

    return () => {
      ativo = false
      subscription.unsubscribe()
      if (sessionTimer) clearTimeout(sessionTimer)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (senha.length < 8) {
      setMensagem('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (senha !== confirmacao) {
      setMensagem('As senhas nao coincidem.')
      return
    }

    setLoading(true)
    setMensagem('')

    const supabase = supabaseRef.current || createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setMensagem(error.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="var(--accent)" />
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Definir nova senha</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
          Use o link do email para criar ou redefinir a senha da sua conta.
        </p>

        {status === 'checking' && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>
            Validando link de acesso...
          </p>
        )}

        {status === 'invalid' && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid #ff575730', borderRadius: '8px', color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>
            Este link e invalido ou expirou. Solicite um novo email de acesso ou redefinicao.
          </div>
        )}

        {status === 'ready' && (
          <>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nova senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            {mensagem && (
              <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid #ff575730', borderRadius: '8px', color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>
                {mensagem}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !senha || !confirmacao}
              style={{ width: '100%', padding: '11px', background: loading || !senha || !confirmacao ? 'var(--bg-hover)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaContent />
    </Suspense>
  )
}
