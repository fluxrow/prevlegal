import { NextRequest, NextResponse } from 'next/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase, getOrCreateLeadThread, getTenantUsuariosMap } from '@/lib/internal-collaboration'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const supabase = createAdminSupabase()
  const thread = await getOrCreateLeadThread(supabase, {
    tenantId: context.tenantId,
    leadId: id,
    usuarioId: context.usuarioId,
  })

  const [mensagensRes, tasksRes, handoffsRes, usuariosRes] = await Promise.all([
    supabase
      .from('lead_mensagens_internas')
      .select('id, autor_usuario_id, tipo, mensagem, metadata, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('lead_tasks')
      .select('id, titulo, descricao, status, prioridade, assigned_to, created_by, due_at, created_at, completed_at')
      .eq('lead_id', id)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('lead_handoffs')
      .select('id, from_usuario_id, to_usuario_id, motivo, status_destino, created_at')
      .eq('lead_id', id)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('usuarios')
      .select('id, nome, email, role')
      .eq('tenant_id', context.tenantId)
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ])

  if (mensagensRes.error) return NextResponse.json({ error: mensagensRes.error.message }, { status: 500 })
  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 })
  if (handoffsRes.error) return NextResponse.json({ error: handoffsRes.error.message }, { status: 500 })
  if (usuariosRes.error) return NextResponse.json({ error: usuariosRes.error.message }, { status: 500 })

  const mensagens = mensagensRes.data || []
  const tasks = tasksRes.data || []
  const handoffs = handoffsRes.data || []
  const usuarios = usuariosRes.data || []

  const usuariosMap = await getTenantUsuariosMap(supabase, context.tenantId, [
    thread.current_owner_usuario_id,
    ...mensagens.map((mensagem) => mensagem.autor_usuario_id),
    ...tasks.flatMap((task) => [task.assigned_to, task.created_by]),
    ...handoffs.flatMap((handoff) => [handoff.from_usuario_id, handoff.to_usuario_id]),
  ])

  return NextResponse.json({
    thread: {
      ...thread,
      current_owner: thread.current_owner_usuario_id ? usuariosMap.get(thread.current_owner_usuario_id) || null : null,
    },
    mensagens: mensagens.map((mensagem) => ({
      ...mensagem,
      autor: mensagem.autor_usuario_id ? usuariosMap.get(mensagem.autor_usuario_id) || null : null,
    })),
    tasks: tasks.map((task) => ({
      ...task,
      assigned_to_usuario: task.assigned_to ? usuariosMap.get(task.assigned_to) || null : null,
      created_by_usuario: task.created_by ? usuariosMap.get(task.created_by) || null : null,
    })),
    handoffs: handoffs.map((handoff) => ({
      ...handoff,
      from_usuario: handoff.from_usuario_id ? usuariosMap.get(handoff.from_usuario_id) || null : null,
      to_usuario: handoff.to_usuario_id ? usuariosMap.get(handoff.to_usuario_id) || null : null,
    })),
    usuarios,
    current_user_id: context.usuarioId,
  })
}
