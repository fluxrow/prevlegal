import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import {
  getCampaignSystemTemplates,
  normalizeCampaignTemplateAgentType,
  normalizeCampaignTemplateContactTarget,
  normalizeCampaignTemplateOperationProfile,
} from '@/lib/campaign-message-templates'

function isMissingCampaignTemplatesTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code || '') : ''
  const message = 'message' in error ? String(error.message || '').toLowerCase() : ''
  return code === '42P01' || message.includes('campaign_message_templates')
}

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function canManageCampaignTemplates(
  context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
) {
  return contextHasPermission(context, 'configuracoes_manage')
}

export async function GET(request: NextRequest) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)

  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canManageCampaignTemplates(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminSupabase = createAdminClient()
  const operationProfile = normalizeCampaignTemplateOperationProfile(
    request.nextUrl.searchParams.get('operation_profile'),
  )
  const contactTargetType = normalizeCampaignTemplateContactTarget(
    request.nextUrl.searchParams.get('contato_alvo_tipo'),
  )

  const { data, error } = await adminSupabase
    .from('campaign_message_templates')
    .select('*')
    .eq('tenant_id', context.tenantId)
    .order('ativo', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    if (isMissingCampaignTemplatesTableError(error)) {
      return NextResponse.json({
        templates: [],
        systemTemplates: getCampaignSystemTemplates(operationProfile, contactTargetType),
        foundationMissing: true,
        foundationMessage: 'A base de templates customizados ainda não foi aplicada no banco deste tenant.',
      })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    templates: data || [],
    systemTemplates: getCampaignSystemTemplates(operationProfile, contactTargetType),
  })
}

export async function POST(request: NextRequest) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)

  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  if (!canManageCampaignTemplates(context)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const nome = String(body.nome || '').trim()
  const mensagem = String(body.mensagem || '').trim()
  const perfilOperacao = normalizeCampaignTemplateOperationProfile(body.perfil_operacao)
  const agenteTipo = normalizeCampaignTemplateAgentType(body.agente_tipo)
  const contatoAlvoTipo = normalizeCampaignTemplateContactTarget(body.contato_alvo_tipo)
  const ativo = body.ativo !== false

  if (!nome || !mensagem) {
    return NextResponse.json({ error: 'nome e mensagem são obrigatórios' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('campaign_message_templates')
    .insert({
      tenant_id: context.tenantId,
      nome,
      mensagem,
      perfil_operacao: perfilOperacao,
      agente_tipo: agenteTipo,
      contato_alvo_tipo: contatoAlvoTipo,
      ativo,
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingCampaignTemplatesTableError(error)) {
      return NextResponse.json(
        { error: 'A base de templates customizados ainda não foi aplicada no banco. Aplique a migration antes de criar templates do escritório.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data })
}
