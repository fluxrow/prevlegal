import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('agente_ativo, agente_nome, agente_prompt_sistema, agente_modelo, agente_max_tokens, agente_resposta_automatica, agente_horario_inicio, agente_horario_fim, agente_apenas_dias_uteis')
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const campos = [
      'agente_ativo', 'agente_nome', 'agente_prompt_sistema', 'agente_modelo',
      'agente_max_tokens', 'agente_resposta_automatica', 'agente_horario_inicio',
      'agente_horario_fim', 'agente_apenas_dias_uteis'
    ]

    const updates: Record<string, any> = {}
    campos.forEach(c => { if (body[c] !== undefined) updates[c] = body[c] })
    updates.updated_at = new Date().toISOString()

    // Upsert — garante que existe um registro
    const { data: existing } = await supabase
      .from('configuracoes')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existing) {
      result = await supabase.from('configuracoes').update(updates).eq('id', existing.id)
    } else {
      result = await supabase.from('configuracoes').insert(updates)
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
