import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import {
  deleteDocumentProcessingArtifacts,
  mergeLeadDocumentsWithProcessing,
  queueDocumentProcessingJob,
  shouldQueueDocumentProcessing,
} from '@/lib/document-processing'
import { resolveLeadDocumentStorageReference } from '@/lib/lead-document-storage'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase
    .from('lead_documentos')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  const enriched = await mergeLeadDocumentsWithProcessing(supabase, data || [])
  return NextResponse.json(enriched)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const {
    nome,
    tipo,
    arquivo_url,
    arquivo_nome,
    arquivo_tamanho,
    arquivo_tipo,
    descricao,
    storage_bucket,
    storage_path,
  } = body

  const resolvedStorage = resolveLeadDocumentStorageReference({
    storage_bucket,
    storage_path,
    arquivo_url,
  })

  const { data, error } = await supabase
    .from('lead_documentos')
    .insert({
      tenant_id: context.tenantId,
      lead_id: id,
      nome,
      tipo,
      arquivo_url,
      arquivo_nome,
      arquivo_tamanho,
      arquivo_tipo,
      descricao,
      storage_bucket: resolvedStorage.storageBucket,
      storage_path: resolvedStorage.storagePath,
      created_by: context.authUserId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (
    data?.id &&
    resolvedStorage.storageBucket === 'lead-documentos' &&
    resolvedStorage.storagePath &&
    shouldQueueDocumentProcessing(arquivo_tipo, arquivo_nome)
  ) {
    await queueDocumentProcessingJob(supabase, {
      tenantId: context.tenantId,
      leadId: id,
      sourceType: 'lead_documento',
      sourceId: data.id,
      storageBucket: resolvedStorage.storageBucket,
      storagePath: resolvedStorage.storagePath,
      fileName: arquivo_nome,
      mimeType: arquivo_tipo,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const docId = searchParams.get('docId')
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 })

  const { data: doc } = await supabase
    .from('lead_documentos')
    .select('arquivo_url, arquivo_nome, storage_bucket, storage_path')
    .eq('id', docId)
    .single()

  if (doc) {
    const storageRef = resolveLeadDocumentStorageReference(doc)
    if (storageRef.storageBucket && storageRef.storagePath) {
      await supabase.storage.from(storageRef.storageBucket).remove([storageRef.storagePath])
    }
  }

  await deleteDocumentProcessingArtifacts(supabase, 'lead_documento', docId)
  await supabase.from('lead_documentos').delete().eq('id', docId).eq('lead_id', id)
  return NextResponse.json({ ok: true })
}
