'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, MessageSquare, FileText, ArrowRight, X, Loader2 } from 'lucide-react'

interface Resultado {
  tipo: 'lead' | 'conversa' | 'documento'
  id: string
  titulo: string
  subtitulo: string
  badge: string
  href: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo', contacted: 'Contatado', awaiting: 'Aguardando',
  scheduled: 'Agendado', converted: 'Convertido', lost: 'Perdido',
  agente: 'Agente', humano: 'Advogado', encerrado: 'Encerrado',
}
const STATUS_COLORS: Record<string, string> = {
  new: '#4f7aff', contacted: '#f5c842', awaiting: '#ff8c42',
  scheduled: '#a78bfa', converted: '#2dd4a0', lost: '#ff5757',
  agente: '#4f7aff', humano: '#2dd4a0', encerrado: '#6b7280',
  IA: '#a78bfa',
}
const TIPO_ICON: Record<string, React.ReactNode> = {
  lead: <User size={14} />,
  conversa: <MessageSquare size={14} />,
  documento: <FileText size={14} />,
}
const TIPO_LABEL: Record<string, string> = {
  lead: 'Lead',
  conversa: 'Conversa',
  documento: 'Documento',
}

export default function BuscaGlobal() {
  const [aberto, setAberto] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [selecionado, setSelecionado] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Atalho ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAberto(a => !a)
      }
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Foca o input ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResultados([])
      setSelecionado(0)
    }
  }, [aberto])

  // Busca com debounce
  useEffect(() => {
    if (!query || query.length < 2) { setResultados([]); return }
    clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        setResultados(json.resultados || [])
        setSelecionado(0)
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Navegação por teclado
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelecionado(s => Math.min(s + 1, resultados.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelecionado(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && resultados[selecionado]) { navegar(resultados[selecionado].href) }
  }

  function navegar(href: string) {
    router.push(href)
    setAberto(false)
  }

  if (!aberto) return (
    <button
      onClick={() => setAberto(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '9px', padding: '7px 12px', cursor: 'pointer',
        color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Sans',
      }}
      title="Busca global (⌘K)">
      <Search size={13} />
      <span>Buscar...</span>
      <span style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
        <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>⌘</kbd>
        <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>K</kbd>
      </span>
    </button>
  )

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setAberto(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9998, backdropFilter: 'blur(2px)' }}
      />

      {/* Paleta */}
      <div style={{
        position: 'fixed', top: '18vh', left: '50%', transform: 'translateX(-50%)',
        width: '580px', maxWidth: '94vw',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        zIndex: 9999, overflow: 'hidden',
      }}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderBottom: resultados.length > 0 || loading ? '1px solid var(--border)' : 'none' }}>
          {loading
            ? <Loader2 size={16} color="var(--accent)" style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
            : <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar lead, conversa, documento..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'DM Sans',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
              <X size={15} />
            </button>
          )}
          <kbd onClick={() => setAberto(false)}
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '5px', padding: '2px 7px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans' }}>
            Esc
          </kbd>
        </div>

        {/* Resultados agrupados por tipo */}
        {resultados.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
            {(['lead', 'conversa', 'documento'] as const).map(tipo => {
              const grupo = resultados.filter(r => r.tipo === tipo)
              if (grupo.length === 0) return null
              return (
                <div key={tipo} style={{ marginBottom: '4px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px', margin: 0 }}>
                    {TIPO_LABEL[tipo]}s
                  </p>
                  {grupo.map(r => {
                    const globalIdx = resultados.indexOf(r)
                    const ativo = globalIdx === selecionado
                    const cor = STATUS_COLORS[r.badge] || '#6b7280'
                    return (
                      <button
                        key={r.id}
                        onClick={() => navegar(r.href)}
                        onMouseEnter={() => setSelecionado(globalIdx)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                          background: ativo ? 'var(--bg-hover)' : 'transparent',
                          border: 'none', borderRadius: '9px', padding: '10px 12px',
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                        }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${cor}18`, border: `1px solid ${cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cor }}>
                          {TIPO_ICON[r.tipo]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.titulo}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{r.subtitulo}</p>
                        </div>
                        {r.badge && (
                          <span style={{ fontSize: '10px', fontWeight: '700', background: `${cor}18`, color: cor, border: `1px solid ${cor}30`, borderRadius: '20px', padding: '2px 8px', flexShrink: 0 }}>
                            {STATUS_LABELS[r.badge] || r.badge}
                          </span>
                        )}
                        {ativo && <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {query.length >= 2 && !loading && resultados.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Nenhum resultado para <strong style={{ color: 'var(--text-secondary)' }}>"{query}"</strong>
            </p>
          </div>
        )}

        {/* Dica de teclado */}
        {resultados.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            {[['↑↓', 'Navegar'], ['↵', 'Abrir'], ['Esc', 'Fechar']].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>{key}</kbd>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
