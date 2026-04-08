import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getUsuarioLogado, hasPermission } from '@/lib/auth-role'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminClient = createAdminClient()
  const usuarioLogado = await getUsuarioLogado()

  if (!usuarioLogado || !hasPermission(usuarioLogado, 'usuarios_manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (id === usuarioLogado.id) {
    return NextResponse.json({ error: 'Não é possível alterar seu próprio perfil aqui' }, { status: 400 })
  }

  const body = await request.json()
  const allowed = ['nome', 'role', 'ativo', 'permissions']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  const { data, error } = await adminClient
    .from('usuarios')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', usuarioLogado.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, usuario: data })
}
