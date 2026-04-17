import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { getContractTemplatePlaceholders } from '@/lib/contract-templates'

function canManageContractTemplates(context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>) {
  return contextHasPermission(context, 'configuracoes_manage') || contextHasPermission(context, 'financeiro_manage')
}

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canManageContractTemplates(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    templates: data || [],
    availablePlaceholders: getContractTemplatePlaceholders(),
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canManageContractTemplates(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    .insert({
      tenant_id: context.tenantId,
      nome,
      tipo,
      corpo_html: corpoHtml,
      placeholders_definidos: placeholders,
      ativo,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
