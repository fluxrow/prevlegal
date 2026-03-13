import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id').eq('auth_id', user.id).single()
  if (!usuario) return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })

  const { data } = await supabase
    .from('configuracoes').select('*').eq('tenant_id', usuario.tenant_id).single()

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id').eq('auth_id', user.id).single()
  if (!usuario) return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('configuracoes')
    .update(body)
    .eq('tenant_id', usuario.tenant_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
