'use client'
import { useEffect, useState } from 'react'
import { List, CheckCircle, XCircle, HelpCircle, Zap, Upload, Users, Trash2, FolderPlus } from 'lucide-react'
import ListasOnboardingTour from '@/components/listas-onboarding-tour'

interface Lista {
  id: string
  nome: string
  arquivo_original?: string | null
  fornecedor?: string | null
  total_leads: number
  com_whatsapp: number
  sem_whatsapp: number
  nao_verificado: number
  created_at: string
}

export default function ListasPage() {
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [verificando, setVerificando] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [statsVerif, setStatsVerif] = useState<Record<string, any>>({})
  const [acaoErro, setAcaoErro] = useState<string>('')

  useEffect(() => { fetchListas() }, [])

  async function fetchListas() {
    setLoading(true)
    const res = await fetch('/api/listas')
    if (res.ok) { const data = await res.json(); setListas(data.listas || []) }
    setLoading(false)
  }

  async function excluirLista(lista: Lista) {
    const confirmar = window.confirm(
      `Excluir a lista "${lista.nome}"? Isso removerá também os leads vinculados a ela.`
    )
    if (!confirmar) return

    setAcaoErro('')
    setExcluindo(lista.id)

    try {
      const res = await fetch(`/api/listas/${lista.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setAcaoErro(data.error || 'Falha ao excluir a lista')
      } else {
        setListas(prev => prev.filter(item => item.id !== lista.id))
      }
    } catch {
      setAcaoErro('Falha ao excluir a lista')
    } finally {
      setExcluindo(null)
    }
  }

  async function verificarWhatsApp(listaId: string) {
    setVerificando(listaId)
    setStatsVerif(prev => ({ ...prev, [listaId]: null }))
    try {
      const res = await fetch('/api/whatsapp/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista_id: listaId })
      })
      const data = await res.json()
      setStatsVerif(prev => ({ ...prev, [listaId]: data }))
      await fetchListas()
    } catch {
      setStatsVerif(prev => ({ ...prev, [listaId]: { error: 'Falha na verificacao' } }))
    }
    setVerificando(null)
  }

  const pct = (num: number, total: number) => total > 0 ? Math.round((num / total) * 100) : 0

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Listas de Leads</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Gerencie suas listas importadas e verifique presenca no WhatsApp
          </p>
        </div>
        <a data-tour="listas-importar" href="/leads/import" style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px',
          borderRadius: '8px', background: 'var(--accent)', color: '#fff',
          textDecoration: 'none', fontSize: '13px', fontWeight: '500'
        }}>
          <Upload size={14} /> Importar lista
        </a>
      </div>

      <div data-tour="listas-status" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {[
          { icon: CheckCircle, label: 'Com WhatsApp', color: '#22c55e', text: 'Leads aptos para receber disparos.' },
          { icon: XCircle, label: 'Sem WhatsApp', color: '#ef4444', text: 'Números marcados para não entrar na campanha.' },
          { icon: HelpCircle, label: 'Não verificados', color: 'var(--text-muted)', text: 'Contatos aguardando checagem automática.' },
        ].map(({ icon: Icon, label, color, text }) => (
          <div key={label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Icon size={14} color={color} />
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</strong>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>{text}</p>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '18px'
      }}>
        <FolderPlus size={16} color="var(--accent)" style={{ marginTop: '1px', flexShrink: 0 }} />
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Cadastros manuais ficam agrupados no Kanban de Leads
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            A lista técnica de cadastro manual é interna do sistema e não aparece mais aqui para não misturar clientes avulsos com listas importadas.
          </p>
        </div>
      </div>

      {acaoErro && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'var(--red-bg)',
          border: '1px solid rgba(255,87,87,0.2)',
          borderRadius: '10px',
          color: 'var(--red)',
          fontSize: '13px'
        }}>
          {acaoErro}
        </div>
      )}

      {!loading && listas.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)'
        }}>
          <List size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '14px' }}>Nenhuma lista importada ainda</p>
        </div>
      )}

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando listas...</div>}

      <div data-tour="listas-lista" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {listas.map(lista => {
          const total = lista.total_leads || 0
          const isVerificando = verificando === lista.id
          const statResult = statsVerif[lista.id]
          return (
            <div key={lista.id} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={15} color="var(--accent)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{lista.nome}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(lista.created_at).toLocaleDateString('pt-BR')} · {total.toLocaleString('pt-BR')} leads
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => verificarWhatsApp(lista.id)} disabled={isVerificando || excluindo === lista.id} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                    borderRadius: '8px', background: isVerificando ? 'var(--bg-hover)' : 'var(--accent-glow)',
                    color: isVerificando ? 'var(--text-muted)' : 'var(--accent)',
                    border: '1px solid var(--border)', fontSize: '12px', fontWeight: '500',
                    cursor: isVerificando ? 'not-allowed' : 'pointer'
                  }}>
                    <Zap size={13} />
                    {isVerificando ? 'Verificando...' : 'Verificar WhatsApp'}
                  </button>
                  <button
                    onClick={() => excluirLista(lista)}
                    disabled={isVerificando || excluindo === lista.id}
                    title="Excluir lista"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.18)',
                      cursor: excluindo === lista.id ? 'not-allowed' : 'pointer',
                      opacity: excluindo === lista.id ? 0.6 : 1,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: total > 0 ? '14px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} color="#22c55e" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#22c55e' }}>{lista.com_whatsapp}</strong> com WhatsApp
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={14} color="#ef4444" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#ef4444' }}>{lista.sem_whatsapp}</strong> sem WhatsApp
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>{lista.nao_verificado}</strong> nao verificados
                  </span>
                </div>
              </div>
              {total > 0 && (
                <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-hover)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: pct(lista.com_whatsapp, total) + '%', background: '#22c55e', transition: 'width 0.4s' }} />
                  <div style={{ width: pct(lista.sem_whatsapp, total) + '%', background: '#ef444440' }} />
                  <div style={{ width: pct(lista.nao_verificado, total) + '%', background: 'var(--border)' }} />
                </div>
              )}
              {statResult && (
                <div style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                  background: statResult.error ? '#ef444410' : '#22c55e10',
                  border: '1px solid ' + (statResult.error ? '#ef444430' : '#22c55e30'),
                  fontSize: '12px', color: statResult.error ? '#ef4444' : '#22c55e'
                }}>
                  {statResult.error
                    ? '❌ ' + statResult.error
                    : '✅ ' + statResult.stats?.verificados + ' verificados · ' + statResult.stats?.com_whatsapp + ' com WhatsApp · ' + statResult.stats?.sem_whatsapp + ' sem WhatsApp'
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ListasOnboardingTour />
    </div>
  )
}
