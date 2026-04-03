import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { texto } = await request.json()

  if (!texto?.trim()) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('lead_anotacoes')
    .insert({
      lead_id: id,
      usuario_id: context.usuarioId,
      texto: texto.trim()
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, anotacao: data })
}
