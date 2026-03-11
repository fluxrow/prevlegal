'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

type ImportStats = {
  total_registros: number
  total_ativos: number
  total_cessados: number
  duplicatas_planilha: number
  duplicatas_banco: number
  inseridos: number
  ganho_potencial_total: number
}

export default function ImportPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportStats | null>(null)
  const [error, setError] = useState('')
  const [nomeLista, setNomeLista] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function fmt(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0)
  }

  async function handleImport(file: File) {
    setLoading(true); setError(''); setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('nome', nomeLista || file.name.replace(/\.[^.]+$/, ''))
    formData.append('fornecedor', fornecedor)
    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) setResult(data.stats)
      else setError(data.error || 'Erro ao importar')
    } catch { setError('Erro de conexão') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <a href="/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={14} /> Voltar para Leads
        </a>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>Importar Lista</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Apenas beneficiários Ativos serão importados. Duplicatas por NB são ignoradas.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Nome da lista', value: nomeLista, set: setNomeLista, placeholder: 'Ex: Lista RJ Banco do Brasil' },
          { label: 'Fornecedor', value: fornecedor, set: setFornecedor, placeholder: 'Ex: Assertiva, Lemit...' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
          </div>
        ))}
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImport(f) }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '14px', padding: '50px 32px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--accent-glow)' : 'var(--bg-card)', transition: 'all 0.2s', marginBottom: '20px' }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }} />
        {loading
          ? <div><Loader2 size={36} color="var(--accent)" style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} /><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Processando...</p></div>
          : <div><FileSpreadsheet size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} /><p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Arraste a planilha ou clique para selecionar</p><p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>.xlsx e .xls suportados</p></div>
        }
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid #ff575730', borderRadius: '10px', marginBottom: '16px' }}>
          <AlertCircle size={16} color="var(--red)" />
          <span style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {result && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <CheckCircle2 size={20} color="var(--green)" />
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--green)' }}>Importação concluída!</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Total na planilha', value: result.total_registros, color: 'var(--text-primary)' },
              { label: 'Inseridos', value: result.inseridos, color: 'var(--green)' },
              { label: 'Cessados ignorados', value: result.total_cessados, color: 'var(--text-muted)' },
              { label: 'Duplicatas planilha', value: result.duplicatas_planilha, color: 'var(--yellow)' },
              { label: 'Duplicatas no banco', value: result.duplicatas_banco, color: 'var(--yellow)' },
              { label: 'Potencial total', value: fmt(result.ganho_potencial_total), color: 'var(--accent)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <a href="/leads" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>Ver Kanban atualizado →</a>
          </div>
        </div>
      )}
    </div>
  )
}
