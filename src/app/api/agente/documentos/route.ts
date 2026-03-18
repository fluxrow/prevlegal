import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function createServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const serviceSupabase = createServiceSupabase()
  const { data, error } = await serviceSupabase
    .from('agent_documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  try {
    const serviceSupabase = createServiceSupabase()
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()

    let usuario_id: string | null = null
    if (user) {
      const { data: u } = await serviceSupabase
        .from('usuarios').select('id').eq('auth_id', user.id).single()
      usuario_id = u?.id ?? null
    }

    const { data, error } = await serviceSupabase
      .from('agent_documents')
      .insert({ ...body, usuario_id })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const serviceSupabase = createServiceSupabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await serviceSupabase
    .from('agent_documents')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
