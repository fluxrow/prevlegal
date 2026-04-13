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
