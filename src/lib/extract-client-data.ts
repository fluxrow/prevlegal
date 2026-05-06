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
import { isMissingDocumentProcessingSchemaError } from '@/lib/document-processing'

type MessageRow = {
  id: string
  mensagem: string | null
  resposta_agente: string | null
  respondido_por_agente: boolean | null
  created_at: string
}

type ParsedDocumentRow = {
  source_id: string
  plain_text: string | null
  markdown: string | null
  doc_type_guess: string | null
  updated_at: string
}

type AnthropicUsage = {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
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
  'Extraia apenas dados explicitamente confirmados no histórico da conversa ou no conteúdo documental fornecido.',
  'Não invente, não complete, não infira endereço/cpf/rg parcialmente.',
  'Se um dado aparecer em documento e conversa, você pode usar a fonte mais completa ou mais recente, desde que esteja claramente escrita.',
  'Se houver conflito, use a informação mais recente claramente afirmada pelo cliente.',
  'Retorne somente JSON válido, sem markdown, sem comentários, com exatamente estas 12 chaves:',
  'cliente_nome, cliente_nacionalidade, cliente_estado_civil, cliente_profissao, cliente_cpf, cliente_rg, cliente_email, cliente_endereco_rua, cliente_endereco_numero, cliente_bairro, cliente_cidade, cliente_cep.',
  'Use string quando houver valor confirmado e null quando não houver.',
].join('\n')

const MAX_DOCUMENTS_FOR_EXTRACTION = 4
const MAX_DOCUMENT_CHARS_PER_ITEM = 2500

function buildParsedDocumentsTranscript(rows: ParsedDocumentRow[]) {
  return rows
    .map((row, index) => {
      const rawText = typeof row.plain_text === 'string' && row.plain_text.trim()
        ? row.plain_text.trim()
        : typeof row.markdown === 'string'
          ? row.markdown.trim()
          : ''

      if (!rawText) return null

      const normalizedText = rawText
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .slice(0, MAX_DOCUMENT_CHARS_PER_ITEM)

      const label = row.doc_type_guess || 'documento'
      return [
        `[DOC ${index + 1}] tipo=${label} atualizado_em=${row.updated_at}`,
        normalizedText,
      ].join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

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

function getAnthropicUsage(response: { usage?: AnthropicUsage }) {
  return response.usage || {}
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Falha desconhecida na extração de dados do cliente'
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

  const [{ data: parsedRows, error: parsedError }, transcript] = await Promise.all([
    supabase
      .from('document_parsed_contents')
      .select('source_id, plain_text, markdown, doc_type_guess, updated_at')
      .eq('tenant_id', params.tenantId)
      .eq('lead_id', params.leadId)
      .eq('source_type', 'lead_documento')
      .order('updated_at', { ascending: false })
      .limit(MAX_DOCUMENTS_FOR_EXTRACTION),
    Promise.resolve(buildConversationTranscript((rows || []) as MessageRow[])),
  ])

  if (parsedError && !isMissingDocumentProcessingSchemaError(parsedError)) {
    throw new Error(parsedError.message)
  }

  const documentsTranscript = buildParsedDocumentsTranscript((parsedRows || []) as ParsedDocumentRow[])

  if (!transcript.trim() && !documentsTranscript.trim()) {
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
            transcript || '(sem histórico textual relevante)',
            '',
            'DOCUMENTOS JÁ PROCESSADOS:',
            documentsTranscript || '(sem documentos processados disponíveis)',
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

    const usage = getAnthropicUsage(response)
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
  } catch (error: unknown) {
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
      erroDescricao: getErrorMessage(error),
    })

    throw error
  }
}
