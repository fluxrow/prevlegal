import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { ids, marcar_todas } = body

  if (marcar_todas) {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('lida', false)
  } else if (ids?.length) {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .in('id', ids)
  }

  return NextResponse.json({ ok: true })
}
