'use client'

import React, { useState, useEffect } from 'react'
import { GitMerge, Plus, AlertCircle, RefreshCw, Trash2, Edit3, Settings, Play } from 'lucide-react'

// Definindo a interface para o gatilho
export interface EventTrigger {
  id: string
  tenant_id: string
  trigger_evento: string
  trigger_condicao: string
  acao_tipo: string
  acao_ref_id: string
  cancelar_followups_rodando: boolean
  enviar_mensagem_transicao: boolean
  mensagem_transicao_texto: string | null
  is_template_default: boolean
  ativo: boolean
  created_at: string
}

export default function TriggerConfig() {
  const [triggers, setTriggers] = useState<EventTrigger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTriggers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/automacoes/triggers')
      if (!res.ok) throw new Error('Falha ao carregar gatilhos')
      const data = await res.json()
      setTriggers(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTriggers()
  }, [])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              padding: '8px 16px',
              background: 'var(--text-primary)',
              color: 'var(--bg-default)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => alert('Em breve: Formulário de Gatilho')}
          >
            <Plus size={14} />
            Novo Gatilho
          </button>

          <button
            style={{
              padding: '8px 16px',
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => alert('Em breve: Seed Templates')}
          >
            <Play size={14} />
            Templates PrevLegal
          </button>
        </div>

        {loading && <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--text-muted)' }} />}
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {!loading && triggers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'var(--bg-default)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <GitMerge size={24} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>Nenhum gatilho configurado</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Crie regras automáticas para economizar tempo do time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {triggers.map(t => (
            <div key={t.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              background: 'var(--bg-default)',
              border: '1px solid var(--border)',
              borderRadius: '10px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Se lead for para <span style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: '4px' }}>{t.trigger_condicao}</span>
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ação: {t.acao_tipo === 'iniciar_followup' ? 'Inicia Régua' : 'Troca Agente'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  backgroundColor: t.ativo ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)',
                  color: t.ativo ? '#22c55e' : 'var(--text-muted)',
                  borderRadius: '12px',
                  fontWeight: '600',
                  marginRight: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {t.ativo ? 'ON' : 'OFF'}
                </span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                  onClick={() => alert('Em breve')}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
