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
  const { data, error } = await getConfiguracaoAtual(
    configuracoesSupabase,
    context.tenantId,
    'agente_ativo, agente_nome, agente_prompt_sistema, agente_modelo, agente_max_tokens, agente_resposta_automatica, agente_horario_inicio, agente_horario_fim, agente_apenas_dias_uteis',
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminSupabase()
    const configuracoesSupabase = supabase as unknown as ConfiguracoesSupabase
    const body = await request.json()

    const campos = [
      'agente_ativo', 'agente_nome', 'agente_prompt_sistema', 'agente_modelo',
      'agente_max_tokens', 'agente_resposta_automatica', 'agente_horario_inicio',
      'agente_horario_fim', 'agente_apenas_dias_uteis'
    ]

    const updates: Record<string, unknown> = {}
    campos.forEach(c => { if (body[c] !== undefined) updates[c] = body[c] })
    updates.updated_at = new Date().toISOString()

    // Upsert — garante que existe um registro
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

    const result = await supabase.from('configuracoes').update(updates).eq('id', existing.id)

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
