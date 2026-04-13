import { createClient } from '@/lib/supabase/server'
import type { TenantContext } from '@/lib/tenant-context'

type ConversaComResponsavel = {
  assumido_por?: string | null
  leads?: {
    responsavel_id?: string | null
  } | Array<{
    responsavel_id?: string | null
  }> | null
}

export function canViewConversationForInbox(
  context: TenantContext,
  conversa: ConversaComResponsavel | null | undefined,
) {
  if (!conversa) return false

  const leadRelation = Array.isArray(conversa.leads) ? (conversa.leads[0] || null) : (conversa.leads || null)
  const responsavelId = leadRelation?.responsavel_id || null
  const assumidoPor = conversa.assumido_por || null

  return responsavelId === context.usuarioId || assumidoPor === context.usuarioId
}

export async function getPersonalInboxLeadIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TenantContext,
) {
  if (!context.tenantId) return []

  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', context.tenantId)
    .eq('responsavel_id', context.usuarioId)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((lead) => lead.id)
}

export async function getVisibleConversationIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TenantContext,
) {
  if (!context.tenantId) return []

  const { data, error } = await supabase
    .from('conversas')
    .select('id, assumido_por, leads(responsavel_id)')
    .eq('tenant_id', context.tenantId)

  if (error) {
    throw new Error(error.message)
  }

  return (data || [])
    .filter((conversa) => canViewConversationForInbox(context, conversa))
    .map((conversa) => conversa.id)
}

export async function canAccessPersonalInboxLeadId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  context: TenantContext,
  leadId: string,
) {
  if (!context.tenantId) return false

  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('tenant_id', context.tenantId)
    .eq('responsavel_id', context.usuarioId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}
