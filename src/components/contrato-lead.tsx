'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, DollarSign, Plus, X } from 'lucide-react'

interface Props {
  leadId: string
}

interface Contrato {
  id: string
  valor_total: number
  valor_entrada: number
  num_parcelas: number
  tipo_cobranca: string
  percentual_exito: number | null
  percentual_sucumbencia: number | null
  honorario_sucumbencia: number | null
  sucumbencia_status: string | null
  sucumbencia_data: string | null
  sucumbencia_observacoes: string | null
  status: string
  descricao: string | null
  parcelas: {
    id: string
    numero: number
    valor: number
    data_vencimento: string
    status: string
  }[]
}

const FORM0 = {
  valor_total: '',
  valor_entrada: '',
  num_parcelas: '1',
  tipo_cobranca: 'exito',
  percentual_exito: '30',
  percentual_sucumbencia: '',
  honorario_sucumbencia: '',
  sucumbencia_status: 'pendente',
  sucumbencia_data: '',
  sucumbencia_observacoes: '',
  descricao: '',
  data_assinatura: '',
}

function moeda(v: number) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function ContratoLead({ leadId }: Props) {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM0)
  const [salvando, setSalvando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  useEffect(() => {
    fetchContratos()
  }, [leadId])

  async function fetchContratos() {
    const res = await fetch(`/api/financeiro/contratos?lead_id=${leadId}`)
    const json = await res.json()
    if (json.contratos) setContratos(json.contratos)
  }

  async function criarContrato() {
    if (!form.valor_total) return
    setSalvando(true)

    await fetch('/api/financeiro/contratos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        ...form,
        valor_total: parseFloat(form.valor_total),
        valor_entrada: parseFloat(form.valor_entrada || '0'),
        num_parcelas: parseInt(form.num_parcelas, 10),
        percentual_exito: form.percentual_exito ? parseFloat(form.percentual_exito) : null,
        percentual_sucumbencia: form.percentual_sucumbencia ? parseFloat(form.percentual_sucumbencia) : null,
        honorario_sucumbencia: form.honorario_sucumbencia ? parseFloat(form.honorario_sucumbencia) : null,
        sucumbencia_data: form.sucumbencia_data || null,
        sucumbencia_observacoes: form.sucumbencia_observacoes || null,
      }),
    })

    await fetchContratos()
    setShowForm(false)
    setForm(FORM0)
    setSalvando(false)
  }

  async function marcarParcela(parcelaId: string, status: 'pago' | 'pendente') {
    setAtualizando(parcelaId)
    await fetch(`/api/financeiro/parcelas/${parcelaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        forma_pagamento: status === 'pago' ? 'pix' : null,
        data_pagamento: status === 'pendente' ? null : undefined,
      }),
    })
    await fetchContratos()
    setAtualizando(null)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '9px',
    padding: '9px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '5px',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <DollarSign size={16} color="var(--green)" />
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>
            Contrato / Honorários
          </h3>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <Plus size={12} /> Novo contrato
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descrição do serviço</label>
              <input value={form.descricao} onChange={(e) => setForm((current) => ({ ...current, descricao: e.target.value }))} placeholder="Ação de readequação do teto previdenciário" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor total (R$) *</label>
              <input type="number" value={form.valor_total} onChange={(e) => setForm((current) => ({ ...current, valor_total: e.target.value }))} placeholder="0,00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Entrada (R$)</label>
              <input type="number" value={form.valor_entrada} onChange={(e) => setForm((current) => ({ ...current, valor_entrada: e.target.value }))} placeholder="0,00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nº de parcelas</label>
              <input type="number" min="0" value={form.num_parcelas} onChange={(e) => setForm((current) => ({ ...current, num_parcelas: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo de cobrança</label>
              <select value={form.tipo_cobranca} onChange={(e) => setForm((current) => ({ ...current, tipo_cobranca: e.target.value }))} style={inputStyle}>
                <option value="exito">Êxito</option>
                <option value="fixo">Fixo</option>
                <option value="misto">Misto (fixo + êxito)</option>
              </select>
            </div>
            {(form.tipo_cobranca === 'exito' || form.tipo_cobranca === 'misto') && (
              <div>
                <label style={labelStyle}>% de êxito</label>
                <input type="number" value={form.percentual_exito} onChange={(e) => setForm((current) => ({ ...current, percentual_exito: e.target.value }))} placeholder="30" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Data de assinatura</label>
              <input type="date" value={form.data_assinatura} onChange={(e) => setForm((current) => ({ ...current, data_assinatura: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ background: 'rgba(79,122,255,0.08)', border: '1px solid rgba(79,122,255,0.16)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              {'\uD83D\uDCA1'} Honorários de sucumbência são definidos pelo juiz na sentença e pagos pela parte vencida. São independentes dos honorários contratuais e geralmente representam um valor adicional significativo.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Percentual de sucumbência (definido na sentença)</label>
              <input type="number" value={form.percentual_sucumbencia} onChange={(e) => setForm((current) => ({ ...current, percentual_sucumbencia: e.target.value }))} placeholder="10" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor de sucumbência (a definir após sentença)</label>
              <input type="number" value={form.honorario_sucumbencia} onChange={(e) => setForm((current) => ({ ...current, honorario_sucumbencia: e.target.value }))} placeholder="0,00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Status da sucumbência</label>
              <select value={form.sucumbencia_status} onChange={(e) => setForm((current) => ({ ...current, sucumbencia_status: e.target.value }))} style={inputStyle}>
                <option value="pendente">Pendente</option>
                <option value="recebido">Recebido</option>
                <option value="renunciado">Renunciado</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data do recebimento</label>
              <input type="date" value={form.sucumbencia_data} onChange={(e) => setForm((current) => ({ ...current, sucumbencia_data: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Observações sobre sucumbência</label>
              <textarea
                value={form.sucumbencia_observacoes}
                onChange={(e) => setForm((current) => ({ ...current, sucumbencia_observacoes: e.target.value }))}
                placeholder="Ex.: valor estimado na sentença, prazo de recebimento, acordo ou renúncia"
                style={{ ...inputStyle, minHeight: '88px', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setForm(FORM0) }} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Cancelar
            </button>
            <button
              onClick={criarContrato}
              disabled={salvando || !form.valor_total}
              style={{ fontSize: '12px', fontWeight: '600', color: '#fff', background: (!form.valor_total || salvando) ? 'var(--bg-hover)' : 'var(--green)', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              {salvando ? 'Criando...' : 'Criar contrato'}
            </button>
          </div>
        </div>
      )}

      {contratos.length === 0 && !showForm && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
          Nenhum contrato criado para este lead
        </p>
      )}

      {contratos.map((contrato) => {
        const totalPago = contrato.parcelas?.filter((parcela) => parcela.status === 'pago').reduce((acc, parcela) => acc + Number(parcela.valor), 0) || 0
        const aberto = expandido === contrato.id

        return (
          <div key={contrato.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpandido(aberto ? null : contrato.id)}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {moeda(contrato.valor_total)} — {contrato.num_parcelas}x parcela{contrato.num_parcelas !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {contrato.sucumbencia_status === 'pendente' && (
                    <span style={{ fontSize: '10px', color: '#f5c842', background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.22)', borderRadius: '20px', padding: '2px 8px', fontWeight: '700' }}>
                      Sucumbência pendente
                    </span>
                  )}
                  {contrato.sucumbencia_status === 'recebido' && (
                    <span style={{ fontSize: '10px', color: 'var(--green)', background: 'rgba(45,212,160,0.12)', border: '1px solid rgba(45,212,160,0.22)', borderRadius: '20px', padding: '2px 8px', fontWeight: '700' }}>
                      Sucumbência recebida
                    </span>
                  )}
                  {contrato.sucumbencia_status === 'renunciado' && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.2)', borderRadius: '20px', padding: '2px 8px', fontWeight: '700' }}>
                      Sucumbência renunciada
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  {moeda(totalPago)} recebido · {contrato.descricao || 'Honorários'}
                </p>
              </div>
              {aberto ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
            </div>
            {aberto && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                    Honorários de sucumbência
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Valor: {contrato.honorario_sucumbencia ? moeda(contrato.honorario_sucumbencia) : 'A definir'}
                    {contrato.percentual_sucumbencia !== null && ` · ${contrato.percentual_sucumbencia}%`}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 2px' }}>
                    Status: {contrato.sucumbencia_status || 'pendente'}
                    {contrato.sucumbencia_data && ` · Recebido em ${fmtData(contrato.sucumbencia_data)}`}
                  </p>
                  {contrato.sucumbencia_observacoes && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      {contrato.sucumbencia_observacoes}
                    </p>
                  )}
                </div>
                {contrato.parcelas?.sort((a, b) => a.numero - b.numero).map((parcela) => (
                  <div key={parcela.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', borderRadius: '7px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: parcela.status === 'pago' ? 'var(--green)' : parcela.status === 'atrasado' ? 'var(--red)' : 'var(--yellow)', minWidth: '20px' }}>
                      #{parcela.numero}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1 }}>
                      {moeda(parcela.valor)} · Venc {fmtData(parcela.data_vencimento)}
                    </span>
                    <span style={{ fontSize: '10px', color: parcela.status === 'pago' ? 'var(--green)' : parcela.status === 'atrasado' ? 'var(--red)' : 'var(--yellow)' }}>
                      {parcela.status === 'pago' ? 'Pago' : parcela.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                    </span>
                    {parcela.status !== 'pago' ? (
                      <button
                        onClick={() => marcarParcela(parcela.id, 'pago')}
                        disabled={atualizando === parcela.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: '6px', padding: '4px 8px', color: 'var(--green)', fontSize: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {atualizando === parcela.id ? '...' : <><Check size={10} /> Pago</>}
                      </button>
                    ) : (
                      <button
                        onClick={() => marcarParcela(parcela.id, 'pendente')}
                        disabled={atualizando === parcela.id}
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {atualizando === parcela.id ? '...' : <X size={10} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
