import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUsuarioLogado, hasPermission } from '@/lib/auth-role'

export async function POST(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario || !hasPermission(usuario, 'usuarios_manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const supabase = await createClient()
  const { email, role } = await request.json()

  if (!email || !role) return NextResponse.json({ error: 'Email e role são obrigatórios' }, { status: 400 })

  // Verifica se já existe usuário com esse email
  const { data: existente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single()

  if (existente) return NextResponse.json({ error: 'Já existe um usuário com esse email' }, { status: 400 })

  const { data, error } = await supabase
    .from('convites')
    .insert({ email, role, convidado_por: usuario.id, tenant_id: usuario.tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'
  const urlConvite = `${baseUrl}/auth/aceitar-convite?token=${data.token}`

  return NextResponse.json({ convite: data, url: urlConvite })
}

export async function DELETE(request: Request) {
  const usuario = await getUsuarioLogado()
  if (!usuario || !hasPermission(usuario, 'usuarios_manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!usuario.tenant_id) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const supabase = await createClient()
  const { id } = await request.json()
  await supabase.from('convites').delete().eq('id', id).eq('tenant_id', usuario.tenant_id)
  return NextResponse.json({ ok: true })
}
