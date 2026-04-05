export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH /api/campanhas/[id] — atualiza campos editáveis da campanha (inclui agente_id da Fase D)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    // Verificar pertença ao tenant
    const { data: existing } = await adminClient
      .from('campanhas')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', context.tenantId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    const body = await request.json()

    // Campos editáveis
    const allowed = [
      'nome',
      'mensagem_template',
      'agente_id',       // Fase D — roteamento por campanha
      'delay_min_ms',
      'delay_max_ms',
      'tamanho_lote',
      'pausa_entre_lotes_s',
      'limite_diario',
      'apenas_verificados',
      'agendado_para',
      'status',
    ]

    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key]
      }
    }

    // agente_id aceita null explícito para remover o agente da campanha
    if ('agente_id' in body && body.agente_id === null) {
      updates.agente_id = null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('campanhas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campanha: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/campanhas/[id] — remove campanha em rascunho
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from('campanhas')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', context.tenantId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (existing.status === 'ativa') {
      return NextResponse.json({ error: 'Não é possível excluir uma campanha ativa. Pause-a primeiro.' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('campanhas')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
