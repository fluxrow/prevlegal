'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type ImportStats = {
    total_registros: number
    total_ativos: number
    total_cessados: number
    duplicatas_planilha: number
    duplicatas_banco: number
    inseridos: number
    ganho_potencial_total: number
}

export default function LeadsPage() {
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ImportStats | null>(null)
    const [error, setError] = useState('')
    const [nomeLista, setNomeLista] = useState('')
    const [fornecedor, setFornecedor] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    function fmt(v: number) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0)
    }

    async function handleImport(file: File) {
        if (!file) return
        setLoading(true)
        setError('')
        setResult(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('nome', nomeLista || file.name.replace(/\.[^.]+$/, ''))
        formData.append('fornecedor', fornecedor)

        try {
            const res = await fetch('/api/import', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.success) {
                setResult(data.stats)
            } else {
                setError(data.error || 'Erro ao importar')
            }
        } catch {
            setError('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleImport(file)
    }

    return (
        <div style={{ padding: '32px', maxWidth: '800px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>Leads</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Importe uma planilha de beneficiários para começar</p>
            </div>

            {/* Config */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome da lista</label>
                    <input
                        value={nomeLista}
                        onChange={e => setNomeLista(e.target.value)}
                        placeholder="Ex: Lista RJ Banco do Brasil"
                        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fornecedor</label>
                    <input
                        value={fornecedor}
                        onChange={e => setFornecedor(e.target.value)}
                        placeholder="Ex: Assertiva, Lemit..."
                        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                    />
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '16px',
                    padding: '60px 32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? 'var(--accent-glow)' : 'var(--bg-card)',
                    transition: 'all 0.2s',
                    marginBottom: '24px'
                }}
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
                />
                {loading ? (
                    <div>
                        <Loader2 size={40} color="var(--accent)" style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Processando planilha...</p>
                    </div>
                ) : (
                    <div>
                        <FileSpreadsheet size={40} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                        <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>
                            Arraste a planilha aqui ou clique para selecionar
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            Suporta .xlsx e .xls — apenas beneficiários Ativos serão importados
                        </p>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--red-bg)', border: '1px solid #ff575730', borderRadius: '10px', marginBottom: '16px' }}>
                    <AlertCircle size={18} color="var(--red)" />
                    <span style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</span>
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <CheckCircle2 size={22} color="var(--green)" />
                        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: '600', color: 'var(--green)' }}>Importação concluída!</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Total na planilha', value: result.total_registros, color: 'var(--text-primary)' },
                            { label: 'Ativos importados', value: result.inseridos, color: 'var(--green)' },
                            { label: 'Cessados ignorados', value: result.total_cessados, color: 'var(--text-muted)' },
                            { label: 'Duplicatas planilha', value: result.duplicatas_planilha, color: 'var(--yellow)' },
                            { label: 'Duplicatas no banco', value: result.duplicatas_banco, color: 'var(--yellow)' },
                            { label: 'Potencial total', value: fmt(result.ganho_potencial_total), color: 'var(--accent)' },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: '10px', padding: '16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                                <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Syne, sans-serif', color }}>{value}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <a href="/dashboard" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>
                            Ver dashboard atualizado →
                        </a>
                    </div>
                </div>
            )}
        </div>
    )
}
