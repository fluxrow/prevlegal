import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .limit(1)
    .single()

  if (error) return NextResponse.json(null)
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  try {
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminSupabase()
    const body = await request.json()
    body.updated_at = new Date().toISOString()

    const { data: existing } = await supabase
      .from('configuracoes')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existing) {
      result = await supabase.from('configuracoes').update(body).eq('id', existing.id)
    } else {
      result = await supabase.from('configuracoes').insert({ nome_escritorio: 'Meu Escritório', ...body })
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
