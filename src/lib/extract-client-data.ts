import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import {
  calculateUsageCostUsd,
  logLlmUsage,
} from '@/lib/agent-llm-logger'
import {
  EMPTY_EXTRACTED_CLIENT_DATA,
  type ExtractedClientData,
} from '@/lib/contract-templates'

type MessageRow = {
  id: string
  mensagem: string | null
  resposta_agente: string | null
  respondido_por_agente: boolean | null
  created_at: string
}

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const EXTRACTION_MODEL = 'claude-sonnet-4-20250514'
const EXTRACTION_KEYS = Object.keys(EMPTY_EXTRACTED_CLIENT_DATA) as Array<keyof ExtractedClientData>

const EXTRACTION_SYSTEM_PROMPT = [
  'Você é um extrator de dados documentais jurídicos.',
  'Extraia apenas dados explicitamente confirmados no histórico da conversa.',
  'Não invente, não complete, não infira endereço/cpf/rg parcialmente.',
  'Se houver conflito, use a informação mais recente claramente afirmada pelo cliente.',
  'Retorne somente JSON válido, sem markdown, sem comentários, com exatamente estas 12 chaves:',
  'cliente_nome, cliente_nacionalidade, cliente_estado_civil, cliente_profissao, cliente_cpf, cliente_rg, cliente_email, cliente_endereco_rua, cliente_endereco_numero, cliente_bairro, cliente_cidade, cliente_cep.',
  'Use string quando houver valor confirmado e null quando não houver.',
].join('\n')

function buildConversationTranscript(rows: MessageRow[]) {
  return rows
    .flatMap((row) => {
      const chunks: string[] = []
      if (row.mensagem?.trim()) {
        chunks.push(`[${row.created_at}] Cliente: ${row.mensagem.trim()}`)
      }
      if (row.respondido_por_agente && row.resposta_agente?.trim()) {
        chunks.push(`[${row.created_at}] Agente: ${row.resposta_agente.trim()}`)
      }
      return chunks
    })
    .join('\n')
}

function sanitizeJsonText(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function coerceExtractedClientData(input: unknown): ExtractedClientData {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ...EMPTY_EXTRACTED_CLIENT_DATA }
  }

  const record = input as Record<string, unknown>
  const normalized = { ...EMPTY_EXTRACTED_CLIENT_DATA }

  for (const key of EXTRACTION_KEYS) {
    const value = record[key]
    normalized[key] = typeof value === 'string' && value.trim() ? value.trim() : null
  }

  return normalized
}

export async function extractClientDataFromConversation(params: {
  tenantId: string
  leadId: string
  conversaId: string | null
}): Promise<{
  data: ExtractedClientData
  missing_fields: string[]
  custo_usd: number
}> {
  const supabase = createAdminSupabase()
  const historyScopeColumn = params.conversaId ? 'conversa_id' : 'lead_id'
  const historyScopeValue = params.conversaId || params.leadId

  if (!historyScopeValue) {
    return {
      data: { ...EMPTY_EXTRACTED_CLIENT_DATA },
      missing_fields: [...EXTRACTION_KEYS],
      custo_usd: 0,
    }
  }

  const { data: rows, error } = await supabase
    .from('mensagens_inbound')
    .select('id, mensagem, resposta_agente, respondido_por_agente, created_at')
    .eq(historyScopeColumn, historyScopeValue)
    .order('created_at', { ascending: true })
    .limit(80)

  if (error) {
    throw new Error(error.message)
  }

  const transcript = buildConversationTranscript((rows || []) as MessageRow[])
  if (!transcript.trim()) {
    return {
      data: { ...EMPTY_EXTRACTED_CLIENT_DATA },
      missing_fields: [...EXTRACTION_KEYS],
      custo_usd: 0,
    }
  }

  const startedAt = Date.now()

  try {
    const response = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 600,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            'HISTÓRICO DA CONVERSA:',
            transcript,
            '',
            'Retorne somente o JSON solicitado.',
          ].join('\n'),
        },
      ],
    })

    const text = sanitizeJsonText(
      response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join(''),
    )

    const usage = (response as any)?.usage || {}
    const custoUsd = calculateUsageCostUsd({
      modelo: EXTRACTION_MODEL,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    })

    let extracted = { ...EMPTY_EXTRACTED_CLIENT_DATA }

    try {
      extracted = coerceExtractedClientData(JSON.parse(text))
    } catch (parseError) {
      console.warn('[extracao-dados-cliente] Falha ao parsear JSON:', parseError)
    }

    const missingFields = EXTRACTION_KEYS.filter((key) => extracted[key] == null)

    await logLlmUsage({
      tenantId: params.tenantId,
      conversaId: params.conversaId,
      leadId: params.leadId,
      agenteId: null,
      perfilOperacao: 'extracao_dados_cliente',
      modelo: EXTRACTION_MODEL,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
      latenciaMs: Date.now() - startedAt,
      sucesso: true,
    })

    return {
      data: extracted,
      missing_fields: missingFields,
      custo_usd: custoUsd,
    }
  } catch (error: any) {
    await logLlmUsage({
      tenantId: params.tenantId,
      conversaId: params.conversaId,
      leadId: params.leadId,
      agenteId: null,
      perfilOperacao: 'extracao_dados_cliente',
      modelo: EXTRACTION_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latenciaMs: Date.now() - startedAt,
      sucesso: false,
      erroDescricao: error?.message || 'Falha desconhecida na extração de dados do cliente',
    })

    throw error
  }
}
