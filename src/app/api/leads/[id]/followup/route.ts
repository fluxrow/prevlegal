import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, canAccessLeadId } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const service = createAdminSupabase()
  const { data, error } = await service
    .from('followup_runs')
    .select(`
      id, status, proximo_step_ordem, proximo_envio_at, motivo_parada, created_at, updated_at,
      followup_rules(id, nome, descricao),
      followup_events(id, tipo, step_ordem, mensagem_enviada, canal, metadata, created_at)
    `)
    .eq('lead_id', id)
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json() as { rule_id: string }
  if (!body.rule_id) return NextResponse.json({ error: 'rule_id obrigatório' }, { status: 400 })

  const service = createAdminSupabase()

  // Valida rule pertence ao tenant
  const { data: rule } = await service
    .from('followup_rules')
    .select('id, followup_rule_steps(ordem, delay_horas)')
    .eq('id', body.rule_id)
    .eq('tenant_id', context.tenantId)
    .eq('ativo', true)
    .single()

  if (!rule) return NextResponse.json({ error: 'Regra não encontrada ou inativa' }, { status: 404 })

  // Garante que não há run ativa para este lead (unique index)
  const { data: runAtiva } = await service
    .from('followup_runs')
    .select('id')
    .eq('lead_id', id)
    .eq('status', 'ativo')
    .maybeSingle()

  if (runAtiva) return NextResponse.json({ error: 'Já existe um follow-up ativo para este lead' }, { status: 409 })

  // Calcula primeiro envio com base no delay do step 1
  const primeiroStep = (rule.followup_rule_steps as { ordem: number; delay_horas: number }[])
    ?.sort((a, b) => a.ordem - b.ordem)[0]
  const proximoEnvioAt = primeiroStep
    ? new Date(Date.now() + primeiroStep.delay_horas * 3600 * 1000).toISOString()
    : null

  const { data: run, error: runError } = await service
    .from('followup_runs')
    .insert({
      tenant_id: context.tenantId,
      lead_id: id,
      rule_id: body.rule_id,
      iniciado_por: context.usuarioId,
      proximo_envio_at: proximoEnvioAt,
    })
    .select()
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  // Registra evento de início
  await service.from('followup_events').insert({
    tenant_id: context.tenantId,
    run_id: run.id,
    lead_id: id,
    tipo: 'iniciado',
    metadata: { iniciado_por: context.usuarioId, rule_id: body.rule_id },
  })

  return NextResponse.json(run, { status: 201 })
}
