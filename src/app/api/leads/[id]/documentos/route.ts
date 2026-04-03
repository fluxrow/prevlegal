import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

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

  return NextResponse.json(data || [])
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
  const { nome, tipo, arquivo_url, arquivo_nome, arquivo_tamanho, arquivo_tipo, descricao } = body

  const { data, error } = await supabase
    .from('lead_documentos')
    .insert({ lead_id: id, nome, tipo, arquivo_url, arquivo_nome, arquivo_tamanho, arquivo_tipo, descricao, created_by: context.authUserId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
    .select('arquivo_url, arquivo_nome')
    .eq('id', docId)
    .single()

  if (doc) {
    const urlParts = doc.arquivo_url.split('/lead-documentos/')
    if (urlParts[1]) {
      // Strip query string (signed URL params) to get storage path
      const storagePath = urlParts[1].split('?')[0]
      await supabase.storage.from('lead-documentos').remove([storagePath])
    }
  }

  await supabase.from('lead_documentos').delete().eq('id', docId).eq('lead_id', id)
  return NextResponse.json({ ok: true })
}
