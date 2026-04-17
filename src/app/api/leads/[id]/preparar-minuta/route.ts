import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePdfFromHtml } from '@/lib/contract-pdf'
import {
  buildContractTemplateData,
  renderContractTemplate,
  type ContractTemplatePreviewLead,
  type ContractTemplatePreviewTenant,
} from '@/lib/contract-templates'
import { canAccessLeadId, contextHasPermission, getTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

function canPrepareMinuta(context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>) {
  return contextHasPermission(context, 'financeiro_manage') || contextHasPermission(context, 'configuracoes_manage')
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

async function loadLeadAndTenant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  tenantId: string,
) {
  const [{ data: lead, error: leadError }, { data: tenant, error: tenantError }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, nome, cpf, telefone, email, nb, data_nascimento, idade')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('tenants')
      .select('id, nome, slug, responsavel_nome, responsavel_email, responsavel_telefone, oab_estado, oab_numero')
      .eq('id', tenantId)
      .single(),
  ])

  if (leadError || !lead) {
    throw new Error(leadError?.message || 'Lead não encontrado')
  }

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message || 'Tenant não encontrado')
  }

  return {
    lead: lead as ContractTemplatePreviewLead & { id: string },
    tenant: tenant as ContractTemplatePreviewTenant & { id: string },
  }
}

async function loadTemplate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('id', templateId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Template não encontrado')
  }

  return data
}

async function createSignedContractUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
) {
  const { data, error } = await supabase.storage
    .from('contratos-leads')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 30)

  if (error) {
    throw new Error(error.message)
  }

  return data.signedUrl
}

async function registerTimelineEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  leadId: string,
  titulo: string,
  descricao: string,
) {
  const { error } = await supabase
    .from('portal_timeline_events')
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      tipo: 'minuta_contrato',
      titulo,
      descricao,
      visivel_cliente: false,
    })

  if (error && error.code !== 'PGRST205') {
    throw new Error(error.message)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canPrepareMinuta(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const templateId = request.nextUrl.searchParams.get('template_id')
  if (!templateId) return NextResponse.json({ error: 'template_id é obrigatório' }, { status: 400 })

  try {
    const [{ lead, tenant }, template] = await Promise.all([
      loadLeadAndTenant(supabase, id, context.tenantId),
      loadTemplate(supabase, templateId, context.tenantId),
    ])

    const placeholderValues = buildContractTemplateData(lead, tenant)
    const renderedHtml = renderContractTemplate(template.corpo_html, placeholderValues)

    return NextResponse.json({
      template,
      preview: {
        values: placeholderValues,
        rendered_html: renderedHtml,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao montar preview' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canPrepareMinuta(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const body = await request.json()
  const templateId = String(body.template_id || '').trim()

  if (!templateId) {
    return NextResponse.json({ error: 'template_id é obrigatório' }, { status: 400 })
  }

  try {
    const [{ lead, tenant }, template] = await Promise.all([
      loadLeadAndTenant(supabase, id, context.tenantId),
      loadTemplate(supabase, templateId, context.tenantId),
    ])

    const placeholderValues = buildContractTemplateData(lead, tenant)
    const renderedHtml = renderContractTemplate(template.corpo_html, placeholderValues)
    const pdfBuffer = await generatePdfFromHtml(renderedHtml)

    const safeLeadName = sanitizeFileName(lead.nome || 'lead')
    const safeTemplateName = sanitizeFileName(template.nome || 'minuta')
    const storagePath = `${id}/minutas/${Date.now()}-${randomUUID()}-${safeTemplateName}-${safeLeadName}.pdf`

    const upload = await supabase.storage
      .from('contratos-leads')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 })
    }

    const signedUrl = await createSignedContractUrl(supabase, storagePath)

    const fileName = `${template.nome} — ${lead.nome}.pdf`
    const { data: documento, error: docError } = await supabase
      .from('lead_documentos')
      .insert({
        tenant_id: context.tenantId,
        lead_id: id,
        nome: template.nome,
        tipo: 'contrato_minuta',
        arquivo_url: signedUrl,
        arquivo_nome: fileName,
        arquivo_tamanho: pdfBuffer.byteLength,
        arquivo_tipo: 'application/pdf',
        descricao: `Minuta preparada a partir do template ${template.nome}`,
        created_by: context.authUserId,
      })
      .select('*')
      .single()

    if (docError) {
      await supabase.storage.from('contratos-leads').remove([storagePath])
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    await registerTimelineEvent(
      supabase,
      context.tenantId,
      id,
      'Minuta de contrato preparada',
      `${template.nome} foi gerada em PDF e está pronta para revisão/envio manual.`,
    )

    return NextResponse.json({
      documento,
      pdf_url: signedUrl,
      storage_path: storagePath,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao preparar minuta' }, { status: 500 })
  }
}
