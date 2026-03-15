import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, role')
    .eq('auth_id', user.id)
    .limit(1)
    .single()
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { data: perfil } = await supabase
    .from('advogados')
    .select('*')
    .eq('usuario_id', usuario.id)
    .limit(1)
    .single()

  return NextResponse.json({ perfil: perfil || {}, usuario })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .limit(1)
    .single()
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const body = await request.json()
  const campos = [
    'nome', 'email', 'telefone', 'cpf', 'oab_numero', 'oab_estado',
    'oab_tipo', 'oab_situacao', 'escritorio_nome', 'escritorio_cnpj',
    'escritorio_endereco', 'escritorio_cidade', 'escritorio_estado',
    'escritorio_cep', 'escritorio_telefone', 'escritorio_email',
    'assinatura_texto', 'assinatura_rodape',
  ]
  const update: Record<string, string> = { updated_at: new Date().toISOString() }
  campos.forEach(c => { if (body[c] !== undefined) update[c] = body[c] })

  const { data, error } = await supabase
    .from('advogados')
    .upsert({ usuario_id: usuario.id, ...update }, { onConflict: 'usuario_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.nome) {
    await supabase.from('usuarios').update({ nome: body.nome }).eq('id', usuario.id)
  }

  return NextResponse.json({ perfil: data })
}
