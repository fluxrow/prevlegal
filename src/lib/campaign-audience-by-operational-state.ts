import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isOperationalConversationState,
  normalizeOperationalConversationState,
  type OperationalConversationState,
} from '@/lib/inbox-operational-state'

export async function resolveLeadIdsForOperationalConversationState(
  adminSupabase: Pick<SupabaseClient, 'from'>,
  tenantId: string,
  state: OperationalConversationState,
) {
  const { data: conversations, error: conversationsError } = await adminSupabase
    .from('conversas')
    .select('lead_id, status, estado_operacional, ultima_mensagem_at')
    .eq('tenant_id', tenantId)
    .not('lead_id', 'is', null)
    .order('ultima_mensagem_at', { ascending: false })

  if (conversationsError) {
    throw new Error(conversationsError.message)
  }

  const latestConversationStateByLead = new Map<string, OperationalConversationState>()

  for (const conversation of
    (conversations || []) as Array<{
      lead_id: string | null
      status: string | null
      estado_operacional: string | null
      ultima_mensagem_at: string | null
    }>) {
    if (!conversation.lead_id || latestConversationStateByLead.has(conversation.lead_id)) continue

    latestConversationStateByLead.set(
      conversation.lead_id,
      normalizeOperationalConversationState(conversation.estado_operacional, conversation.status),
    )
  }

  const matchingLeadIds = Array.from(latestConversationStateByLead.entries())
    .filter(([, operationalState]) => operationalState === state)
    .map(([leadId]) => leadId)

  if (matchingLeadIds.length === 0) {
    return []
  }

  const { data: eligibleLeads, error: eligibleLeadsError } = await adminSupabase
    .from('leads')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', matchingLeadIds)
    .eq('lgpd_optout', false)

  if (eligibleLeadsError) {
    throw new Error(eligibleLeadsError.message)
  }

  const eligibleLeadIds = new Set(
    ((eligibleLeads || []) as Array<{ id: string }>).map((lead) => lead.id),
  )
  return matchingLeadIds.filter((leadId) => eligibleLeadIds.has(leadId))
}

export function normalizeCampaignOperationalState(value: unknown) {
  const normalizedValue =
    typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null

  if (!normalizedValue || !isOperationalConversationState(normalizedValue)) {
    return null
  }

  return normalizedValue
}
