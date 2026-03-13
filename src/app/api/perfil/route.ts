import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CAMPOS_PERFIL = [
  'advogado_nome', 'advogado_email', 'advogado_telefone', 'advogado_cpf',
  'advogado_foto_url',
  'oab_numero', 'oab_estado', 'oab_tipo', 'oab_situacao',
  'escritorio_nome', 'escritorio_cnpj', 'escritorio_endereco',
  'escritorio_cidade', 'escritorio_estado', 'escritorio_cep',
  'escritorio_telefone', 'escritorio_email', 'escritorio_logo_url',
  'assinatura_texto', 'assinatura_rodape',
]

export async function GET() {
  const { data } = await supabase
    .from('configuracoes')
    .select(CAMPOS_PERFIL.join(', '))
    .limit(1)
    .single()

  return NextResponse.json({ perfil: data || {} })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()

  const update: Record<string, string> = {}
  CAMPOS_PERFIL.forEach(c => { if (body[c] !== undefined) update[c] = body[c] })

  const { data: existing } = await supabase
    .from('configuracoes')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('configuracoes')
      .update(update)
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('configuracoes')
      .insert({ nome_escritorio: 'Meu Escritório', ...update })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
