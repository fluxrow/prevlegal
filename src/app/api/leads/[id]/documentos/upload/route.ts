import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

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

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const fileName = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('lead-documentos')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signedData } = await supabase.storage
    .from('lead-documentos')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 ano

  return NextResponse.json({
    path: fileName,
    url: signedData?.signedUrl || '',
    nome: file.name,
    tamanho: file.size,
    tipo: file.type,
  })
}
