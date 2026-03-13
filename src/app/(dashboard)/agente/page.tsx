'use client'
import { useEffect, useState } from 'react'
import { Bot, Save, Plus, Trash2, Eye, CheckCircle, BookOpen, Settings } from 'lucide-react'

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
  agente_tom: string
  agente_foco: string
  agente_frases_proibidas: string
  agente_objeccoes: string
  agente_fluxo_qualificacao: string
  agente_exemplos_dialogo: string
  agente_gatilhos_escalada: string
  agente_fallback: string
}

interface Documento {
  id: string
  nome: string
  descricao: string
  conteudo: string
  tipo: string
  ativo: boolean
  created_at: string
}

const TOM_OPTIONS = [
  { value: 'profissional', label: 'Profissional e formal' },
  { value: 'amigavel', label: 'Amigável e acessível' },
  { value: 'direto', label: 'Direto e objetivo' },
  { value: 'empatico', label: 'Empático e acolhedor' },
]

const FOCO_OPTIONS = [
  { value: 'agendamento', label: 'Agendar consulta gratuita' },
  { value: 'qualificacao', label: 'Qualificar o lead' },
  { value: 'informacao', label: 'Informar sobre o benefício' },
]

const TIPO_DOC_OPTIONS = [
  { value: 'instrucao', label: '📋 Instrução geral' },
  { value: 'script', label: '💬 Script de abordagem' },
  { value: 'objecoes', label: '🛡️ Objeções e respostas' },
  { value: 'legislacao', label: '⚖️ Legislação / referência' },
  { value: 'faq', label: '❓ FAQ' },
]

function gerarPromptFinal(config: Config, docs: Documento[]): string {
  const partes: string[] = []

  if (config.agente_prompt_sistema) partes.push(config.agente_prompt_sistema)
  if (config.agente_fluxo_qualificacao) partes.push(`\n--- FLUXO DE QUALIFICAÇÃO ---\nSiga estas etapas em ordem:\n${config.agente_fluxo_qualificacao}`)
  if (config.agente_exemplos_dialogo) partes.push(`\n--- EXEMPLOS DE DIÁLOGO ---\n${config.agente_exemplos_dialogo}`)
  if (config.agente_gatilhos_escalada) partes.push(`\n--- GATILHOS DE ESCALADA ---\nQuando o lead escrever algo como abaixo, encerre a conversa com uma mensagem de que a advogada entrará em contato em breve:\n${config.agente_gatilhos_escalada}`)
  if (config.agente_frases_proibidas) partes.push(`\n--- FRASES ABSOLUTAMENTE PROIBIDAS ---\nJamais use:\n${config.agente_frases_proibidas}`)
  if (config.agente_objeccoes) partes.push(`\n--- COMO LIDAR COM OBJEÇÕES ---\n${config.agente_objeccoes}`)
  if (config.agente_fallback) partes.push(`\n--- RESPOSTA DE FALLBACK ---\nQuando não entender a mensagem, responda: "${config.agente_fallback}"`)

  const docsAtivos = docs.filter(d => d.ativo)
  if (docsAtivos.length > 0) {
    partes.push(`\n--- BASE DE CONHECIMENTO ---\n` + docsAtivos.map(d =>
      `[${d.tipo.toUpperCase()}] ${d.nome}:\n${d.conteudo}`
    ).join('\n\n'))
  }

  return partes.join('\n') || '(prompt vazio — configure as seções acima)'
}

export default function AgentePage() {
  const [activeTab, setActiveTab] = useState<'identidade' | 'instrucoes' | 'conhecimento' | 'preview'>('identidade')
  const [config, setConfig] = useState<Config>({
    agente_ativo: false,
    agente_nome: 'Ana',
    agente_prompt_sistema: '',
    agente_modelo: 'claude-sonnet-4-20250514',
    agente_max_tokens: 500,
    agente_resposta_automatica: true,
    agente_horario_inicio: '08:00',
    agente_horario_fim: '20:00',
    agente_apenas_dias_uteis: true,
    agente_tom: 'profissional',
    agente_foco: 'agendamento',
    agente_frases_proibidas: '',
    agente_objeccoes: '',
    agente_fluxo_qualificacao: '',
    agente_exemplos_dialogo: '',
    agente_gatilhos_escalada: '',
    agente_fallback: '',
  })
  const [docs, setDocs] = useState<Documento[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [docForm, setDocForm] = useState({ nome: '', descricao: '', conteudo: '', tipo: 'instrucao' })
  const [savingDoc, setSavingDoc] = useState(false)

  useEffect(() => {
    fetchConfig()
    fetchDocs()
  }, [])

  async function fetchConfig() {
    const res = await fetch('/api/configuracoes')
    if (res.ok) {
      const data = await res.json()
      if (data) setConfig(prev => ({ ...prev, ...data }))
    }
  }

  async function fetchDocs() {
    const res = await fetch('/api/agente/documentos')
    if (res.ok) setDocs(await res.json())
  }

  async function salvarConfig() {
    setSaving(true)
    await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function adicionarDoc() {
    if (!docForm.nome || !docForm.conteudo) return
    setSavingDoc(true)
    const res = await fetch('/api/agente/documentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docForm)
    })
    if (res.ok) {
      await fetchDocs()
      setDocForm({ nome: '', descricao: '', conteudo: '', tipo: 'instrucao' })
      setShowDocForm(false)
    }
    setSavingDoc(false)
  }

  async function deletarDoc(id: string) {
    await fetch(`/api/agente/documentos?id=${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function toggleDoc(id: string, ativo: boolean) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ativo } : d))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '14px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', color: 'var(--text-secondary)',
    marginBottom: '6px', fontFamily: 'DM Sans, sans-serif'
  }
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '24px', marginBottom: '16px'
  }

  const TABS = [
    { id: 'identidade', label: 'Identidade', icon: <Bot size={14} /> },
    { id: 'instrucoes', label: 'Instruções', icon: <Settings size={14} /> },
    { id: 'conhecimento', label: 'Base de Conhecimento', icon: <BookOpen size={14} /> },
    { id: 'preview', label: 'Preview do Prompt', icon: <Eye size={14} /> },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={22} color="var(--accent)" /> Agente IA
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Configure o treinamento e comportamento do agente</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>Agente ativo</span>
            <div onClick={() => setConfig(p => ({ ...p, agente_ativo: !p.agente_ativo }))}
              style={{ width: '40px', height: '22px', borderRadius: '11px', background: config.agente_ativo ? '#22c55e' : 'var(--bg-hover)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '3px', left: config.agente_ativo ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </label>
          <button onClick={salvarConfig} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: saved ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
            {saved ? <><CheckCircle size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-card)', borderRadius: '10px', padding: '4px', width: 'fit-content', border: '1px solid var(--border)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', background: activeTab === tab.id ? 'var(--accent)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Identidade */}
      {activeTab === 'identidade' && (
        <div>
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Identidade do Agente</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Nome do agente</label>
                <input style={inputStyle} value={config.agente_nome} onChange={e => setConfig(p => ({ ...p, agente_nome: e.target.value }))} placeholder="Ex: Ana" />
              </div>
              <div>
                <label style={labelStyle}>Tom de voz</label>
                <select style={inputStyle} value={config.agente_tom} onChange={e => setConfig(p => ({ ...p, agente_tom: e.target.value }))}>
                  {TOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Objetivo principal</label>
              <select style={inputStyle} value={config.agente_foco} onChange={e => setConfig(p => ({ ...p, agente_foco: e.target.value }))}>
                {FOCO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Horário de Atendimento</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Início</label>
                <input type="time" style={inputStyle} value={config.agente_horario_inicio} onChange={e => setConfig(p => ({ ...p, agente_horario_inicio: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Fim</label>
                <input type="time" style={inputStyle} value={config.agente_horario_fim} onChange={e => setConfig(p => ({ ...p, agente_horario_fim: e.target.value }))} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={config.agente_apenas_dias_uteis} onChange={e => setConfig(p => ({ ...p, agente_apenas_dias_uteis: e.target.checked }))} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>Apenas dias úteis (Seg–Sex)</span>
            </label>
          </div>
        </div>
      )}

      {/* TAB: Instruções */}
      {activeTab === 'instrucoes' && (
        <div>
          {/* Botão template */}
          <div style={{ marginBottom: '20px', padding: '16px', background: '#4f7aff15', border: '1px solid #4f7aff40', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 2px' }}>✨ Template PrevLegal</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Preenche automaticamente com um prompt otimizado para advocacia previdenciária</p>
            </div>
            <button onClick={() => setConfig(p => ({
              ...p,
              agente_prompt_sistema: `Você é ${p.agente_nome || 'Ana'}, assistente virtual do escritório de advocacia previdenciária. Seu objetivo é qualificar leads e agendar consultas gratuitas para revisão de benefício do INSS.\n\nCONTEXTO DO LEAD:\nNome: {nome} | Benefício: {nb} | Banco: {banco} | Valor atual: R$ {valor} | Ganho potencial: R$ {ganho}\n\nREGRAS ABSOLUTAS:\n- Nunca prometa valores, percentuais ou resultados garantidos\n- Nunca mencione honorários ou custos\n- Respostas curtas (máximo 3 linhas no WhatsApp)\n- Nunca use markdown, listas, asteriscos ou emojis em excesso\n- Use linguagem simples e acessível para idosos`,
              agente_fluxo_qualificacao: `1. APRESENTAÇÃO: Se apresente pelo nome e explique brevemente o motivo do contato (possível revisão do benefício)\n2. VERIFICAÇÃO DE INTERESSE: Pergunte se a pessoa tem interesse em saber mais sobre a revisão\n3. SE INTERESSADO: Explique que é uma consulta gratuita e sem compromisso\n4. COLETA DE DISPONIBILIDADE: Pergunte qual o melhor dia e horário para uma consulta rápida\n5. CONFIRMAÇÃO: Confirme os dados e informe que a advogada entrará em contato`,
              agente_exemplos_dialogo: `✅ BOM EXEMPLO:\nLead: "Quanto eu vou receber?"\nAgente: "Olá {nome}! Cada caso é diferente, mas com base no seu benefício, pode haver uma diferença significativa. Para saber o valor exato, precisamos de uma análise. Posso agendar uma consulta gratuita?"\n\n✅ BOM EXEMPLO:\nLead: "Não tenho interesse"\nAgente: "Tudo bem, {nome}! Obrigada pelo seu tempo. Se mudar de ideia, pode nos contatar a qualquer momento. Tenha um ótimo dia!"\n\n❌ MAU EXEMPLO:\nAgente: "Você vai receber R$ 500 de aumento!" (nunca prometa valores)\n\n❌ MAU EXEMPLO:\nAgente: "Você precisa pagar R$ 100 para a consulta" (nunca mencione custos)`,
              agente_gatilhos_escalada: `- "quero falar com a advogada"\n- "quero falar com um humano"\n- "me liga"\n- "quero agendar agora"\n- "sim, tenho interesse"\n- "pode marcar"\n- qualquer mensagem com raiva ou reclamação grave`,
              agente_fallback: `Desculpe, não consegui entender sua mensagem. Posso te ajudar a agendar uma consulta gratuita para revisar seu benefício do INSS. Você tem interesse?`,
            }))}
              style={{ padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Usar Template
            </button>
          </div>

          {/* Prompt base */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>Prompt Base</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              Instruções principais. Variáveis disponíveis: <code style={{ background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{'{nome}'}</code> <code style={{ background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{'{nb}'}</code> <code style={{ background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{'{banco}'}</code> <code style={{ background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{'{valor}'}</code> <code style={{ background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{'{ganho}'}</code>
            </p>
            <textarea style={{ ...inputStyle, minHeight: '180px', resize: 'vertical' }}
              value={config.agente_prompt_sistema}
              onChange={e => setConfig(p => ({ ...p, agente_prompt_sistema: e.target.value }))}
              placeholder="Você é Ana, assistente do escritório..." />
          </div>

          {/* Fluxo de qualificação */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>🎯 Fluxo de Qualificação</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              Defina as etapas em ordem que o agente deve seguir para qualificar e converter o lead. Seja específico: etapa 1, etapa 2...
            </p>
            <textarea style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }}
              value={config.agente_fluxo_qualificacao}
              onChange={e => setConfig(p => ({ ...p, agente_fluxo_qualificacao: e.target.value }))}
              placeholder={'1. Apresentação e motivo do contato\n2. Verificar interesse\n3. Explicar consulta gratuita\n4. Coletar disponibilidade\n5. Confirmar agendamento'} />
          </div>

          {/* Exemplos de diálogo */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>💬 Exemplos de Diálogo</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              Cole exemplos reais de boas e más respostas. Isso é o que mais melhora a qualidade do agente — mostre o que fazer e o que NÃO fazer.
            </p>
            <textarea style={{ ...inputStyle, minHeight: '180px', resize: 'vertical' }}
              value={config.agente_exemplos_dialogo}
              onChange={e => setConfig(p => ({ ...p, agente_exemplos_dialogo: e.target.value }))}
              placeholder={'✅ BOM: Lead pergunta valor → Agente explica que depende da análise e propõe consulta\n❌ RUIM: Agente promete valor específico antes de analisar o caso'} />
          </div>

          {/* Gatilhos de escalada */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>⚡ Gatilhos de Escalada para Humano</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              Uma frase ou situação por linha. Quando o lead escrever algo assim, o agente para e notifica a advogada para assumir.
            </p>
            <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              value={config.agente_gatilhos_escalada}
              onChange={e => setConfig(p => ({ ...p, agente_gatilhos_escalada: e.target.value }))}
              placeholder={'quero falar com a advogada\nquero agendar agora\nsim, tenho interesse\nme liga'} />
          </div>

          {/* Frases proibidas */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>🚫 Frases Proibidas</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>Uma por linha. O agente nunca usará essas frases — importante para compliance com a OAB.</p>
            <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              value={config.agente_frases_proibidas}
              onChange={e => setConfig(p => ({ ...p, agente_frases_proibidas: e.target.value }))}
              placeholder={'Garantimos o resultado\nVocê vai receber X reais\nIsso é certeza absoluta'} />
          </div>

          {/* Fallback */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>🔄 Resposta de Fallback</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              O que o agente responde quando não entende a mensagem ou ela está fora do escopo.
            </p>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={config.agente_fallback}
              onChange={e => setConfig(p => ({ ...p, agente_fallback: e.target.value }))}
              placeholder="Desculpe, não entendi. Posso ajudar com informações sobre revisão do seu benefício do INSS. Tem interesse em saber mais?" />
          </div>

          {/* Objeções */}
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>🛡️ Como Lidar com Objeções</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>Instrua o agente sobre como responder às objeções mais comuns dos leads.</p>
            <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              value={config.agente_objeccoes}
              onChange={e => setConfig(p => ({ ...p, agente_objeccoes: e.target.value }))}
              placeholder={"'Não tenho interesse' → Agradeça e encerre educadamente\n'Já tentei antes' → Explique que cada caso é analisado individualmente\n'É golpe?' → Confirme a seriedade do escritório e ofereça mais informações"} />
          </div>
        </div>
      )}

      {/* TAB: Base de Conhecimento */}
      {activeTab === 'conhecimento' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
              {docs.filter(d => d.ativo).length} documento(s) ativo(s) — injetados no contexto do agente
            </p>
            <button onClick={() => setShowDocForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
              <Plus size={14} /> Adicionar Documento
            </button>
          </div>

          {showDocForm && (
            <div style={{ ...cardStyle, border: '1px solid var(--accent)' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px' }}>Novo Documento</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input style={inputStyle} value={docForm.nome} onChange={e => setDocForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Script de abordagem inicial" />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select style={inputStyle} value={docForm.tipo} onChange={e => setDocForm(p => ({ ...p, tipo: e.target.value }))}>
                    {TIPO_DOC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Descrição (opcional)</label>
                <input style={inputStyle} value={docForm.descricao} onChange={e => setDocForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Breve descrição do conteúdo" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Conteúdo</label>
                <textarea style={{ ...inputStyle, minHeight: '160px', resize: 'vertical' }}
                  value={docForm.conteudo} onChange={e => setDocForm(p => ({ ...p, conteudo: e.target.value }))}
                  placeholder="Cole aqui o conteúdo do documento..." />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={adicionarDoc} disabled={savingDoc}
                  style={{ padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  {savingDoc ? 'Salvando...' : 'Salvar Documento'}
                </button>
                <button onClick={() => setShowDocForm(false)}
                  style={{ padding: '9px 18px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {docs.length === 0 && !showDocForm && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px' }}>
              <BookOpen size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', margin: '0 0 4px' }}>Nenhum documento ainda</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Adicione scripts, manuais, FAQ ou legislação para treinar o agente</p>
            </div>
          )}

          {docs.map(doc => (
            <div key={doc.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{doc.nome}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(79,122,255,0.12)', color: 'var(--accent)' }}>
                    {TIPO_DOC_OPTIONS.find(t => t.value === doc.tipo)?.label || doc.tipo}
                  </span>
                </div>
                {doc.descricao && <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 8px' }}>{doc.descricao}</p>}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                  {doc.conteudo.substring(0, 120)}{doc.conteudo.length > 120 ? '...' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                <div onClick={() => toggleDoc(doc.id, !doc.ativo)}
                  style={{ width: '36px', height: '20px', borderRadius: '10px', background: doc.ativo ? '#22c55e' : 'var(--bg-hover)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '2px', left: doc.ativo ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                </div>
                <button onClick={() => deletarDoc(doc.id)}
                  style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Preview */}
      {activeTab === 'preview' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '4px' }}>System Prompt Final</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Exatamente o que será enviado ao Claude como contexto</p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {gerarPromptFinal(config, docs).length} caracteres
            </span>
          </div>
          <pre style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '500px', overflowY: 'auto', margin: 0 }}>
            {gerarPromptFinal(config, docs) || '(prompt vazio — configure as abas Identidade e Instruções)'}
          </pre>
        </div>
      )}
    </div>
  )
}
