import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const { id } = await params
  const body = await request.json() as { steps: { ordem: number; delay_horas: number; canal: string; mensagem: string }[] }

  if (!body.steps?.length) return NextResponse.json({ error: 'Pelo menos um passo é obrigatório' }, { status: 400 })

  const service = createAdminSupabase()

  // Valida que a rule pertence ao tenant
  const { data: rule } = await service
    .from('followup_rules')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .single()

  if (!rule) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })

  await service.from('followup_rule_steps').delete().eq('rule_id', id)

  const steps = body.steps.map(s => ({
    rule_id: id,
    tenant_id: context.tenantId!,
    ordem: s.ordem,
    delay_horas: s.delay_horas,
    canal: s.canal,
    mensagem: s.mensagem,
  }))

  const { data, error } = await service.from('followup_rule_steps').insert(steps).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
