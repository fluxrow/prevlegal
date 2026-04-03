import { NextRequest, NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase, getOrCreateLeadThread, getTenantUsuariosMap } from '@/lib/internal-collaboration'

function normalizeMessage(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const mensagem = normalizeMessage(body.mensagem)
  if (!mensagem) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })

  const supabase = createAdminSupabase()
  const thread = await getOrCreateLeadThread(supabase, {
    tenantId: context.tenantId,
    leadId: id,
    usuarioId: context.usuarioId,
  })

  const { data, error } = await supabase
    .from('lead_mensagens_internas')
    .insert({
      tenant_id: context.tenantId,
      thread_id: thread.id,
      lead_id: id,
      autor_usuario_id: context.usuarioId,
      tipo: 'comentario',
      mensagem,
      metadata: {},
    })
    .select('id, autor_usuario_id, tipo, mensagem, metadata, created_at')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Erro ao salvar comentário' }, { status: 500 })

  const usuariosMap = await getTenantUsuariosMap(supabase, context.tenantId, [data.autor_usuario_id])

  return NextResponse.json({
    mensagem: {
      ...data,
      autor: data.autor_usuario_id ? usuariosMap.get(data.autor_usuario_id) || null : null,
    },
  })
}
