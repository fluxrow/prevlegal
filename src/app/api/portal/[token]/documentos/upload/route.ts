import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolvePortalViewer } from '@/lib/portal-auth'
import { queueDocumentProcessingJob } from '@/lib/document-processing'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params

  const { data: lead } = await adminSupabase
    .from('leads')
    .select('id, nome, tenant_id, portal_ativo')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  const viewerResult = await resolvePortalViewer(adminSupabase, request, lead.id)
  const formData = await request.formData()
  const file = formData.get('file')
  const requestId = typeof formData.get('requestId') === 'string' ? String(formData.get('requestId')) : null
  const tituloRaw = typeof formData.get('titulo') === 'string' ? String(formData.get('titulo')).trim() : ''
  const tipoRaw = typeof formData.get('tipo') === 'string' ? String(formData.get('tipo')).trim() : ''

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Selecione um arquivo para enviar.' }, { status: 400 })
  }

  const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : ''
  const sanitizedBaseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, '')) || 'documento'
  const storagePath = `${lead.id}/portal/${Date.now()}-${randomUUID()}-${sanitizedBaseName}${fileExtension ? `.${fileExtension}` : ''}`

  const uploadResult = await adminSupabase.storage
    .from('lead-documentos')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const { data: signedData, error: signedError } = await adminSupabase.storage
    .from('lead-documentos')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

  if (signedError) {
    return NextResponse.json({ error: signedError.message }, { status: 500 })
  }

  let requestTitle: string | null = null
  if (requestId) {
    const { data: requestRecord, error: requestError } = await adminSupabase
      .from('portal_document_requests')
      .select('id, titulo')
      .eq('id', requestId)
      .eq('lead_id', lead.id)
      .maybeSingle()

    if (requestError && !isMissingRelation(requestError)) {
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    requestTitle = requestRecord?.titulo || null
  }

  const nomeDocumento = tituloRaw || requestTitle || file.name
  const tipoDocumento = tipoRaw || 'outro'
  const viewerLabel = viewerResult.viewer?.nome || 'Cliente do portal'

  const { data: documento, error: docError } = await adminSupabase
    .from('lead_documentos')
    .insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      nome: nomeDocumento,
      tipo: tipoDocumento,
      tipo_documento: tipoDocumento,
      arquivo_url: signedData?.signedUrl || '',
      arquivo_nome: file.name,
      arquivo_tamanho: file.size,
      arquivo_tipo: file.type || null,
      descricao: `Enviado pelo portal${viewerResult.viewer ? ` por ${viewerLabel}` : ''}`,
      compartilhado_cliente: true,
    })
    .select('id, nome, tipo, tipo_documento, arquivo_url, created_at')
    .single()

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 })
  }

  await queueDocumentProcessingJob(adminSupabase, {
    tenantId: lead.tenant_id,
    leadId: lead.id,
    sourceType: 'lead_documento',
    sourceId: documento.id,
    storageBucket: 'lead-documentos',
    storagePath,
    fileName: file.name,
    mimeType: file.type || null,
  })

  if (requestId) {
    const { error: requestUpdateError } = await adminSupabase
      .from('portal_document_requests')
      .update({
        status: 'enviado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('lead_id', lead.id)

    if (requestUpdateError && !isMissingRelation(requestUpdateError)) {
      return NextResponse.json({ error: requestUpdateError.message }, { status: 500 })
    }
  }

  const { error: timelineError } = await adminSupabase
    .from('portal_timeline_events')
    .insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      tipo: 'documento_enviado_cliente',
      titulo: 'Documento enviado pelo portal',
      descricao: `${nomeDocumento}${viewerResult.viewer ? ` por ${viewerLabel}` : ''}`,
      visivel_cliente: true,
    })

  if (timelineError && !isMissingRelation(timelineError)) {
    return NextResponse.json({ error: timelineError.message }, { status: 500 })
  }

  await adminSupabase.from('notificacoes').insert({
    tenant_id: lead.tenant_id,
    tipo: 'portal',
    titulo: `Novo documento no portal — ${lead.nome}`,
    descricao: nomeDocumento,
    lida: false,
    link: `/leads/${lead.id}`,
  })

  return NextResponse.json({
    documento,
    requestId,
    requestStatus: requestId ? 'enviado' : null,
  })
}
