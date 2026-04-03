import { NextRequest, NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import {
  createAdminSupabase,
  getOrCreateLeadThread,
  getTenantUsuarioById,
  getTenantUsuariosMap,
} from '@/lib/internal-collaboration'

function normalizeTrimmed(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeDueAt(value: unknown) {
  const normalized = normalizeTrimmed(value)
  return normalized || null
}

const ALLOWED_PRIORITIES = new Set(['baixa', 'media', 'alta'])

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
  const titulo = normalizeTrimmed(body.titulo)
  if (!titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const prioridade = normalizeTrimmed(body.prioridade) || 'media'
  if (!ALLOWED_PRIORITIES.has(prioridade)) {
    return NextResponse.json({ error: 'Prioridade inválida' }, { status: 400 })
  }

  const assignedTo = normalizeTrimmed(body.assigned_to)
  const supabase = createAdminSupabase()
  if (assignedTo) {
    const usuarioDestino = await getTenantUsuarioById(supabase, context.tenantId, assignedTo)
    if (!usuarioDestino?.ativo) {
      return NextResponse.json({ error: 'Responsável inválido para este tenant' }, { status: 400 })
    }
  }

  const thread = await getOrCreateLeadThread(supabase, {
    tenantId: context.tenantId,
    leadId: id,
    usuarioId: context.usuarioId,
    currentOwnerUsuarioId: assignedTo || context.usuarioId,
  })

  const { data, error } = await supabase
    .from('lead_tasks')
    .insert({
      tenant_id: context.tenantId,
      lead_id: id,
      thread_id: thread.id,
      titulo,
      descricao: normalizeTrimmed(body.descricao),
      status: 'aberta',
      prioridade,
      assigned_to: assignedTo,
      created_by: context.usuarioId,
      due_at: normalizeDueAt(body.due_at),
    })
    .select('id, titulo, descricao, status, prioridade, assigned_to, created_by, due_at, created_at, completed_at')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Erro ao criar tarefa' }, { status: 500 })

  const usuariosMap = await getTenantUsuariosMap(supabase, context.tenantId, [data.assigned_to, data.created_by])

  return NextResponse.json({
    task: {
      ...data,
      assigned_to_usuario: data.assigned_to ? usuariosMap.get(data.assigned_to) || null : null,
      created_by_usuario: data.created_by ? usuariosMap.get(data.created_by) || null : null,
    },
  })
}
