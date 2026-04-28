import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureConfiguracaoAtual, getConfiguracaoAtual } from '@/lib/configuracoes'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Erro desconhecido')
}

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type ConfiguracoesSupabase = Parameters<typeof getConfiguracaoAtual>[0]

export async function GET() {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabase()
  const configuracoesSupabase = supabase as unknown as ConfiguracoesSupabase
  const { data, error } = await getConfiguracaoAtual(configuracoesSupabase, context.tenantId)

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
    const configuracoesSupabase = supabase as unknown as ConfiguracoesSupabase
    const body = await request.json()
    body.updated_at = new Date().toISOString()

    const { data: existing, error: ensureError } = await ensureConfiguracaoAtual(
      configuracoesSupabase,
      context.tenantId,
    )

    if (ensureError || !existing) {
      return NextResponse.json(
        { error: ensureError?.message || 'Falha ao preparar configuracoes' },
        { status: 500 },
      )
    }

    const result = await supabase.from('configuracoes').update(body).eq('id', existing.id)

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
