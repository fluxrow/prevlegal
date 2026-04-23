import { createClient } from '@supabase/supabase-js'

type ModelPricing = {
  input: number
  output: number
  cacheCreation?: number
  cacheRead?: number
}

const MODEL_PRICING_USD_PER_MILLION: Record<string, ModelPricing> = {
  'claude-sonnet-4-20250514': {
    input: 3,
    output: 15,
    cacheCreation: 3.75,
    cacheRead: 0.3,
  },
  'claude-opus-4-20250514': {
    input: 15,
    output: 75,
  },
}

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000
}

export function calculateUsageCostUsd(params: {
  modelo: string
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}) {
  const pricing = MODEL_PRICING_USD_PER_MILLION[params.modelo]

  if (!pricing) {
    console.warn('[agent-llm-log] Modelo sem tabela de custo interna:', params.modelo)
    return 0
  }

  const inputCost = (params.inputTokens / 1_000_000) * pricing.input
  const outputCost = (params.outputTokens / 1_000_000) * pricing.output
  const cacheCreationCost =
    (params.cacheCreationInputTokens / 1_000_000) * (pricing.cacheCreation ?? 0)
  const cacheReadCost =
    (params.cacheReadInputTokens / 1_000_000) * (pricing.cacheRead ?? 0)

  return roundUsd(inputCost + outputCost + cacheCreationCost + cacheReadCost)
}

export async function logLlmUsage(params: {
  tenantId: string
  conversaId: string | null
  leadId: string | null
  agenteId: string | null
  perfilOperacao: string | null
  modelo: string
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
  latenciaMs: number
  sucesso: boolean
  erroDescricao?: string
}): Promise<void> {
  try {
    const cacheCreationInputTokens = params.cacheCreationInputTokens ?? 0
    const cacheReadInputTokens = params.cacheReadInputTokens ?? 0
    const custoUsd = calculateUsageCostUsd({
      modelo: params.modelo,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    })

    const supabase = createAdminSupabase()

    const { error } = await supabase.from('agent_llm_usage').insert({
      tenant_id: params.tenantId,
      conversa_id: params.conversaId,
      lead_id: params.leadId,
      agente_id: params.agenteId,
      perfil_operacao: params.perfilOperacao,
      modelo: params.modelo,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cache_creation_input_tokens: cacheCreationInputTokens,
      cache_read_input_tokens: cacheReadInputTokens,
      custo_usd: custoUsd,
      latencia_ms: params.latenciaMs,
      sucesso: params.sucesso,
      erro_descricao: params.erroDescricao || null,
    })

    if (error) {
      throw error
    }
  } catch (error) {
    console.warn('[agent-llm-log] Falha ao registrar uso LLM:', {
      tenantId: params.tenantId,
      conversaId: params.conversaId,
      leadId: params.leadId,
      agenteId: params.agenteId,
      modelo: params.modelo,
      sucesso: params.sucesso,
      error,
    })
  }
}
