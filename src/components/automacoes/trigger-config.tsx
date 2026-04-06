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
      const [trigRes, rulesRes, agentRes] = await Promise.all([
        fetch('/api/automacoes/triggers'),
        fetch('/api/followup/rules'),
        fetch('/api/agentes')
      ])

      if (!trigRes.ok) throw new Error('Falha ao carregar gatilhos')
      
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

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-default)', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Novo Gatilho
          </button>
          <button
            onClick={() => alert('Em breve: Função Seed')}
            style={{ padding: '8px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Play size={14} /> Templates PrevLegal
          </button>
        </div>
        {loading && <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--text-muted)' }} />}
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* LISTA DE GATILHOS */}
      {!loading && triggers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-default)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
          <GitMerge size={24} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>Nenhum gatilho configurado</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Mapeie eventos para engatilhar réguas automáticas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {triggers.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-default)', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Quando lead for para <span style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: '4px' }}>{t.trigger_condicao}</span>
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ação: {t.acao_tipo === 'iniciar_followup' ? 'Inicia Régua' : 'Troca Agente'}
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
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
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
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                     >
                        <option value="" disabled>Selecione a Régua...</option>
                        {followupRules.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                     </select>
                 ) : (
                     <select 
                        value={formData.acao_ref_id}
                        onChange={(e) => setFormData({...formData, acao_ref_id: e.target.value})}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
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
