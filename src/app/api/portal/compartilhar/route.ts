import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

export async function POST(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documento_id, compartilhar } = await request.json()
  if (!documento_id) return NextResponse.json({ error: 'documento_id obrigatório' }, { status: 400 })

  const { data: documento, error: documentoError } = await supabase
    .from('lead_documentos')
    .select('id, lead_id')
    .eq('id', documento_id)
    .maybeSingle()

  if (documentoError) return NextResponse.json({ error: documentoError.message }, { status: 500 })
  if (!documento?.lead_id) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const allowed = await canAccessLeadId(supabase, context, documento.lead_id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('lead_documentos')
    .update({
      compartilhado_cliente: compartilhar,
      compartilhado_em: compartilhar ? new Date().toISOString() : null,
    })
    .eq('id', documento_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documento: data })
}
