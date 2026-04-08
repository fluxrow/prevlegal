import { NextRequest, NextResponse } from 'next/server'
import {
  createDocumentProcessingAdminClient,
  isDoclingServiceConfigured,
  canProcessInlineDocument,
  processDocumentJob,
  persistParsedDocumentResult,
  isMissingDocumentProcessingSchemaError,
  type DocumentProcessingJob,
} from '@/lib/document-processing'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

async function processPendingJobs(limit = 10) {
  const supabase = createDocumentProcessingAdminClient()
  const { data: jobs, error } = await supabase
    .from('document_processing_jobs')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    if (isMissingDocumentProcessingSchemaError(error)) {
      return {
        processados: 0,
        resultados: [],
        doclingConfigured: isDoclingServiceConfigured(),
        schemaPending: true,
      }
    }
    throw new Error(error.message)
  }

  const resultados: Array<{ job_id: string; status: string; error?: string }> = []

  for (const job of (jobs || []) as DocumentProcessingJob[]) {
    const now = new Date().toISOString()
    await supabase
      .from('document_processing_jobs')
      .update({
        status: 'processing',
        started_at: now,
        updated_at: now,
        attempts: (job.attempts || 0) + 1,
        error_message: null,
      })
      .eq('id', job.id)

    try {
      if (!canProcessInlineDocument(job.mime_type, job.arquivo_nome) && !isDoclingServiceConfigured()) {
        throw new Error('Docling service ainda não configurado para documentos binários')
      }

      const parsed = await processDocumentJob(supabase, job)
      await persistParsedDocumentResult(supabase, job, parsed)

      await supabase
        .from('document_processing_jobs')
        .update({
          status: 'done',
          parser_version: parsed.parserVersion || job.parser_version || null,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', job.id)

      resultados.push({ job_id: job.id, status: 'done' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase
        .from('document_processing_jobs')
        .update({
          status: 'failed',
          error_message: message,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      resultados.push({ job_id: job.id, status: 'failed', error: message })
    }
  }

  return {
    processados: resultados.length,
    resultados,
    doclingConfigured: isDoclingServiceConfigured(),
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await request.json().catch(() => null)
    const limit = typeof json?.limit === 'number' ? Math.min(Math.max(json.limit, 1), 25) : 10
    const resultado = await processPendingJobs(limit)
    return NextResponse.json(resultado)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resultado = await processPendingJobs(10)
    return NextResponse.json(resultado)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
