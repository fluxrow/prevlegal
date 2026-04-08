import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

type SeedTemplate = {
  slot: string
  label: string
  trigger_evento: string
  trigger_condicao: string
  acao_tipo: 'iniciar_followup' | 'trocar_agente'
  acao_ref_id: string
  cancelar_followups_rodando: boolean
  enviar_mensagem_transicao: boolean
  mensagem_transicao_texto: string | null
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export async function POST() {
  try {
    const authSupabase = await createClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })

    const supabase = createAdminSupabase()

    const [rulesRes, agentsRes, triggersRes] = await Promise.all([
      supabase
        .from('followup_rules')
        .select('id, nome, descricao, ativo, is_default')
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: true }),
      supabase
        .from('agentes')
        .select('id, nome_interno, nome_publico, tipo, ativo, is_default')
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: true }),
      supabase
        .from('event_triggers')
        .select('id, trigger_evento, trigger_condicao')
        .eq('tenant_id', context.tenantId)
        .eq('trigger_evento', 'lead_status_mudou'),
    ])

    if (rulesRes.error) return NextResponse.json({ error: rulesRes.error.message }, { status: 500 })
    if (agentsRes.error) return NextResponse.json({ error: agentsRes.error.message }, { status: 500 })
    if (triggersRes.error) return NextResponse.json({ error: triggersRes.error.message }, { status: 500 })

    const activeRules = (rulesRes.data || []).filter((rule) => rule.ativo)
    const activeAgents = (agentsRes.data || []).filter((agent) => agent.ativo)
    const existingSlots = new Set(
      (triggersRes.data || []).map((trigger) => `${trigger.trigger_evento}:${trigger.trigger_condicao}`),
    )

    const defaultRule =
      activeRules.find((rule) => rule.is_default) ||
      activeRules.find((rule) =>
        includesAny(
          `${normalizeText(rule.nome)} ${normalizeText(rule.descricao)}`,
          ['comercial', 'contato', 'follow-up', 'followup', 'lead frio'],
        ),
      ) ||
      activeRules[0] ||
      null

    const reactivationRule =
      activeRules.find((rule) =>
        includesAny(
          `${normalizeText(rule.nome)} ${normalizeText(rule.descricao)}`,
          ['reativ', 'resgate', 'recupera', 'perdido', 'sem resposta'],
        ),
      ) || null

    const triagemAgent =
      activeAgents.find((agent) => agent.tipo === 'triagem') ||
      activeAgents.find((agent) => agent.is_default) ||
      null

    const confirmacaoAgent =
      activeAgents.find((agent) => agent.tipo === 'confirmacao_agenda') || null

    const reactivationAgent =
      activeAgents.find((agent) => agent.tipo === 'reativacao') || null

    const candidates: Array<SeedTemplate | { slot: string; label: string; unavailableReason: string }> = [
      triagemAgent
        ? {
            slot: 'new',
            label: 'Lead novo -> Agente de triagem',
            trigger_evento: 'lead_status_mudou',
            trigger_condicao: 'new',
            acao_tipo: 'trocar_agente',
            acao_ref_id: triagemAgent.id,
            cancelar_followups_rodando: true,
            enviar_mensagem_transicao: false,
            mensagem_transicao_texto: null,
          }
        : {
            slot: 'new',
            label: 'Lead novo -> Agente de triagem',
            unavailableReason: 'Nenhum agente ativo de triagem ou padrão foi encontrado.',
          },
      defaultRule
        ? {
            slot: 'contacted',
            label: 'Lead em contato -> Régua comercial',
            trigger_evento: 'lead_status_mudou',
            trigger_condicao: 'contacted',
            acao_tipo: 'iniciar_followup',
            acao_ref_id: defaultRule.id,
            cancelar_followups_rodando: true,
            enviar_mensagem_transicao: false,
            mensagem_transicao_texto: null,
          }
        : {
            slot: 'contacted',
            label: 'Lead em contato -> Régua comercial',
            unavailableReason: 'Nenhuma regra de follow-up ativa foi encontrada.',
          },
      confirmacaoAgent
        ? {
            slot: 'scheduled',
            label: 'Lead agendado -> Agente de confirmação',
            trigger_evento: 'lead_status_mudou',
            trigger_condicao: 'scheduled',
            acao_tipo: 'trocar_agente',
            acao_ref_id: confirmacaoAgent.id,
            cancelar_followups_rodando: true,
            enviar_mensagem_transicao: false,
            mensagem_transicao_texto: null,
          }
        : {
            slot: 'scheduled',
            label: 'Lead agendado -> Agente de confirmação',
            unavailableReason: 'Nenhum agente ativo do tipo confirmação de agenda foi encontrado.',
          },
      reactivationRule
        ? {
            slot: 'lost',
            label: 'Lead perdido -> Régua de reativação',
            trigger_evento: 'lead_status_mudou',
            trigger_condicao: 'lost',
            acao_tipo: 'iniciar_followup',
            acao_ref_id: reactivationRule.id,
            cancelar_followups_rodando: true,
            enviar_mensagem_transicao: false,
            mensagem_transicao_texto: null,
          }
        : reactivationAgent
          ? {
              slot: 'lost',
              label: 'Lead perdido -> Agente de reativação',
              trigger_evento: 'lead_status_mudou',
              trigger_condicao: 'lost',
              acao_tipo: 'trocar_agente',
              acao_ref_id: reactivationAgent.id,
              cancelar_followups_rodando: true,
              enviar_mensagem_transicao: false,
              mensagem_transicao_texto: null,
            }
          : {
              slot: 'lost',
              label: 'Lead perdido -> Reativação',
              unavailableReason: 'Nenhuma régua ou agente de reativação ativo foi encontrado.',
            },
    ]

    const toInsert: SeedTemplate[] = []
    const skipped: Array<{ slot: string; label: string; reason: string }> = []
    const unavailable: Array<{ slot: string; label: string; reason: string }> = []

    for (const candidate of candidates) {
      if ('unavailableReason' in candidate) {
        unavailable.push({
          slot: candidate.slot,
          label: candidate.label,
          reason: candidate.unavailableReason,
        })
        continue
      }

      const slotKey = `${candidate.trigger_evento}:${candidate.trigger_condicao}`
      if (existingSlots.has(slotKey)) {
        skipped.push({
          slot: candidate.slot,
          label: candidate.label,
          reason: 'Já existe um gatilho configurado para este status.',
        })
        continue
      }

      toInsert.push(candidate)
    }

    let inserted: Array<{ slot: string; label: string }> = []

    if (toInsert.length > 0) {
      const payload = toInsert.map((item) => ({
        tenant_id: context.tenantId,
        trigger_evento: item.trigger_evento,
        trigger_condicao: item.trigger_condicao,
        acao_tipo: item.acao_tipo,
        acao_ref_id: item.acao_ref_id,
        cancelar_followups_rodando: item.cancelar_followups_rodando,
        enviar_mensagem_transicao: item.enviar_mensagem_transicao,
        mensagem_transicao_texto: item.mensagem_transicao_texto,
        is_template_default: true,
        ativo: true,
      }))

      const { error: insertError } = await supabase.from('event_triggers').insert(payload)
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

      inserted = toInsert.map((item) => ({
        slot: item.slot,
        label: item.label,
      }))
    }

    return NextResponse.json({
      inserted,
      skipped,
      unavailable,
      inserted_count: inserted.length,
      skipped_count: skipped.length,
      unavailable_count: unavailable.length,
      message:
        inserted.length > 0
          ? 'Templates PrevLegal aplicados com sucesso.'
          : 'Nenhum template novo foi inserido.',
    })
  } catch (error: any) {
    console.error('Erro no seed de templates de automações:', error)
    return NextResponse.json({ error: 'Erro interno ao aplicar templates PrevLegal' }, { status: 500 })
  }
}
