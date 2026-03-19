'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [mensagem, setMensagem] = useState('Validando link de acesso...')

  const tokenHash = searchParams.get('token_hash')
  const type = (searchParams.get('type') || 'recovery') as EmailOtpType
  const next = useMemo(() => searchParams.get('next') || '/auth/redefinir-senha', [searchParams])

  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase
    let ativo = true

    async function confirmar() {
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })

        if (!ativo) return

        if (error) {
          setMensagem('Este link e invalido ou expirou. Gere um novo acesso e tente novamente.')
          return
        }

        router.replace(next)
        return
      }

      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (hash.includes('error=')) {
        setMensagem('Este link e invalido ou expirou. Gere um novo acesso e tente novamente.')
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!ativo) return

      if (data.session) {
        router.replace(next)
        return
      }

      setMensagem('Nao foi possivel validar este link. Gere um novo acesso e tente novamente.')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        router.replace(next)
      }
    })

    confirmar()

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [next, router, tokenHash, type])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="var(--accent)" />
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Confirmando acesso</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          {mensagem}
        </p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  )
}
