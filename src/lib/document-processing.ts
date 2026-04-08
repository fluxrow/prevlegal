import { createClient } from '@supabase/supabase-js'

export type DocumentSourceType = 'lead_documento' | 'agent_document'
export type DocumentProcessingStatus = 'pending' | 'processing' | 'done' | 'failed'

type SupabaseLike = {
  from: (table: string) => any
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, expiresIn: number) => Promise<{
        data: { signedUrl?: string } | null
        error: { message: string } | null
      }>
    }
  }
}

export type DocumentProcessingJob = {
  id: string
  tenant_id: string | null
  lead_id: string | null
  source_type: DocumentSourceType
  source_id: string
  storage_bucket: string
  storage_path: string
  arquivo_nome: string | null
  mime_type: string | null
  parser: string
  parser_version: string | null
  status: DocumentProcessingStatus
  attempts: number
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export type ParsedDocumentContent = {
  id: string
  tenant_id: string | null
  lead_id: string | null
  source_type: DocumentSourceType
  source_id: string
  parser: string
  parser_version: string | null
  plain_text: string | null
  markdown: string | null
  raw_json: Record<string, unknown> | null
  doc_type_guess: string | null
  language: string | null
  page_count: number | null
  has_ocr: boolean
  created_at: string
  updated_at: string
}

export function isMissingDocumentProcessingSchemaError(error?: { code?: string; message?: string } | null) {
  return Boolean(
    error?.code === 'PGRST205' ||
    error?.code === '42703' ||
    error?.code === '42P01' ||
    error?.message?.includes('document_processing_jobs') ||
    error?.message?.includes('document_parsed_contents') ||
    error?.message?.includes('document_chunks') ||
    error?.message?.includes('does not exist') ||
    error?.message?.includes('could not find'),
  )
}

export type ParsedDocumentChunk = {
  chunk_index: number
  content: string
  page_from?: number | null
  page_to?: number | null
  section_title?: string | null
  metadata?: Record<string, unknown>
}

type QueueDocumentJobInput = {
  tenantId: string | null
  leadId?: string | null
  sourceType: DocumentSourceType
  sourceId: string
  storageBucket: string
  storagePath: string
  fileName?: string | null
  mimeType?: string | null
}

type ParseDocumentResult = {
  plainText: string
  markdown?: string | null
  rawJson?: Record<string, unknown> | null
  docTypeGuess?: string | null
  language?: string | null
  pageCount?: number | null
  hasOcr?: boolean
  parserVersion?: string | null
  chunks?: ParsedDocumentChunk[]
}

export function createDocumentProcessingAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export function getDoclingServiceUrl() {
  return process.env.DOCLING_SERVICE_URL?.trim() || ''
}

export function getDoclingServiceToken() {
  return process.env.DOCLING_SERVICE_TOKEN?.trim() || ''
}

export function isDoclingServiceConfigured() {
  return Boolean(getDoclingServiceUrl())
}

export function canProcessInlineDocument(
  mimeType?: string | null,
  fileName?: string | null,
) {
  const normalizedMime = (mimeType || '').toLowerCase()
  const normalizedName = (fileName || '').toLowerCase()

  if (
    normalizedMime.startsWith('text/') ||
    normalizedMime === 'application/json' ||
    normalizedMime === 'application/xml' ||
    normalizedMime === 'text/csv'
  ) {
    return true
  }

  return ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html'].some((ext) =>
    normalizedName.endsWith(ext),
  )
}

export function shouldQueueDocumentProcessing(
  mimeType?: string | null,
  fileName?: string | null,
) {
  return canProcessInlineDocument(mimeType, fileName) || Boolean(fileName) || Boolean(mimeType)
}

export async function queueDocumentProcessingJob(
  supabase: Pick<SupabaseLike, 'from'>,
  input: QueueDocumentJobInput,
) {
  if (!input.tenantId) return null

  const { data, error } = await supabase
    .from('document_processing_jobs')
    .upsert(
      {
        tenant_id: input.tenantId,
        lead_id: input.leadId || null,
        source_type: input.sourceType,
        source_id: input.sourceId,
        storage_bucket: input.storageBucket,
        storage_path: input.storagePath,
        arquivo_nome: input.fileName || null,
        mime_type: input.mimeType || null,
        parser: 'docling',
        status: 'pending',
        error_message: null,
        started_at: null,
        finished_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_type,source_id' },
    )
    .select('*')
    .single()

  if (error) {
    if (isMissingDocumentProcessingSchemaError(error)) {
      return null
    }
    throw new Error(error.message)
  }

  return data as DocumentProcessingJob
}

export async function mergeLeadDocumentsWithProcessing(
  supabase: Pick<SupabaseLike, 'from'>,
  documents: Array<Record<string, any>>,
) {
  const ids = documents.map((doc) => doc.id).filter(Boolean)
  if (ids.length === 0) return documents

  const [{ data: jobs, error: jobsError }, { data: parsed, error: parsedError }] = await Promise.all([
    supabase
      .from('document_processing_jobs')
      .select('source_id, status, error_message, finished_at')
      .eq('source_type', 'lead_documento')
      .in('source_id', ids),
    supabase
      .from('document_parsed_contents')
      .select('source_id, doc_type_guess, plain_text, markdown, updated_at')
      .eq('source_type', 'lead_documento')
      .in('source_id', ids),
  ])

  if (jobsError) {
    if (isMissingDocumentProcessingSchemaError(jobsError)) {
      return documents
    }
    throw new Error(jobsError.message)
  }

  if (parsedError) {
    if (isMissingDocumentProcessingSchemaError(parsedError)) {
      return documents.map((doc) => ({
        ...doc,
        processing_status: null,
        processing_error: null,
        processing_finished_at: null,
        parsed_doc_type_guess: null,
        parsed_excerpt: null,
        parsed_updated_at: null,
      }))
    }
    throw new Error(parsedError.message)
  }

  const jobsBySource = new Map<string, Record<string, any>>(
    (jobs || []).map((job: Record<string, any>) => [job.source_id, job]),
  )
  const parsedBySource = new Map<string, Record<string, any>>(
    (parsed || []).map((entry: Record<string, any>) => [entry.source_id, entry]),
  )

  return documents.map((doc) => {
    const job = jobsBySource.get(doc.id)
    const parsedEntry = parsedBySource.get(doc.id)
    const plainText = typeof parsedEntry?.plain_text === 'string' ? parsedEntry.plain_text.trim() : ''
    const markdown = typeof parsedEntry?.markdown === 'string' ? parsedEntry.markdown.trim() : ''
    const previewSource = plainText || markdown

    return {
      ...doc,
      processing_status: job?.status || null,
      processing_error: job?.error_message || null,
      processing_finished_at: job?.finished_at || null,
      parsed_doc_type_guess: parsedEntry?.doc_type_guess || null,
      parsed_excerpt: previewSource ? previewSource.slice(0, 220) : null,
      parsed_updated_at: parsedEntry?.updated_at || null,
    }
  })
}

export async function deleteDocumentProcessingArtifacts(
  supabase: Pick<SupabaseLike, 'from'>,
  sourceType: DocumentSourceType,
  sourceId: string,
) {
  const { data: parsedContent, error: parsedError } = await supabase
    .from('document_parsed_contents')
    .select('id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle()

  if (parsedError && isMissingDocumentProcessingSchemaError(parsedError)) {
    return
  }

  if (!parsedContent) {
    await supabase
      .from('document_processing_jobs')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
    return
  }

  if (parsedContent?.id) {
    await supabase
      .from('document_chunks')
      .delete()
      .eq('parsed_content_id', parsedContent.id)
  }

  await supabase
    .from('document_parsed_contents')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)

  await supabase
    .from('document_processing_jobs')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
}

export async function createSignedDocumentUrl(
  supabase: Pick<SupabaseLike, 'storage'>,
  bucket: string,
  path: string,
) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 15)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Não foi possível assinar o arquivo para processamento')
  }
  return data.signedUrl
}

export function buildDocumentChunks(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const segments = normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const chunks: ParsedDocumentChunk[] = []
  let current = ''
  let chunkIndex = 0

  for (const segment of segments) {
    const next = current ? `${current}\n\n${segment}` : segment
    if (next.length > 1200 && current) {
      chunks.push({
        chunk_index: chunkIndex++,
        content: current,
        metadata: {},
      })
      current = segment
    } else {
      current = next
    }
  }

  if (current) {
    chunks.push({
      chunk_index: chunkIndex,
      content: current,
      metadata: {},
    })
  }

  return chunks
}

export function guessDocumentType(
  fileName?: string | null,
  plainText?: string | null,
) {
  const haystack = `${fileName || ''}\n${plainText || ''}`.toLowerCase()

  if (haystack.includes('cnis')) return 'cnis'
  if (haystack.includes('procuração') || haystack.includes('procuracao')) return 'procuracao'
  if (haystack.includes('requerimento') && haystack.includes('inss')) return 'requerimento_inss'
  if (haystack.includes('laudo')) return 'laudo_medico'
  if (haystack.includes('petição') || haystack.includes('peticao')) return 'peticao'
  if (haystack.includes('identidade') || haystack.includes('rg')) return 'identidade'
  return 'outro'
}

export async function parseInlineDocument(
  signedUrl: string,
  fileName?: string | null,
) {
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo para processamento (${response.status})`)
  }

  const plainText = (await response.text()).trim()
  return {
    plainText,
    markdown: plainText,
    rawJson: {
      mode: 'inline_text_fallback',
      file_name: fileName || null,
    },
    docTypeGuess: guessDocumentType(fileName, plainText),
    language: 'pt-BR',
    pageCount: 1,
    hasOcr: false,
    parserVersion: 'inline-text-fallback',
    chunks: buildDocumentChunks(plainText),
  } satisfies ParseDocumentResult
}

export async function parseDocumentViaDoclingService(input: {
  signedUrl: string
  fileName?: string | null
  mimeType?: string | null
  sourceType: DocumentSourceType
  sourceId: string
}) {
  const serviceUrl = getDoclingServiceUrl()
  if (!serviceUrl) {
    throw new Error('Docling service não configurado')
  }

  const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getDoclingServiceToken() ? { Authorization: `Bearer ${getDoclingServiceToken()}` } : {}),
    },
    body: JSON.stringify({
      source_url: input.signedUrl,
      file_name: input.fileName || null,
      mime_type: input.mimeType || null,
      source_type: input.sourceType,
      source_id: input.sourceId,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || `Docling service retornou ${response.status}`)
  }

  const plainText = typeof payload?.plain_text === 'string'
    ? payload.plain_text.trim()
    : typeof payload?.markdown === 'string'
      ? payload.markdown.trim()
      : ''

  return {
    plainText,
    markdown: typeof payload?.markdown === 'string' ? payload.markdown : plainText,
    rawJson: payload?.raw_json || payload || null,
    docTypeGuess: payload?.doc_type_guess || guessDocumentType(input.fileName, plainText),
    language: payload?.language || null,
    pageCount: typeof payload?.page_count === 'number' ? payload.page_count : null,
    hasOcr: Boolean(payload?.has_ocr),
    parserVersion: payload?.parser_version || 'docling-service',
    chunks: Array.isArray(payload?.chunks) && payload.chunks.length > 0
      ? payload.chunks
      : buildDocumentChunks(plainText),
  } satisfies ParseDocumentResult
}

export async function persistParsedDocumentResult(
  supabase: Pick<SupabaseLike, 'from'>,
  job: DocumentProcessingJob,
  parsed: ParseDocumentResult,
) {
  const { data: parsedContent, error: parsedError } = await supabase
    .from('document_parsed_contents')
    .upsert(
      {
        tenant_id: job.tenant_id,
        lead_id: job.lead_id,
        source_type: job.source_type,
        source_id: job.source_id,
        parser: 'docling',
        parser_version: parsed.parserVersion || null,
        plain_text: parsed.plainText,
        markdown: parsed.markdown || parsed.plainText,
        raw_json: parsed.rawJson || null,
        doc_type_guess: parsed.docTypeGuess || null,
        language: parsed.language || null,
        page_count: parsed.pageCount || null,
        has_ocr: Boolean(parsed.hasOcr),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_type,source_id' },
    )
    .select('id')
    .single()

  if (parsedError) {
    if (isMissingDocumentProcessingSchemaError(parsedError)) {
      return
    }
    throw new Error(parsedError.message)
  }

  await supabase
    .from('document_chunks')
    .delete()
    .eq('parsed_content_id', parsedContent.id)

  const chunks = (parsed.chunks || buildDocumentChunks(parsed.plainText)).filter((chunk) =>
    Boolean(chunk?.content?.trim()),
  )

  if (chunks.length > 0) {
    const { error: chunkError } = await supabase
      .from('document_chunks')
      .insert(
        chunks.map((chunk, index) => ({
          tenant_id: job.tenant_id,
          source_type: job.source_type,
          source_id: job.source_id,
          parsed_content_id: parsedContent.id,
          chunk_index: typeof chunk.chunk_index === 'number' ? chunk.chunk_index : index,
          content: chunk.content,
          page_from: chunk.page_from || null,
          page_to: chunk.page_to || null,
          section_title: chunk.section_title || null,
          metadata: chunk.metadata || {},
        })),
      )

    if (chunkError) {
      if (isMissingDocumentProcessingSchemaError(chunkError)) {
        return
      }
      throw new Error(chunkError.message)
    }
  }
}

export async function processDocumentJob(
  supabase: SupabaseLike,
  job: DocumentProcessingJob,
) {
  const signedUrl = await createSignedDocumentUrl(supabase, job.storage_bucket, job.storage_path)

  if (canProcessInlineDocument(job.mime_type, job.arquivo_nome)) {
    return parseInlineDocument(signedUrl, job.arquivo_nome)
  }

  return parseDocumentViaDoclingService({
    signedUrl,
    fileName: job.arquivo_nome,
    mimeType: job.mime_type,
    sourceType: job.source_type,
    sourceId: job.source_id,
  })
}
