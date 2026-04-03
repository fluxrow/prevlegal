import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getTenantContext } from '@/lib/tenant-context'

function createServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getTenantUsuarioIds(
  serviceSupabase: ReturnType<typeof createServiceSupabase>,
  tenantId: string | null,
) {
  if (!tenantId) return []

  const { data, error } = await serviceSupabase
    .from('usuarios')
    .select('id')
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((usuario) => usuario.id)
}

export async function GET() {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json([])

  const serviceSupabase = createServiceSupabase()
  const usuarioIds = await getTenantUsuarioIds(serviceSupabase, context.tenantId)
  if (usuarioIds.length === 0) return NextResponse.json([])

  const { data, error } = await serviceSupabase
    .from('agent_documents')
    .select('*')
    .in('usuario_id', usuarioIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  try {
    const serviceSupabase = createServiceSupabase()
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const { data, error } = await serviceSupabase
      .from('agent_documents')
      .insert({ ...body, usuario_id: context.usuarioId })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const serviceSupabase = createServiceSupabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const usuarioIds = await getTenantUsuarioIds(serviceSupabase, context.tenantId)
  if (usuarioIds.length === 0) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const { data: existing, error: existingError } = await serviceSupabase
    .from('agent_documents')
    .select('id')
    .eq('id', id)
    .in('usuario_id', usuarioIds)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const { error } = await serviceSupabase
    .from('agent_documents')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
