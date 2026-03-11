import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/get-user-role'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ usuarios: data })
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { nome, email, password, role } = await request.json()

  if (!nome || !email || !password || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, email, password, role' }, { status: 400 })
  }
  if (!['admin', 'operador'].includes(role)) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
  }

  // Criar usuário no auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Inserir na tabela usuarios
  const { data: novoUsuario, error: dbError } = await adminClient
    .from('usuarios')
    .insert({ nome, email, role, auth_id: authData.user.id, ativo: true })
    .select()
    .single()

  if (dbError) {
    // Rollback: deletar do auth
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, usuario: novoUsuario })
}
