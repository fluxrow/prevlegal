'use client'
import { useEffect, useState } from 'react'
import { Bot, Save, MessageSquare, Sparkles, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const PROMPT_PADRAO = `Você é Ana, assistente virtual de um escritório de advocacia previdenciária especializado em revisão de benefícios do INSS.

Seu objetivo é qualificar leads e agendar consultas gratuitas.

CONTEXTO DO LEAD:
Nome: {nome}
Benefício (NB): {nb}
Banco pagador: {banco}
Valor atual: R$ {valor}
Ganho potencial com revisão: R$ {ganho}

INSTRUÇÕES:
- Seja cordial, direta e profissional
- Use linguagem simples, acessível para idosos
- Nunca prometa valores ou resultados garantidos
- Foque em agendar uma consulta gratuita
- Se o lead demonstrar interesse, peça disponibilidade de horário
- Se recusar, agradeça e encerre educadamente
- Respostas curtas (máximo 3 linhas no WhatsApp)
- Nunca use markdown, listas ou asteriscos`

interface Config {
  agente_ativo: boolean
  agente_nome: string
  agente_prompt_sistema: string
  agente_modelo: string
  agente_max_tokens: number
  agente_resposta_automatica: boolean
  agente_horario_inicio: string
  agente_horario_fim: string
  agente_apenas_dias_uteis: boolean
}

interface MensagemInbound {
  id: string
  mensagem: string
  telefone_remetente: string
  leads: { nome: string; nb: string } | null
  respondido_por_agente: boolean
  resposta_agente: string | null
  created_at: string
}

export default function AgentePage() {
  const [config, setConfig] = useState<Config>({
    agente_ativo: false,
    agente_nome: 'Ana',
    agente_prompt_sistema: PROMPT_PADRAO,
    agente_modelo: 'claude-sonnet-4-20250514',
    agente_max_tokens: 500,
    agente_resposta_automatica: false,
    agente_horario_inicio: '08:00',
    agente_horario_fim: '18:00',
    agente_apenas_dias_uteis: true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mensagens, setMensagens] = useState<MensagemInbound[]>([])
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    fetchConfig()
    fetchMensagens()
  }, [])

  async function fetchConfig() {
    setLoadingConfig(true)
    const res = await fetch('/api/agente/config')
    if (res.ok) {
      const data = await res.json()
      if (data && !data.error) {
        setConfig(prev => ({
          ...prev,
          ...data,
          agente_prompt_sistema: data.agente_prompt_sistema || PROMPT_PADRAO,
        }))
      }
    }
    setLoadingConfig(false)
  }

  async function fetchMensagens() {
    const res = await fetch('/api/mensagens-inbound')
    if (res.ok) {
      const data = await res.json()
      setMensagens(data.mensagens || [])
    }
  }

  async function salvar() {
    setSaving(true)
    const res = await fetch('/api/agente/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  async function responderComIA(mensagemId: string) {
    setRespondendo(mensagemId)
    try {
      const res = await fetch('/api/agente/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem_id: mensagemId }),
      })
      const data = await res.json()
      if (data.success) {
        setRespostas(prev => ({ ...prev, [mensagemId]: data.resposta }))
        await fetchMensagens()
      } else {
        setRespostas(prev => ({ ...prev, [mensagemId]: '❌ ' + data.error }))
      }
    } catch {
      setRespostas(prev => ({ ...prev, [mensagemId]: '❌ Erro ao conectar' }))
    }
    setRespondendo(null)
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-hover)',
    color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '12px', color: 'var(--text-secondary)', display: 'block' as const, marginBottom: '6px' }

  if (loadingConfig) return <div style={{ padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>Carregando...</div>

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Agente IA</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Configure e monitore o assistente virtual que responde leads no WhatsApp
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '99px',
            color: config.agente_ativo ? '#22c55e' : '#94a3b8',
            background: config.agente_ativo ? '#22c55e20' : '#94a3b820',
          }}>
            {config.agente_ativo ? '● Ativo' : '○ Inativo'}
          </span>
        </div>
      </div>

      {/* Configurações */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={16} /> Configurações do Agente
        </h2>

        {/* Toggles principais */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: '10px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Agente ativo</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Processa mensagens recebidas</div>
            </div>
            <input type="checkbox" checked={config.agente_ativo}
              onChange={e => setConfig(p => ({ ...p, agente_ativo: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: config.agente_resposta_automatica ? '#f59e0b10' : 'var(--bg-hover)', border: config.agente_resposta_automatica ? '1px solid #f59e0b30' : '1px solid transparent', borderRadius: '10px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Resposta automática {config.agente_resposta_automatica && <AlertTriangle size={12} color="#f59e0b" />}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Envia sem aprovação humana</div>
            </div>
            <input type="checkbox" checked={config.agente_resposta_automatica}
              onChange={e => setConfig(p => ({ ...p, agente_resposta_automatica: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          </div>
        </div>

        {config.agente_resposta_automatica && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: '#f59e0b10', border: '1px solid #f59e0b30', fontSize: '12px', color: '#f59e0b' }}>
            ⚠️ Quando ativo, o agente responde leads automaticamente sem aprovação humana. Use com cautela.
          </div>
        )}

        {/* Nome e modelo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Nome do agente</label>
            <input value={config.agente_nome} onChange={e => setConfig(p => ({ ...p, agente_nome: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Modelo</label>
            <select value={config.agente_modelo} onChange={e => setConfig(p => ({ ...p, agente_modelo: e.target.value }))} style={inputStyle}>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            </select>
          </div>
        </div>

        {/* Max tokens */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Máximo de tokens na resposta: <strong style={{ color: 'var(--text-primary)' }}>{config.agente_max_tokens}</strong></label>
          <input type="range" min={100} max={1000} step={50} value={config.agente_max_tokens}
            onChange={e => setConfig(p => ({ ...p, agente_max_tokens: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>100</span><span>1000</span>
          </div>
        </div>

        {/* Horário */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Horário início</label>
            <input type="time" value={config.agente_horario_inicio} onChange={e => setConfig(p => ({ ...p, agente_horario_inicio: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Horário fim</label>
            <input type="time" value={config.agente_horario_fim} onChange={e => setConfig(p => ({ ...p, agente_horario_fim: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
            <input type="checkbox" id="dias_uteis" checked={config.agente_apenas_dias_uteis}
              onChange={e => setConfig(p => ({ ...p, agente_apenas_dias_uteis: e.target.checked }))} />
            <label htmlFor="dias_uteis" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Apenas dias úteis</label>
          </div>
        </div>

        {/* Prompt */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Prompt do sistema — use {'{nome}'}, {'{nb}'}, {'{banco}'}, {'{valor}'}, {'{ganho}'}</label>
          <textarea value={config.agente_prompt_sistema} onChange={e => setConfig(p => ({ ...p, agente_prompt_sistema: e.target.value }))}
            rows={10} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }} />
        </div>

        <button onClick={salvar} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px',
          borderRadius: '8px', background: saved ? '#22c55e' : 'var(--accent)', color: '#fff',
          border: 'none', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, transition: 'background 0.2s',
        }}>
          {saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>

      {/* Caixa de entrada */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} /> Caixa de Entrada
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>Mensagens recebidas dos leads</span>
        </h2>

        {mensagens.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <MessageSquare size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p>Nenhuma mensagem recebida ainda</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mensagens.map(msg => {
            const isRespondendo = respondendo === msg.id
            const respostaGerada = respostas[msg.id]
            return (
              <div key={msg.id} style={{
                border: '1px solid var(--border)', borderRadius: '10px', padding: '16px',
                background: msg.respondido_por_agente ? '#22c55e05' : 'var(--bg-hover)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {msg.leads?.nome || msg.telefone_remetente.replace('whatsapp:', '')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={10} /> {new Date(msg.created_at).toLocaleString('pt-BR')}
                      {msg.respondido_por_agente && (
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle size={10} /> IA respondeu
                        </span>
                      )}
                    </div>
                  </div>
                  {!msg.respondido_por_agente && (
                    <button onClick={() => responderComIA(msg.id)} disabled={isRespondendo} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                      borderRadius: '8px', background: isRespondendo ? 'var(--bg-hover)' : 'var(--accent-glow)',
                      color: isRespondendo ? 'var(--text-muted)' : 'var(--accent)',
                      border: '1px solid var(--border)', fontSize: '12px', fontWeight: '500',
                      cursor: isRespondendo ? 'not-allowed' : 'pointer',
                    }}>
                      <Sparkles size={12} />
                      {isRespondendo ? 'Gerando...' : 'Responder com IA'}
                    </button>
                  )}
                </div>

                {/* Mensagem do lead */}
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: (respostaGerada || msg.resposta_agente) ? '10px' : 0 }}>
                  💬 {msg.mensagem}
                </div>

                {/* Resposta gerada */}
                {(respostaGerada || msg.resposta_agente) && (
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#4f7aff10', border: '1px solid #4f7aff20', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '4px', fontWeight: '500' }}>🤖 Resposta da Ana:</div>
                    {respostaGerada || msg.resposta_agente}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
