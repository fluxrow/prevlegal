import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUsuarioLogado, soAdmin } from '@/lib/auth-role'

export async function GET() {
  const supabase = await createClient()
  const usuario = await getUsuarioLogado()
  if (!usuario) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo, convidado_em, ultimo_acesso')
    .order('convidado_em', { ascending: true })

  const { data: convites } = await supabase
    .from('convites')
    .select('id, email, role, aceito, expires_at, created_at')
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ usuarios: usuarios || [], convites: convites || [], role: usuario.role })
}

export async function PATCH(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario || !soAdmin(usuario.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { id, role, ativo } = await request.json()

  if (id === usuario.id) return NextResponse.json({ error: 'Não é possível alterar seu próprio perfil aqui' }, { status: 400 })

  const { data, error } = await supabase
    .from('usuarios')
    .update({ role, ativo })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ usuario: data })
}
