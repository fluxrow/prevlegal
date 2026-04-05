import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const service = createAdminSupabase()
  const { data, error } = await service
    .from('followup_rules')
    .select('id, nome, descricao, ativo, is_default, created_at, followup_rule_steps(id, ordem, delay_horas, canal, mensagem)')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não configurado' }, { status: 409 })

  const body = await request.json() as {
    nome: string
    descricao?: string
    steps: { ordem: number; delay_horas: number; canal: string; mensagem: string }[]
  }

  if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!body.steps?.length) return NextResponse.json({ error: 'Pelo menos um passo é obrigatório' }, { status: 400 })

  const service = createAdminSupabase()

  const { data: rule, error: ruleError } = await service
    .from('followup_rules')
    .insert({ tenant_id: context.tenantId, nome: body.nome.trim(), descricao: body.descricao || null, created_by: context.usuarioId })
    .select()
    .single()

  if (ruleError) return NextResponse.json({ error: ruleError.message }, { status: 500 })

  const steps = body.steps.map(s => ({
    rule_id: rule.id,
    tenant_id: context.tenantId!,
    ordem: s.ordem,
    delay_horas: s.delay_horas,
    canal: s.canal,
    mensagem: s.mensagem,
  }))

  const { error: stepsError } = await service.from('followup_rule_steps').insert(steps)
  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 })

  return NextResponse.json(rule, { status: 201 })
}
