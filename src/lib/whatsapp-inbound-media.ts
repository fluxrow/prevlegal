import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { queueDocumentProcessingJob } from '@/lib/document-processing'

export type InboundMediaKind = 'document' | 'image' | 'audio' | 'video' | 'other'
export type InboundMediaProvider = 'twilio' | 'zapi'

type SupabaseLike = Pick<SupabaseClient, 'from' | 'storage'>

export type InboundMediaDescriptor = {
  provider: InboundMediaProvider
  kind: InboundMediaKind
  url: string
  mimeType: string | null
  fileName: string | null
  caption: string | null
}

type PersistInboundLeadDocumentInput = {
  supabase: SupabaseLike
  tenantId: string | null
  leadId: string | null
  media: InboundMediaDescriptor
  description?: string | null
  headers?: Record<string, string>
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

function guessExtensionFromMime(mimeType?: string | null) {
  const normalized = String(mimeType || '').trim().toLowerCase()
  if (!normalized) return ''

  const known: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
  }

  if (known[normalized]) return known[normalized]

  const suffix = normalized.split('/')[1]?.trim()
  return suffix ? suffix.replace(/[^a-z0-9]+/gi, '') : ''
}

function detectMediaKindFromMime(mimeType?: string | null): InboundMediaKind {
  const normalized = String(mimeType || '').toLowerCase()
  if (!normalized) return 'other'
  if (normalized.startsWith('image/')) return 'image'
  if (normalized.startsWith('audio/')) return 'audio'
  if (normalized.startsWith('video/')) return 'video'
  if (
    normalized.includes('pdf') ||
    normalized.includes('document') ||
    normalized.includes('sheet') ||
    normalized.includes('word') ||
    normalized.includes('excel') ||
    normalized.includes('text/')
  ) {
    return 'document'
  }
  return 'other'
}

function detectMediaKindFromHints(hint?: string | null, mimeType?: string | null): InboundMediaKind {
  const byMime = detectMediaKindFromMime(mimeType)
  if (byMime !== 'other') return byMime

  const normalized = String(hint || '').toLowerCase()
  if (!normalized) return 'other'
  if (normalized.includes('image') || normalized.includes('photo')) return 'image'
  if (normalized.includes('audio') || normalized.includes('voice') || normalized.includes('ptt')) return 'audio'
  if (normalized.includes('video')) return 'video'
  if (normalized.includes('document') || normalized.includes('file') || normalized.includes('attachment')) {
    return 'document'
  }
  return 'other'
}

function inferFileNameFromUrl(url: string, mimeType?: string | null) {
  try {
    const parsed = new URL(url)
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() || ''
    const candidate = decodeURIComponent(lastSegment)
    if (candidate && candidate.includes('.')) return candidate
  } catch {
    // noop
  }

  const ext = guessExtensionFromMime(mimeType)
  return ext ? `arquivo.${ext}` : 'arquivo'
}

function buildMediaLabel(media: InboundMediaDescriptor) {
  const fileName = media.fileName?.trim()
  if (fileName) return fileName

  if (media.kind === 'image') return 'imagem'
  if (media.kind === 'audio') return 'áudio'
  if (media.kind === 'video') return 'vídeo'
  if (media.kind === 'document') return 'documento'
  return 'anexo'
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function getNestedValue(source: unknown, path: string[]) {
  let current: unknown = source
  for (const segment of path) {
    if (current == null || typeof current !== 'object' || !(segment in current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function pickFirstString(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = getNestedValue(source, path)
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function collectObjectCandidates(payload: unknown) {
  const visited = new Set<unknown>()
  const candidates: Record<string, unknown>[] = []

  const visit = (value: unknown, depth: number) => {
    if (depth > 5 || value == null || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)

    if (!Array.isArray(value)) {
      candidates.push(value as Record<string, unknown>)
    }

    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }

    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (nested && typeof nested === 'object') visit(nested, depth + 1)
    }
  }

  visit(payload, 0)
  return candidates
}

export function extractTwilioInboundMedia(params: Record<string, string>) {
  const total = Number.parseInt(String(params.NumMedia || '0'), 10)
  if (!Number.isFinite(total) || total <= 0) return [] as InboundMediaDescriptor[]

  const items: InboundMediaDescriptor[] = []

  for (let index = 0; index < total; index += 1) {
    const url = String(params[`MediaUrl${index}`] || '').trim()
    const mimeType = String(params[`MediaContentType${index}`] || '').trim() || null
    if (!url) continue

    const kind = detectMediaKindFromMime(mimeType)
    items.push({
      provider: 'twilio',
      kind,
      url,
      mimeType,
      fileName: inferFileNameFromUrl(url, mimeType),
      caption: null,
    })
  }

  return items
}

export function extractZApiInboundMedia(payload: unknown) {
  const sources = collectObjectCandidates(payload)
  const descriptors: InboundMediaDescriptor[] = []
  const seenUrls = new Set<string>()

  for (const source of sources) {
    const directUrl = pickFirstString(source, [
      ['url'],
      ['fileUrl'],
      ['downloadUrl'],
      ['mediaUrl'],
      ['directPath'],
      ['document', 'url'],
      ['documentMessage', 'url'],
      ['image', 'url'],
      ['imageMessage', 'url'],
      ['audio', 'url'],
      ['audioMessage', 'url'],
      ['video', 'url'],
      ['videoMessage', 'url'],
    ])

    if (!directUrl || !isHttpUrl(directUrl) || seenUrls.has(directUrl)) continue

    const mimeType =
      pickFirstString(source, [
        ['mimeType'],
        ['mimetype'],
        ['file', 'mimeType'],
        ['document', 'mimetype'],
        ['documentMessage', 'mimetype'],
        ['imageMessage', 'mimetype'],
        ['audioMessage', 'mimetype'],
        ['videoMessage', 'mimetype'],
      ]) || null

    const hint = pickFirstString(source, [
      ['typeMessage'],
      ['messageType'],
      ['type'],
      ['mediaType'],
    ])

    const fileName =
      pickFirstString(source, [
        ['fileName'],
        ['filename'],
        ['file', 'name'],
        ['document', 'fileName'],
        ['documentMessage', 'fileName'],
        ['documentMessage', 'title'],
      ]) || inferFileNameFromUrl(directUrl, mimeType)

    const caption =
      pickFirstString(source, [
        ['caption'],
        ['text', 'message'],
        ['text', 'body'],
      ]) || null

    descriptors.push({
      provider: 'zapi',
      kind: detectMediaKindFromHints(hint, mimeType),
      url: directUrl,
      mimeType,
      fileName,
      caption,
    })
    seenUrls.add(directUrl)
  }

  return descriptors
}

export function buildInboundMediaPlaceholder(mediaItems: InboundMediaDescriptor[]) {
  if (mediaItems.length === 0) return ''

  if (mediaItems.length > 1) {
    return `📎 ${mediaItems.length} anexos enviados pelo cliente`
  }

  const media = mediaItems[0]
  const label = buildMediaLabel(media)

  if (media.kind === 'audio') return `🎤 Áudio enviado pelo cliente${label !== 'áudio' ? `: ${label}` : ''}`
  if (media.kind === 'image') return `🖼️ Imagem enviada pelo cliente${label !== 'imagem' ? `: ${label}` : ''}`
  if (media.kind === 'video') return `🎥 Vídeo enviado pelo cliente${label !== 'vídeo' ? `: ${label}` : ''}`
  return `📎 Documento enviado pelo cliente: ${label}`
}

export function shouldPersistInboundMediaAsLeadDocument(media: InboundMediaDescriptor) {
  return media.kind === 'document' || media.kind === 'image'
}

export async function persistInboundLeadDocument({
  supabase,
  tenantId,
  leadId,
  media,
  description,
  headers,
}: PersistInboundLeadDocumentInput) {
  if (!tenantId || !leadId || !media.url || !shouldPersistInboundMediaAsLeadDocument(media)) {
    return { ok: false as const, reason: 'ineligible' }
  }

  let response: Response
  try {
    response = await fetch(media.url, { headers })
  } catch (error) {
    return {
      ok: false as const,
      reason: 'download_failed',
      error: String(error || 'download_failed'),
    }
  }

  if (!response.ok) {
    return {
      ok: false as const,
      reason: 'download_failed',
      error: `download_${response.status}`,
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) {
    return { ok: false as const, reason: 'empty_file' }
  }

  const originalFileName = media.fileName?.trim() || inferFileNameFromUrl(media.url, media.mimeType)
  const sanitized = sanitizeFileName(originalFileName.replace(/\.[^.]+$/, '')) || 'arquivo-whatsapp'
  const ext = originalFileName.includes('.')
    ? originalFileName.split('.').pop() || guessExtensionFromMime(media.mimeType)
    : guessExtensionFromMime(media.mimeType)
  const storagePath = `${leadId}/whatsapp-inbound/${Date.now()}-${randomUUID()}-${sanitized}${ext ? `.${ext}` : ''}`

  const uploadResult = await supabase.storage
    .from('lead-documentos')
    .upload(storagePath, buffer, {
      contentType: media.mimeType || 'application/octet-stream',
      upsert: false,
    })

  if (uploadResult.error) {
    return { ok: false as const, reason: 'upload_failed', error: uploadResult.error.message }
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from('lead-documentos')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

  if (signedError) {
    return { ok: false as const, reason: 'signed_url_failed', error: signedError.message }
  }

  const docName = media.fileName?.trim() || `Documento recebido via WhatsApp`
  const { data: documento, error: docError } = await supabase
    .from('lead_documentos')
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      nome: docName,
      tipo: 'outro',
      arquivo_url: signedData?.signedUrl || '',
      arquivo_nome: media.fileName?.trim() || originalFileName,
      arquivo_tamanho: buffer.length,
      arquivo_tipo: media.mimeType,
      descricao: description || `Recebido via WhatsApp (${media.provider.toUpperCase()})`,
      storage_bucket: 'lead-documentos',
      storage_path: storagePath,
    })
    .select('id')
    .single()

  if (docError || !documento?.id) {
    return { ok: false as const, reason: 'insert_failed', error: docError?.message || 'insert_failed' }
  }

  await queueDocumentProcessingJob(supabase, {
    tenantId,
    leadId,
    sourceType: 'lead_documento',
    sourceId: documento.id,
    storageBucket: 'lead-documentos',
    storagePath,
    fileName: media.fileName?.trim() || originalFileName,
    mimeType: media.mimeType,
  })

  return { ok: true as const, documentId: documento.id }
}
