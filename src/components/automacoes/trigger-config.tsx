'use client'

import React, { useState, useEffect } from 'react'
import { GitMerge, Plus, AlertCircle, RefreshCw, Trash2, Settings, Play, X, ChevronDown, ChevronUp } from 'lucide-react'

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
  
  // Data for Selects
  const [followupRules, setFollowupRules] = useState<{id: string, nome: string}[]>([])
  const [agentes, setAgentes] = useState<{id: string, nome_interno: string}[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seedFeedback, setSeedFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    trigger_evento: 'lead_status_mudou',
    trigger_condicao: 'contacted',
    acao_tipo: 'iniciar_followup',
    acao_ref_id: '',
    cancelar_followups_rodando: true,
    enviar_mensagem_transicao: false,
    mensagem_transicao_texto: 'Oi! Passando por aqui para avisar que transferi o seu atendimento para o nosso time de especialistas. Eles já vão falar com você!',
  })

  // Loaders
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [trigRes, rulesRes, agentRes] = await Promise.all([
        fetch('/api/automacoes/triggers'),
        fetch('/api/followup/rules'),
        fetch('/api/agentes')
      ])

      if (!trigRes.ok) {
        const detalhe = await trigRes.json().catch(() => null)
        throw new Error(detalhe?.error || 'Falha ao carregar gatilhos')
      }
      
      const [tData, rData, aData] = await Promise.all([
        trigRes.json(),
        rulesRes.ok ? rulesRes.json() : [],
        agentRes.ok ? agentRes.json() : []
      ])

      setTriggers(tData)
      setFollowupRules(rData)
      setAgentes(aData)
      
      if (rData.length > 0 && formData.acao_tipo === 'iniciar_followup') {
          setFormData(prev => ({...prev, acao_ref_id: rData[0].id}))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const regrasAtivas = followupRules.length
  const agentesTriagem = agentes.filter((agente: any) => agente.tipo === 'triagem').length
  const agentesConfirmacao = agentes.filter((agente: any) => agente.tipo === 'confirmacao_agenda').length
  const agentesReativacao = agentes.filter((agente: any) => agente.tipo === 'reativacao').length
  const faltasSeed: string[] = []

  if (regrasAtivas === 0) faltasSeed.push('nenhuma régua ativa de follow-up')
  if (agentesTriagem === 0) faltasSeed.push('nenhum agente de triagem')
  if (agentesConfirmacao === 0) faltasSeed.push('nenhum agente de confirmação')
  if (agentesReativacao === 0) faltasSeed.push('nenhum agente de reativação')

  function getAcaoNome(trigger: EventTrigger) {
    if (trigger.acao_tipo === 'iniciar_followup') {
      const regra = followupRules.find((rule) => rule.id === trigger.acao_ref_id)
      return regra ? `Inicia Régua: ${regra.nome}` : 'Inicia Régua'
    }

    const agente = agentes.find((item) => item.id === trigger.acao_ref_id)
    return agente ? `Troca para IA: ${agente.nome_interno}` : 'Troca Agente'
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handlers
  const handleSave = async () => {
    if (!formData.acao_ref_id) {
        alert('Selecione a ação (Regra ou Agente)')
        return
    }

    try {
        setIsSaving(true)
        const res = await fetch('/api/automacoes/triggers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        if (!res.ok) throw new Error('Erro ao salvar')
        await fetchData()
        setIsModalOpen(false)
    } catch (err) {
        alert(String(err))
    } finally {
        setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm('Certeza que deseja deletar este gatilho?')) return
      try {
        const res = await fetch(`/api/automacoes/triggers/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Erro ao deletar')
        setTriggers(t => t.filter(x => x.id !== id))
      } catch (err) {
        alert(String(err))
      }
  }

  const toggleAtivo = async (t: EventTrigger) => {
    try {
        const res = await fetch(`/api/automacoes/triggers/${t.id}`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: !t.ativo })
        })
        if (!res.ok) throw new Error('Erro ao atualizar')
        setTriggers(tr => tr.map(x => x.id === t.id ? {...x, ativo: !t.ativo} : x))
    } catch (err) {
        alert(String(err))
    }
  }

  const handleSeedTemplates = async () => {
    try {
      setIsSeeding(true)
      setSeedFeedback(null)

      const res = await fetch('/api/automacoes/triggers/seed', { method: 'POST' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao aplicar templates')
      }

      await fetchData()

      const detalhes = [
        data?.inserted_count ? `${data.inserted_count} inserido(s)` : null,
        data?.skipped_count ? `${data.skipped_count} já existentes` : null,
        data?.unavailable_count ? `${data.unavailable_count} indisponível(is)` : null,
      ].filter(Boolean).join(' · ')

      setSeedFeedback({
        tone: 'success',
        text: detalhes ? `${data?.message || 'Templates aplicados.'} ${detalhes}` : (data?.message || 'Templates aplicados.'),
      })
    } catch (err: any) {
      setSeedFeedback({
        tone: 'error',
        text: err?.message || 'Erro ao aplicar templates PrevLegal',
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 8px 20px rgba(79,122,255,0.22)' }}
          >
            <Plus size={14} /> Novo Gatilho
          </button>
          <button
            onClick={handleSeedTemplates}
            disabled={isSeeding}
            style={{ padding: '8px 16px', background: 'var(--bg-hover)', color: isSeeding ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: isSeeding ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: isSeeding ? 0.75 : 1 }}
          >
            <Play size={14} /> {isSeeding ? 'Aplicando templates...' : 'Templates PrevLegal'}
          </button>
        </div>
        {loading && <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--text-muted)' }} />}
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {seedFeedback && (
        <div style={{ padding: '12px', background: seedFeedback.tone === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: seedFeedback.tone === 'success' ? '#22c55e' : '#ef4444', border: `1px solid ${seedFeedback.tone === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
          {seedFeedback.text}
        </div>
      )}

      {faltasSeed.length > 0 && (
        <div style={{ padding: '12px', background: 'rgba(245,200,66,0.1)', color: 'var(--yellow)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', lineHeight: 1.5 }}>
          Templates ainda não vão preencher tudo neste tenant.
          {' '}Faltam: {faltasSeed.join(', ')}.
        </div>
      )}

      {/* LISTA DE GATILHOS */}
      {!loading && triggers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
          <GitMerge size={24} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>Nenhum gatilho configurado</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Mapeie eventos para engatilhar réguas automáticas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {triggers.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Quando lead for para <span style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: '4px' }}>{t.trigger_condicao}</span>
                  </span>
                  {t.is_template_default && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(79,122,255,0.12)', color: 'var(--accent)', fontWeight: '700' }}>
                      Template
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ação: {getAcaoNome(t)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span onClick={() => toggleAtivo(t)} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: t.ativo ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)', color: t.ativo ? '#22c55e' : 'var(--text-muted)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  {t.ativo ? 'ON' : 'OFF'}
                </span>
                <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-surface)', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '24px', position: 'relative', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>Novo Gatilho</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Evento */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>QUANDO ACONTECER</label>
                <select 
                    value={formData.trigger_condicao}
                    onChange={(e) => setFormData({...formData, trigger_condicao: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                >
                    <option value="new">Lead Entrar / Novo</option>
                    <option value="contacted">Lead em Contato</option>
                    <option value="awaiting">Lead Virar Awaiting/Triagem</option>
                    <option value="scheduled">Lead Agendado</option>
                    <option value="converted">Lead Fechado Contrato</option>
                    <option value="lost">Lead Perdido</option>
                </select>
              </div>

              {/* Ação */}
              <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                 <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>ENTÃO FAÇA</label>
                 
                 <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                     <input type="radio" checked={formData.acao_tipo === 'iniciar_followup'} onChange={() => setFormData({...formData, acao_tipo: 'iniciar_followup', acao_ref_id: followupRules[0]?.id || ''})} />
                     Iniciar Régua (Follow-up)
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                     <input type="radio" checked={formData.acao_tipo === 'trocar_agente'} onChange={() => setFormData({...formData, acao_tipo: 'trocar_agente', acao_ref_id: agentes[0]?.id || ''})} />
                     Transferir IA (Agente)
                   </label>
                 </div>

                 {formData.acao_tipo === 'iniciar_followup' ? (
                     <select 
                        value={formData.acao_ref_id}
                        onChange={(e) => setFormData({...formData, acao_ref_id: e.target.value})}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                     >
                        <option value="" disabled>Selecione a Régua...</option>
                        {followupRules.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                     </select>
                 ) : (
                     <select 
                        value={formData.acao_ref_id}
                        onChange={(e) => setFormData({...formData, acao_ref_id: e.target.value})}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                     >
                        <option value="" disabled>Selecione o Agente de IA...</option>
                        {agentes.map(a => <option key={a.id} value={a.id}>{a.nome_interno}</option>)}
                     </select>
                 )}
              </div>

              {/* Accordion Avançado */}
              <div style={{ marginTop: '4px' }}>
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '8px 0' }}
                >
                  Configurações Avançadas de Autonomia
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showAdvanced && (
                  <div style={{ padding: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease-in-out' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.cancelar_followups_rodando}
                        onChange={(e) => setFormData({...formData, cancelar_followups_rodando: e.target.checked})}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Cancelar Concorrência</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>Cancela instantaneamente qualquer fluxo do robô que já estivesse rodando para o cliente para não embolar as mensagens.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.enviar_mensagem_transicao}
                        onChange={(e) => setFormData({...formData, enviar_mensagem_transicao: e.target.checked})}
                        style={{ marginTop: '2px' }}
                      />
                      <div style={{ width: '100%' }}>
                         <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Avisar Transição no WhatsApp</div>
                         <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: formData.enviar_mensagem_transicao ? '8px' : 0 }}>Gera um recado transparente do robô caso você transfira o lead de Especialista ou IA.</div>
                         
                         {formData.enviar_mensagem_transicao && (
                           <textarea 
                             value={formData.mensagem_transicao_texto || ''}
                             onChange={(e) => setFormData({...formData, mensagem_transicao_texto: e.target.value})}
                             style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '13px', minHeight: '60px', outline: 'none', resize: 'vertical' }}
                           />
                         )}
                      </div>
                    </label>
                  </div>
                )}
              </div>

               {/* Ações */}
               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   style={{ padding: '10px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
                 >
                   {isSaving ? 'Salvando...' : 'Salvar Gatilho'}
                 </button>
               </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
