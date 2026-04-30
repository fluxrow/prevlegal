import type { SupabaseClient } from '@supabase/supabase-js'

const OPEN_CAMPAIGN_MESSAGE_STATUSES = ['enviado', 'entregue', 'lido']

export async function markCampaignLeadAsResponded({
  supabase,
  campaignId,
  leadId,
}: {
  supabase: SupabaseClient
  campaignId: string | null | undefined
  leadId: string | null | undefined
}) {
  if (!campaignId || !leadId) {
    return { incremented: false }
  }

  const { data: pendingMessage, error: pendingMessageError } = await supabase
    .from('campanha_mensagens')
    .select('id')
    .eq('campanha_id', campaignId)
    .eq('lead_id', leadId)
    .in('status', OPEN_CAMPAIGN_MESSAGE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingMessageError) {
    throw new Error(pendingMessageError.message)
  }

  if (!pendingMessage?.id) {
    return { incremented: false }
  }

  const { error: updateError } = await supabase
    .from('campanha_mensagens')
    .update({
      status: 'respondido',
      respondido_at: new Date().toISOString(),
    })
    .eq('id', pendingMessage.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const { error: incrementError } = await supabase.rpc('increment_campanha_respondidos', {
    p_campanha_id: campaignId,
  })

  if (incrementError) {
    throw new Error(incrementError.message)
  }

  return { incremented: true }
}
