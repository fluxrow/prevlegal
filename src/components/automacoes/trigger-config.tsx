'use client'

import React, { useState, useEffect } from 'react'
import { GitMerge, Plus, RefreshCw, Trash2, Play, X, ChevronDown, ChevronUp } from 'lucide-react'

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

type TriggerFormData = {
  trigger_evento: string
  trigger_condicao: string
  acao_tipo: string
  acao_ref_id: string
  cancelar_followups_rodando: boolean
  enviar_mensagem_transicao: boolean
  mensagem_transicao_texto: string | null
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Lead novo',
  contacted: 'Lead em contato',
  awaiting: 'Lead em triagem',
  scheduled: 'Lead agendado',
  converted: 'Lead convertido',
  lost: 'Lead perdido',
}

const STATUS_HELPERS: Record<string, string> = {
  new: 'Bom para acionar a primeira abordagem ou entregar o lead para a IA de triagem.',
  contacted: 'Bom para iniciar uma régua de follow-up comercial quando o lead entrou em contato.',
  awaiting: 'Bom para redistribuir ou revisar quem assume a próxima conversa.',
  scheduled: 'Bom para transferir o atendimento para confirmação de presença e preparação da consulta.',
  converted: 'Bom para encerrar automações comerciais e iniciar o pós-fechamento.',
  lost: 'Bom para reacender contatos frios ou iniciar uma cadência de reativação.',
}

export default function TriggerConfig() {
  const [triggers, setTriggers] = useState<EventTrigger[]>([])
  
  // Data for Selects
  const [followupRules, setFollowupRules] = useState<{id: string, nome: string, ativo?: boolean}[]>([])
  const [agentes, setAgentes] = useState<{id: string, nome_interno: string, tipo?: string, ativo?: boolean}[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seedFeedback, setSeedFeedback] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<EventTrigger | null>(null)
  const [modalError, setModalError] = useState('')

  // Form State
  const [formData, setFormData] = useState<TriggerFormData>({
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
      
      if (!editingTrigger && rData.length > 0 && formData.acao_tipo === 'iniciar_followup' && !formData.acao_ref_id) {
          setFormData(prev => ({...prev, acao_ref_id: rData[0].id}))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const regrasAtivas = followupRules.filter((regra) => regra.ativo !== false)
  const agentesAtivos = agentes.filter((agente) => agente.ativo !== false)
  const agentesTriagem = agentesAtivos.filter((agente) => agente.tipo === 'triagem').length
  const agentesConfirmacao = agentesAtivos.filter((agente) => agente.tipo === 'confirmacao_agenda').length
  const agentesReativacao = agentesAtivos.filter((agente) => agente.tipo === 'reativacao').length
  const faltasSeed: string[] = []

  if (regrasAtivas.length === 0) faltasSeed.push('nenhuma régua ativa de follow-up')
  if (agentesTriagem === 0) faltasSeed.push('nenhum agente de triagem')
  if (agentesConfirmacao === 0) faltasSeed.push('nenhum agente de confirmação')
  if (agentesReativacao === 0) faltasSeed.push('nenhum agente de reativação')

  const podeUsarFollowup = regrasAtivas.length > 0
  const podeUsarAgentes = agentesAtivos.length > 0

  function createDefaultFormData(acaoTipo: 'iniciar_followup' | 'trocar_agente' = 'iniciar_followup'): TriggerFormData {
    return {
      trigger_evento: 'lead_status_mudou',
      trigger_condicao: 'contacted',
      acao_tipo: acaoTipo,
      acao_ref_id: acaoTipo === 'trocar_agente' ? (agentesAtivos[0]?.id || '') : (regrasAtivas[0]?.id || ''),
      cancelar_followups_rodando: true,
      enviar_mensagem_transicao: false,
      mensagem_transicao_texto: 'Oi! Passando por aqui para avisar que transferi o seu atendimento para o nosso time de especialistas. Eles já vão falar com você!',
    }
  }

  function openCreateModal() {
    setEditingTrigger(null)
    setModalError('')
    setShowAdvanced(false)
    setFormData(createDefaultFormData())
    setIsModalOpen(true)
  }

  function openEditModal(trigger: EventTrigger) {
    setEditingTrigger(trigger)
    setModalError('')
    setShowAdvanced(
      trigger.cancelar_followups_rodando ||
      trigger.enviar_mensagem_transicao ||
      Boolean(trigger.mensagem_transicao_texto),
    )
    setFormData({
      trigger_evento: trigger.trigger_evento,
      trigger_condicao: trigger.trigger_condicao,
      acao_tipo: trigger.acao_tipo,
      acao_ref_id: trigger.acao_ref_id,
      cancelar_followups_rodando: trigger.cancelar_followups_rodando,
      enviar_mensagem_transicao: trigger.enviar_mensagem_transicao,
      mensagem_transicao_texto: trigger.mensagem_transicao_texto || 'Oi! Passando por aqui para avisar que transferi o seu atendimento para o nosso time de especialistas. Eles já vão falar com você!',
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingTrigger(null)
    setModalError('')
    setShowAdvanced(false)
  }

  function getStatusLabel(status: string) {
    return STATUS_LABELS[status] || status
  }

  function getStatusHelper(status: string) {
    return STATUS_HELPERS[status] || 'Ação disparada quando o lead entrar neste estágio.'
  }

  function getAcaoNome(trigger: EventTrigger) {
    if (trigger.acao_tipo === 'iniciar_followup') {
      const regra = followupRules.find((rule) => rule.id === trigger.acao_ref_id)
      return regra ? `Inicia Régua: ${regra.nome}` : 'Inicia Régua'
    }

    const agente = agentes.find((item) => item.id === trigger.acao_ref_id)
    return agente ? `Troca para IA: ${agente.nome_interno}` : 'Troca Agente'
  }

  function getActionHumanSummary(data: { acao_tipo: string; acao_ref_id: string }) {
    if (data.acao_tipo === 'iniciar_followup') {
      const regra = followupRules.find((rule) => rule.id === data.acao_ref_id)
      return regra
        ? `Inicia automaticamente a régua "${regra.nome}".`
        : 'Inicia uma régua de follow-up.'
    }

    const agente = agentes.find((item) => item.id === data.acao_ref_id)
    return agente
      ? `Transfere o atendimento para a IA "${agente.nome_interno}".`
      : 'Transfere o atendimento para outro agente.'
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handlers
  const handleSave = async () => {
    if (!formData.acao_ref_id) {
        setModalError('Selecione a ação que será executada por este gatilho.')
        return
    }

    try {
        setIsSaving(true)
        setModalError('')
        const res = await fetch(editingTrigger ? `/api/automacoes/triggers/${editingTrigger.id}` : '/api/automacoes/triggers', {
            method: editingTrigger ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Erro ao salvar')
        await fetchData()
        closeModal()
    } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Erro ao salvar gatilho')
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

      const unavailableDetails = Array.isArray(data?.unavailable) && data.unavailable.length > 0
        ? ` ${data.unavailable.map((item: { label: string; reason: string }) => `${item.label}: ${item.reason}`).join(' | ')}`
        : ''

      const feedbackTone =
        (data?.inserted_count ?? 0) > 0
          ? 'success'
          : (data?.unavailable_count ?? 0) > 0
            ? 'warning'
            : 'success'

      setSeedFeedback({
        tone: feedbackTone,
        text: `${detalhes ? `${data?.message || 'Templates aplicados.'} ${detalhes}` : (data?.message || 'Templates aplicados.')}${unavailableDetails}`,
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
            onClick={openCreateModal}
            style={{ padding: '10px 18px', minWidth: '160px', background: 'linear-gradient(135deg, #315efb 0%, #4d74ff 100%)', color: '#ffffff', WebkitTextFillColor: '#ffffff', border: '1px solid rgba(49,94,251,0.35)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 24px rgba(49,94,251,0.24)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1, whiteSpace: 'nowrap', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <Plus size={14} color="#ffffff" strokeWidth={2.25} />
            <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: 700, letterSpacing: '0.01em' }}>Novo Gatilho</span>
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
        <div style={{ padding: '12px', background: seedFeedback.tone === 'success' ? 'rgba(34,197,94,0.1)' : seedFeedback.tone === 'warning' ? 'rgba(245,200,66,0.12)' : 'rgba(239,68,68,0.1)', color: seedFeedback.tone === 'success' ? '#22c55e' : seedFeedback.tone === 'warning' ? 'var(--yellow)' : '#ef4444', border: `1px solid ${seedFeedback.tone === 'success' ? 'rgba(34,197,94,0.25)' : seedFeedback.tone === 'warning' ? 'rgba(245,200,66,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '8px', marginBottom: '16px', fontSize: '12px', lineHeight: 1.5 }}>
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
                    Quando lead for para <span style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: '4px' }}>{getStatusLabel(t.trigger_condicao)}</span>
                  </span>
                  {t.is_template_default && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(79,122,255,0.12)', color: 'var(--accent)', fontWeight: '700' }}>
                      Template
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Ação: {getAcaoNome(t)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {getActionHumanSummary(t)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45, marginTop: '6px' }}>
                  {getStatusHelper(t.trigger_condicao)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span onClick={() => toggleAtivo(t)} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: t.ativo ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)', color: t.ativo ? '#22c55e' : 'var(--text-muted)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  {t.ativo ? 'ON' : 'OFF'}
                </span>
                <button onClick={() => openEditModal(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', fontSize: '12px', fontWeight: '700' }}>
                  Editar
                </button>
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
            
            <button onClick={closeModal} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
              {editingTrigger ? 'Editar Gatilho' : 'Novo Gatilho'}
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {editingTrigger
                ? 'Ajuste quando este gatilho entra em ação e o que ele faz no lead.'
                : 'Defina em qual estágio o lead dispara a automação e qual ação deve começar automaticamente.'}
            </p>

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
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {getStatusHelper(formData.trigger_condicao)}
                </p>
              </div>

              {/* Ação */}
              <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                 <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>ENTÃO FAÇA</label>
                 
                 <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                     <input type="radio" checked={formData.acao_tipo === 'iniciar_followup'} disabled={!podeUsarFollowup} onChange={() => setFormData({...formData, acao_tipo: 'iniciar_followup', acao_ref_id: regrasAtivas[0]?.id || ''})} />
                     Iniciar Régua (Follow-up)
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                     <input type="radio" checked={formData.acao_tipo === 'trocar_agente'} disabled={!podeUsarAgentes} onChange={() => setFormData({...formData, acao_tipo: 'trocar_agente', acao_ref_id: agentesAtivos[0]?.id || ''})} />
                     Transferir IA (Agente)
                   </label>
                 </div>

                 {formData.acao_tipo === 'iniciar_followup' ? (
                     <select
                        disabled={!podeUsarFollowup}
                        value={formData.acao_ref_id}
                        onChange={(e) => setFormData({...formData, acao_ref_id: e.target.value})}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: podeUsarFollowup ? 'var(--bg)' : 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                     >
                        <option value="" disabled>{podeUsarFollowup ? 'Selecione a Régua...' : 'Nenhuma régua ativa disponível'}</option>
                        {regrasAtivas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                     </select>
                 ) : (
                     <select
                        disabled={!podeUsarAgentes}
                        value={formData.acao_ref_id}
                        onChange={(e) => setFormData({...formData, acao_ref_id: e.target.value})}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: podeUsarAgentes ? 'var(--bg)' : 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                    >
                        <option value="" disabled>{podeUsarAgentes ? 'Selecione o Agente de IA...' : 'Nenhum agente ativo disponível'}</option>
                        {agentesAtivos.map(a => <option key={a.id} value={a.id}>{a.nome_interno}</option>)}
                     </select>
                 )}

                 <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(79,122,255,0.06)', border: '1px solid rgba(79,122,255,0.14)' }}>
                   <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                     {getActionHumanSummary(formData)}
                   </p>
                 </div>

                 {!podeUsarFollowup && formData.acao_tipo === 'iniciar_followup' && (
                    <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      Você ainda não tem nenhuma régua ativa.
                      {' '}Ative ou crie uma em <a href="/automacoes" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>Sequências de Follow-up</a>.
                    </p>
                 )}

                 {!podeUsarAgentes && formData.acao_tipo === 'trocar_agente' && (
                    <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      Nenhum agente ativo foi encontrado neste tenant.
                      {' '}Cadastre agentes em <a href="/agente" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>Agente IA</a>.
                    </p>
                 )}

                 {podeUsarAgentes && agentesAtivos.length === 1 && formData.acao_tipo === 'trocar_agente' && (
                    <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      Só existe 1 agente ativo disponível neste tenant no momento.
                    </p>
                 )}

                 {faltasSeed.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.18)' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--yellow)', lineHeight: 1.45 }}>
                        Os templates completos ainda não vão funcionar neste tenant porque faltam: {faltasSeed.join(', ')}.
                      </p>
                    </div>
                 )}
              </div>

              {modalError && (
                <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '12px', lineHeight: 1.45 }}>
                  {modalError}
                </div>
              )}

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
                   onClick={closeModal}
                   style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving || !formData.acao_ref_id}
                   style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #315efb 0%, #4d74ff 100%)', color: '#ffffff', WebkitTextFillColor: '#ffffff', border: '1px solid rgba(49,94,251,0.35)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: isSaving || !formData.acao_ref_id ? 'not-allowed' : 'pointer', opacity: isSaving || !formData.acao_ref_id ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif', lineHeight: 1, appearance: 'none', WebkitAppearance: 'none' }}
                 >
                   {isSaving ? 'Salvando...' : editingTrigger ? 'Salvar Alterações' : 'Salvar Gatilho'}
                 </button>
               </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
