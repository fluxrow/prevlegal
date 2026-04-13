'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquarePlus, Send, X } from 'lucide-react'
import { buildInboxHref } from '@/lib/contact-shortcuts'

export default function IniciarConversaModal({
  open,
  onClose,
  leadId,
  leadNome,
  telefone,
  onStarted,
}: {
  open: boolean
  onClose: () => void
  leadId: string
  leadNome: string
  telefone?: string | null
  onStarted?: (conversaId: string) => void
}) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (!open) return null

  async function handleSubmit() {
    if (!mensagem.trim()) {
      setError('Escreva a primeira mensagem para iniciar a conversa.')
      return
    }

    setSending(true)
    setError('')

    try {
      const res = await fetch(`/api/leads/${leadId}/iniciar-conversa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: mensagem.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Falha ao iniciar conversa')
        return
      }

      onStarted?.(data.conversaId)
      setMensagem('')
      onClose()
      router.push(buildInboxHref({ conversaId: data.conversaId, telefone }))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div
        onClick={sending ? undefined : onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#00000070',
          zIndex: 300,
          backdropFilter: 'blur(3px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, calc(100vw - 32px))',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          zIndex: 301,
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '20px 22px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                color: 'var(--accent)',
              }}
            >
              <MessageSquarePlus size={16} />
              <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'Syne, sans-serif' }}>
                Iniciar conversa humana
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                fontFamily: 'Syne, sans-serif',
              }}
            >
              {leadNome}
            </h3>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {telefone || 'Lead sem telefone informado'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: sending ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: '1.5',
            }}
          >
            A conversa será criada no modo <strong>humano</strong> e, após o envio, você cairá direto na thread da Caixa de Entrada.
          </p>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Escreva a primeira mensagem para este lead..."
            rows={6}
            style={{
              width: '100%',
              resize: 'vertical',
              minHeight: '140px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box',
            }}
          />
          {error ? (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: '12px',
                color: '#ef4444',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {error}
            </p>
          ) : null}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Use esse fluxo para abordar um lead individual sem depender de conversa prévia.
            </span>
            <button
              onClick={handleSubmit}
              disabled={sending || !telefone}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                background: sending || !telefone ? 'var(--bg-hover)' : 'var(--accent)',
                color: sending || !telefone ? 'var(--text-muted)' : '#fff',
                cursor: sending || !telefone ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '700',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              Enviar e abrir thread
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
