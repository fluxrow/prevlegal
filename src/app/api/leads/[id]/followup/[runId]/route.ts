import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, canAccessLeadId } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id, runId } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json() as { action: 'pausar' | 'retomar' | 'cancelar' | 'executar_agora'; motivo?: string }
  const service = createAdminSupabase()

  const { data: run } = await service
    .from('followup_runs')
    .select(`
      id,
      status,
      tenant_id,
      lead_id,
      rule_id,
      proximo_step_ordem,
      leads(id, nome, telefone, nb, status),
      followup_rules(id, nome, followup_rule_steps(ordem, delay_horas, canal, mensagem)),
      tenants(id, nome)
    `)
    .eq('id', runId)
    .eq('lead_id', id)
    .eq('tenant_id', context.tenantId)
    .single()

  if (!run) return NextResponse.json({ error: 'Run não encontrada' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  let eventoTipo = ''

  if (body.action === 'executar_agora') {
    if (run.status !== 'ativo') {
      return NextResponse.json({ error: 'Só é possível executar runs ativas' }, { status: 400 })
    }

    const lead = run.leads as unknown as {
      id: string
      nome: string | null
      telefone: string | null
      nb: string | null
      status: string | null
    } | null

    const rule = run.followup_rules as unknown as {
      id: string
      nome: string
      followup_rule_steps: {
        ordem: number
        delay_horas: number
        canal: string
        mensagem: string
      }[]
    } | null

    const tenant = run.tenants as unknown as { id: string; nome: string | null } | null

    if (!lead || !rule) {
      return NextResponse.json({ error: 'Run sem contexto suficiente para execução' }, { status: 400 })
    }

    if (lead.status === 'converted') {
      return NextResponse.json({ error: 'Lead convertido não pode executar follow-up manual' }, { status: 400 })
    }

    const steps = rule.followup_rule_steps?.slice().sort((a, b) => a.ordem - b.ordem) ?? []
    const stepAtual = steps.find((step) => step.ordem === run.proximo_step_ordem)

    if (!stepAtual) {
      return NextResponse.json({ error: 'Nenhum passo encontrado para esta execução' }, { status: 400 })
    }

    const mensagem = stepAtual.mensagem
      .replace(/\{nome\}/g, lead.nome || 'cliente')
      .replace(/\{nb\}/g, lead.nb || '')
      .replace(/\{escritorio\}/g, tenant?.nome || 'escritório')

    try {
      if (stepAtual.canal === 'whatsapp') {
        if (!lead.telefone) {
          throw new Error('Lead sem telefone para disparo via WhatsApp')
        }

        const result = await sendWhatsAppMessage({
          tenantId: context.tenantId,
          to: lead.telefone,
          body: mensagem,
        })

        if (!result.success) {
          throw new Error(result.error || 'Falha ao enviar mensagem WhatsApp')
        }
      }

      const proximoStep = steps.find((step) => step.ordem > run.proximo_step_ordem)
      const runUpdates = proximoStep
        ? {
            proximo_step_ordem: proximoStep.ordem,
            proximo_envio_at: new Date(Date.now() + proximoStep.delay_horas * 3600 * 1000).toISOString(),
          }
        : {
            status: 'concluido',
            proximo_envio_at: null,
          }

      const { data: updatedRun, error: updateError } = await service
        .from('followup_runs')
        .update(runUpdates)
        .eq('id', runId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      await service.from('followup_events').insert({
        tenant_id: context.tenantId,
        run_id: runId,
        lead_id: id,
        tipo: 'step_disparado',
        step_ordem: stepAtual.ordem,
        mensagem_enviada: mensagem,
        canal: stepAtual.canal,
        metadata: {
          disparo_manual: true,
          usuario_id: context.usuarioId,
          proximo_step: proximoStep?.ordem ?? null,
        },
      })

      if (!proximoStep) {
        await service.from('followup_events').insert({
          tenant_id: context.tenantId,
          run_id: runId,
          lead_id: id,
          tipo: 'concluido',
          metadata: { disparo_manual: true, usuario_id: context.usuarioId },
        })
      }

      return NextResponse.json(updatedRun)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar follow-up'

      await service.from('followup_events').insert({
        tenant_id: context.tenantId,
        run_id: runId,
        lead_id: id,
        tipo: 'step_falhou',
        step_ordem: stepAtual.ordem,
        canal: stepAtual.canal,
        metadata: {
          disparo_manual: true,
          usuario_id: context.usuarioId,
          erro: message,
        },
      })

      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  if (body.action === 'pausar' && run.status === 'ativo') {
    updates.status = 'pausado'
    updates.pausado_por = context.usuarioId
    eventoTipo = 'pausado'
  } else if (body.action === 'retomar' && run.status === 'pausado') {
    updates.status = 'ativo'
    eventoTipo = 'retomado'
  } else if (body.action === 'cancelar' && ['ativo', 'pausado'].includes(run.status)) {
    updates.status = 'cancelado'
    updates.cancelado_por = context.usuarioId
    updates.motivo_parada = body.motivo || 'Cancelado manualmente'
    eventoTipo = 'cancelado'
  } else {
    return NextResponse.json({ error: 'Ação inválida para o status atual' }, { status: 400 })
  }

  const { data: updated, error } = await service
    .from('followup_runs')
    .update(updates)
    .eq('id', runId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service.from('followup_events').insert({
    tenant_id: context.tenantId,
    run_id: runId,
    lead_id: id,
    tipo: eventoTipo,
    metadata: { usuario_id: context.usuarioId, motivo: body.motivo || null },
  })

  return NextResponse.json(updated)
}
