'use client'

import { useState, useEffect, useCallback } from 'react'
import { calcularPrev, PeriodoContribuicao, ResultadoCalculo } from '@/lib/calculadora-prev'
import { Calculator, Plus, Trash2, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react'

interface Props {
  leadId: string
}

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const TIPO_PERIODO_LABEL: Record<string, string> = {
  normal: 'Contribuição Normal',
  especial_15: 'Especial 15 anos (alto risco)',
  especial_20: 'Especial 20 anos (risco médio)',
  especial_25: 'Especial 25 anos (risco baixo)',
}

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesesParaTexto(m: number): string {
  if (m <= 0) return '0 meses'
  const anos = Math.floor(m / 12)
  const meses = m % 12
  const partes = []
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`)
  if (meses > 0) partes.push(`${meses} mes${meses > 1 ? 'es' : ''}`)
  return partes.join(' e ')
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function CalculadoraPrev({ leadId }: Props) {
  const [aberta, setAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)

  // Form state
  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState<'M' | 'F'>('M')
  const [periodos, setPeriodos] = useState<PeriodoContribuicao[]>([
    { inicio: '', fim: '', tipo: 'normal' }
  ])
  const [salariosInput, setSalariosInput] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Resultado
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null)
  const [detalheAberto, setDetalheAberto] = useState<number | null>(null)

  const showToast = (msg: string, tipo: 'ok' | 'erro') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // Carregar dados salvos
  useEffect(() => {
    fetch(`/api/leads/${leadId}/calculadora`)
      .then(r => r.json())
      .then(({ calculadora }) => {
        if (!calculadora) return
        if (calculadora.data_nascimento) setDataNascimento(calculadora.data_nascimento.split('T')[0])
        if (calculadora.sexo) setSexo(calculadora.sexo)
        if (calculadora.periodos?.length) setPeriodos(calculadora.periodos)
        if (calculadora.salarios_contribuicao?.length) setSalariosInput(calculadora.salarios_contribuicao.join(', '))
        if (calculadora.observacoes) setObservacoes(calculadora.observacoes)
      })
      .catch(() => {})
  }, [leadId])

  const calcular = useCallback(() => {
    if (!dataNascimento || !sexo) return
    const periodosValidos = periodos.filter(p => p.inicio)
    if (periodosValidos.length === 0) return

    const salarios = salariosInput
      .split(',')
      .map(s => parseFloat(s.trim().replace(',', '.')))
      .filter(n => !isNaN(n) && n > 0)

    const res = calcularPrev({
      data_nascimento: dataNascimento,
      sexo,
      periodos: periodosValidos,
      salarios_contribuicao: salarios,
    })
    setResultado(res)
  }, [dataNascimento, sexo, periodos, salariosInput])

  // Recalcular ao mudar dados
  useEffect(() => {
    if (dataNascimento && periodos.some(p => p.inicio)) calcular()
  }, [dataNascimento, sexo, periodos, salariosInput, calcular])

  async function salvar() {
    if (!resultado) return
    setSalvando(true)
    try {
      const salarios = salariosInput
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n) && n > 0)

      await fetch(`/api/leads/${leadId}/calculadora`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_nascimento: dataNascimento,
          sexo,
          periodos,
          salarios_contribuicao: salarios,
          observacoes,
          ...resultado,
          data_calculo: new Date().toISOString(),
        }),
      })
      showToast('Cálculo salvo com sucesso!', 'ok')
    } catch {
      showToast('Erro ao salvar cálculo', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  function adicionarPeriodo() {
    setPeriodos(p => [...p, { inicio: '', fim: '', tipo: 'normal' }])
  }

  function removerPeriodo(i: number) {
    setPeriodos(p => p.filter((_, idx) => idx !== i))
  }

  function atualizarPeriodo(i: number, campo: keyof PeriodoContribuicao, valor: string) {
    setPeriodos(p => p.map((per, idx) => idx === i ? { ...per, [campo]: valor } : per))
  }

  const elegivel = resultado && (
    resultado.elegivel_regra_permanente ||
    resultado.elegivel_regra_pontos ||
    resultado.elegivel_regra_idade_progressiva ||
    resultado.elegivel_regra_pedagio_50 ||
    resultado.elegivel_regra_pedagio_100 ||
    resultado.elegivel_aposentadoria_especial
  )

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: toast.tipo === 'ok' ? '#16a34a' : '#dc2626',
          color: '#fff', borderRadius: '8px', padding: '12px 20px',
          fontSize: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>{toast.msg}</div>
      )}

      {/* Header colapsável */}
      <button
        onClick={() => setAberta(a => !a)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderRadius: aberta ? '10px 10px 0 0' : '10px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calculator size={18} color="var(--accent)" />
          Calculadora Previdenciária
          {resultado && (
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
              background: elegivel ? '#16a34a20' : '#f59e0b20',
              color: elegivel ? '#16a34a' : '#f59e0b', fontWeight: '500',
            }}>
              {elegivel ? `Elegível — ${resultado.regra_aplicavel}` : `Faltam ${mesesParaTexto(resultado.falta_contribuicao_meses + resultado.falta_idade_meses)}`}
            </span>
          )}
        </div>
        {aberta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {aberta && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '20px',
        }}>
          {/* Dados básicos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Data de Nascimento</label>
              <input
                type="date" value={dataNascimento}
                onChange={e => setDataNascimento(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Sexo</label>
              <select value={sexo} onChange={e => setSexo(e.target.value as 'M' | 'F')} style={inputStyle}>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          {/* Períodos de contribuição */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Períodos de Contribuição</label>
              <button onClick={adicionarPeriodo} style={btnSecStyle}>
                <Plus size={13} /> Adicionar período
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {periodos.map((p, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr auto',
                  gap: '8px', alignItems: 'end',
                  background: 'var(--bg-main)', padding: '10px', borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Início</label>
                    <input type="date" value={p.inicio}
                      onChange={e => atualizarPeriodo(i, 'inicio', e.target.value)}
                      style={{ ...inputStyle, fontSize: '12px' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Fim (vazio = atual)</label>
                    <input type="date" value={p.fim}
                      onChange={e => atualizarPeriodo(i, 'fim', e.target.value)}
                      style={{ ...inputStyle, fontSize: '12px' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Tipo</label>
                    <select value={p.tipo}
                      onChange={e => atualizarPeriodo(i, 'tipo', e.target.value)}
                      style={{ ...inputStyle, fontSize: '12px' }}>
                      {Object.entries(TIPO_PERIODO_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => removerPeriodo(i)}
                    disabled={periodos.length === 1}
                    style={{
                      ...btnIconStyle,
                      opacity: periodos.length === 1 ? 0.3 : 1,
                    }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Salários */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Salários de Contribuição (separados por vírgula)</label>
            <input
              type="text" value={salariosInput}
              onChange={e => setSalariosInput(e.target.value)}
              placeholder="Ex: 3500, 4200, 5000, 6800"
              style={inputStyle}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Para estimativa de RMI. Deixe em branco para pular.
            </span>
          </div>

          {/* Observações */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Notas sobre o caso previdenciário..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Resultado */}
          {resultado && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                borderRadius: '10px', border: `1px solid ${elegivel ? '#16a34a40' : '#f59e0b40'}`,
                background: elegivel ? '#16a34a08' : '#f59e0b08',
                padding: '16px', marginBottom: '16px',
              }}>
                {/* Status principal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  {elegivel
                    ? <CheckCircle size={20} color="#16a34a" />
                    : <Clock size={20} color="#f59e0b" />
                  }
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {elegivel
                        ? `Pode se aposentar — ${resultado.regra_aplicavel}`
                        : 'Ainda não elegível para aposentadoria'
                      }
                    </div>
                    {!elegivel && resultado.previsao_aposentadoria && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Previsão pela regra mais próxima: {formatDateBR(resultado.previsao_aposentadoria)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <MetricaCard label="Tempo de Contribuição" value={mesesParaTexto(resultado.tempo_contribuicao_meses)} />
                  <MetricaCard label="Idade Atual" value={`${resultado.idade_atual_anos.toFixed(1)} anos`} />
                  <MetricaCard label="Pontos Atuais" value={`${resultado.pontos_atuais.toFixed(1)} / ${resultado.pontos_necessarios}`} />
                  {resultado.media_salarios > 0 && (
                    <>
                      <MetricaCard label="Média Salários" value={moeda(resultado.media_salarios)} />
                      <MetricaCard label="Coeficiente" value={`${(resultado.coeficiente_aposentadoria * 100).toFixed(0)}%`} />
                      <MetricaCard label="RMI Estimada" value={moeda(resultado.rmi_estimada)} destaque />
                    </>
                  )}
                </div>
              </div>

              {/* Regras detalhadas */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Análise por Regra
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultado.detalhes.map((d, i) => (
                    <div key={i} style={{
                      border: '1px solid var(--border)', borderRadius: '8px',
                      overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => setDetalheAberto(detalheAberto === i ? null : i)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', background: d.elegivel ? '#16a34a08' : 'transparent',
                          border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {d.elegivel
                            ? <CheckCircle size={14} color="#16a34a" />
                            : <AlertCircle size={14} color="var(--text-muted)" />
                          }
                          <span style={{ fontSize: '13px', fontWeight: d.elegivel ? '600' : '400' }}>{d.nome}</span>
                          {d.elegivel && <span style={{ fontSize: '11px', color: '#16a34a', background: '#16a34a20', padding: '1px 6px', borderRadius: '10px' }}>Elegível</span>}
                        </div>
                        {detalheAberto === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {detalheAberto === i && (
                        <div style={{ padding: '8px 12px 12px', background: 'var(--bg-main)', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <p style={{ marginBottom: '4px' }}>{d.descricao}</p>
                          {d.falta && <p style={{ color: '#f59e0b', marginBottom: '4px' }}>⚠ {d.falta}</p>}
                          {d.previsao && <p style={{ color: 'var(--text-muted)' }}>📅 Previsão: {formatDateBR(d.previsao)}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={calcular} style={btnSecStyle}>
              <RefreshCw size={13} /> Recalcular
            </button>
            <button onClick={salvar} disabled={!resultado || salvando} style={{
              ...btnPrimStyle,
              opacity: (!resultado || salvando) ? 0.6 : 1,
            }}>
              <Save size={13} />
              {salvando ? 'Salvando...' : 'Salvar cálculo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricaCard({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-main)', borderRadius: '8px', padding: '10px 12px',
      border: `1px solid ${destaque ? 'var(--accent)40' : 'var(--border)'}`,
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: '600', color: destaque ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

// ─── Estilos inline reutilizáveis ─────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '500',
  color: 'var(--text-muted)', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '7px',
  border: '1px solid var(--border)', background: 'var(--bg-main)',
  color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box',
}

const btnSecStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '7px 14px', borderRadius: '7px',
  background: 'var(--bg-main)', border: '1px solid var(--border)',
  color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
}

const btnPrimStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '7px 16px', borderRadius: '7px',
  background: 'var(--accent)', border: 'none',
  color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
}

const btnIconStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: '6px',
  background: 'var(--red-bg)', border: '1px solid var(--border)',
  color: 'var(--red)', cursor: 'pointer',
}
