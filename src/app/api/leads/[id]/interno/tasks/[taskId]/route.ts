import { NextRequest, NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase, getTenantUsuarioById, getTenantUsuariosMap } from '@/lib/internal-collaboration'

const ALLOWED_STATUS = new Set(['aberta', 'em_andamento', 'concluida', 'cancelada'])
const ALLOWED_PRIORITIES = new Set(['baixa', 'media', 'alta'])

function normalizeTrimmed(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id, taskId } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const payload: Record<string, unknown> = {}

  const status = normalizeTrimmed(body.status)
  if (status) {
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }
    payload.status = status
    payload.completed_at = status === 'concluida' ? new Date().toISOString() : null
  }

  const prioridade = normalizeTrimmed(body.prioridade)
  if (prioridade) {
    if (!ALLOWED_PRIORITIES.has(prioridade)) {
      return NextResponse.json({ error: 'Prioridade inválida' }, { status: 400 })
    }
    payload.prioridade = prioridade
  }

  if (body.assigned_to !== undefined) {
    payload.assigned_to = normalizeTrimmed(body.assigned_to)
  }

  if (body.titulo !== undefined) {
    const titulo = normalizeTrimmed(body.titulo)
    if (!titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
    payload.titulo = titulo
  }

  if (body.descricao !== undefined) {
    payload.descricao = normalizeTrimmed(body.descricao)
  }

  if (body.due_at !== undefined) {
    payload.due_at = normalizeTrimmed(body.due_at)
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Atualização inválida' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  if (typeof payload.assigned_to === 'string') {
    const usuarioDestino = await getTenantUsuarioById(supabase, context.tenantId, payload.assigned_to)
    if (!usuarioDestino?.ativo) {
      return NextResponse.json({ error: 'Responsável inválido para este tenant' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('lead_tasks')
    .update(payload)
    .eq('id', taskId)
    .eq('lead_id', id)
    .eq('tenant_id', context.tenantId)
    .select('id, titulo, descricao, status, prioridade, assigned_to, created_by, due_at, created_at, completed_at')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Tarefa não encontrada' }, { status: 500 })

  const usuariosMap = await getTenantUsuariosMap(supabase, context.tenantId, [data.assigned_to, data.created_by])

  return NextResponse.json({
    task: {
      ...data,
      assigned_to_usuario: data.assigned_to ? usuariosMap.get(data.assigned_to) || null : null,
      created_by_usuario: data.created_by ? usuariosMap.get(data.created_by) || null : null,
    },
  })
}
