import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documento_id, compartilhar } = await request.json()
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
