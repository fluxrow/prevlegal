import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'

function canManageContractTemplates(context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>) {
  return contextHasPermission(context, 'configuracoes_manage') || contextHasPermission(context, 'financeiro_manage')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canManageContractTemplates(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { templateId } = await params
  const body = await request.json()

  const nome = String(body.nome || '').trim()
  const tipo = String(body.tipo || '').trim()
  const corpoHtml = String(body.corpo_html || '').trim()
  const ativo = body.ativo !== false
  const placeholders = Array.isArray(body.placeholders_definidos) ? body.placeholders_definidos : []

  if (!nome || !tipo || !corpoHtml) {
    return NextResponse.json({ error: 'nome, tipo e corpo_html são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('contract_templates')
    .update({
      nome,
      tipo,
      corpo_html: corpoHtml,
      placeholders_definidos: placeholders,
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('tenant_id', context.tenantId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canManageContractTemplates(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { templateId } = await params
  const { error } = await supabase
    .from('contract_templates')
    .delete()
    .eq('id', templateId)
    .eq('tenant_id', context.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
