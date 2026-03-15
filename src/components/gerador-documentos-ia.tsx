'use client'
import { useState } from 'react'
import { Sparkles, FileText, Copy, Check, Download, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { TIPOS_DOCUMENTO, TipoDocumento } from '@/lib/doc-templates'

interface Props { leadId: string; leadNome: string }

export default function GeradorDocumentosIA({ leadId, leadNome }: Props) {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoDocumento>('peticao_inicial')
  const [gerando, setGerando] = useState(false)
  const [documentoGerado, setDocumentoGerado] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [expandido, setExpandido] = useState(true)

  async function gerar() {
    setGerando(true)
    setErro('')
    setDocumentoGerado(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/gerar-documento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipoSelecionado }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar documento')
      setDocumentoGerado(json.conteudo)
      setExpandido(true)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar documento')
    }
    setGerando(false)
  }

  async function copiar() {
    if (!documentoGerado) return
    await navigator.clipboard.writeText(documentoGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  function baixarTxt() {
    if (!documentoGerado) return
    const blob = new Blob([documentoGerado], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${TIPOS_DOCUMENTO[tipoSelecionado].label} — ${leadNome}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Sparkles size={16} color="var(--purple)" />
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>
            Geração de Documentos IA
          </h3>
          <span style={{ fontSize: '10px', background: 'rgba(167,139,250,0.12)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '20px', padding: '2px 8px', fontWeight: '600' }}>
            BETA
          </span>
        </div>
      </div>

      {/* Seleção de tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {(Object.entries(TIPOS_DOCUMENTO) as [TipoDocumento, typeof TIPOS_DOCUMENTO[TipoDocumento]][]).map(([key, info]) => (
          <button key={key} onClick={() => { setTipoSelecionado(key); setDocumentoGerado(null); setErro('') }}
            style={{
              background: tipoSelecionado === key ? 'rgba(79,122,255,0.1)' : 'var(--bg)',
              border: `1px solid ${tipoSelecionado === key ? 'rgba(79,122,255,0.4)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '12px', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}>
            <p style={{ fontSize: '18px', margin: '0 0 6px' }}>{info.emoji}</p>
            <p style={{ fontSize: '12px', fontWeight: '700', color: tipoSelecionado === key ? 'var(--accent)' : 'var(--text-primary)', margin: '0 0 3px', fontFamily: 'DM Sans' }}>{info.label}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{info.descricao}</p>
          </button>
        ))}
      </div>

      {/* Aviso sobre perfil */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(79,122,255,0.06)', border: '1px solid rgba(79,122,255,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
        <AlertCircle size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
          O documento será gerado com os dados do lead, seu perfil OAB e o resultado da calculadora previdenciária.
          Certifique-se que o <strong style={{ color: 'var(--text-primary)' }}>Perfil do Advogado</strong> está preenchido para melhores resultados.
          Revise sempre o documento antes de usar.
        </p>
      </div>

      {/* Botão gerar */}
      <button onClick={gerar} disabled={gerando}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: gerando ? 'var(--bg-hover)' : 'linear-gradient(135deg, var(--accent), var(--purple))',
          border: 'none', borderRadius: '10px', padding: '12px', color: '#fff',
          fontSize: '14px', fontWeight: '600', cursor: gerando ? 'not-allowed' : 'pointer',
          fontFamily: 'DM Sans', marginBottom: '16px', opacity: gerando ? 0.8 : 1,
        }}>
        {gerando
          ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Gerando documento com IA...</>
          : <><Sparkles size={15} /> Gerar {TIPOS_DOCUMENTO[tipoSelecionado].label}</>}
      </button>

      {/* Erro */}
      {erro && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
          <AlertCircle size={13} color="var(--red)" />
          <p style={{ fontSize: '12px', color: 'var(--red)', margin: 0 }}>{erro}</p>
        </div>
      )}

      {/* Documento gerado */}
      {documentoGerado && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Barra de ações */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={13} color="var(--green)" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {TIPOS_DOCUMENTO[tipoSelecionado].label} gerada
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(45,212,160,0.12)', color: 'var(--green)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: '20px', padding: '1px 7px' }}>
                Salvo no lead
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={copiar}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                {copiado ? <><Check size={11} color="var(--green)" /> Copiado</> : <><Copy size={11} /> Copiar</>}
              </button>
              <button onClick={baixarTxt}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                <Download size={11} /> .txt
              </button>
              <button onClick={() => setExpandido(e => !e)}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 8px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          {expandido && (
            <div style={{ padding: '20px 24px', maxHeight: '520px', overflowY: 'auto' }}>
              <pre style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', lineHeight: '1.8',
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
              }}>
                {documentoGerado}
              </pre>
            </div>
          )}

          {/* Aviso de revisão */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'rgba(245,200,66,0.04)' }}>
            <p style={{ fontSize: '10px', color: 'var(--yellow)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={10} /> Documento gerado por IA. Revise todos os dados antes de assinar ou protocolar.
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
