const KNOWN_DOCUMENT_BUCKETS = ['lead-documentos', 'contratos-leads'] as const

export function extractStorageReferenceFromSignedUrl(url?: string | null) {
  const normalizedUrl = String(url || '').trim()
  if (!normalizedUrl) {
    return { storageBucket: null, storagePath: null }
  }

  for (const bucket of KNOWN_DOCUMENT_BUCKETS) {
    const marker = `/${bucket}/`
    const index = normalizedUrl.indexOf(marker)
    if (index < 0) continue

    const storagePath = normalizedUrl.slice(index + marker.length).split('?')[0]?.trim() || null
    if (storagePath) {
      return {
        storageBucket: bucket,
        storagePath,
      }
    }
  }

  return { storageBucket: null, storagePath: null }
}

export function resolveLeadDocumentStorageReference(document: {
  storage_bucket?: string | null
  storage_path?: string | null
  arquivo_url?: string | null
}) {
  const directBucket = String(document.storage_bucket || '').trim() || null
  const directPath = String(document.storage_path || '').trim() || null

  if (directBucket && directPath) {
    return {
      storageBucket: directBucket,
      storagePath: directPath,
    }
  }

  return extractStorageReferenceFromSignedUrl(document.arquivo_url || null)
}
