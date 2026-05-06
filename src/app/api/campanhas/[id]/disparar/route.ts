export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import {
  getCampaignDispatchDiagnostics,
  processCampaignDispatchStep,
} from '@/lib/campaign-dispatch'

type CampaignDispatchClient = Parameters<typeof getCampaignDispatchDiagnostics>[0]

type CampaignRow = {
  id: string
  tenant_id: string | null
  nome: string | null
  lista_id: string | null
  agente_id?: string | null
  whatsapp_number_id?: string | null
  mensagem_template: string
  status: string | null
  limite_diario: number | null
  tamanho_lote: number | null
  pausa_entre_lotes_s: number | null
  delay_min_ms: number | null
  delay_max_ms: number | null
  apenas_verificados: boolean | null
  contato_alvo_tipo?: string | null
  iniciado_em?: string | null
  total_enviados?: number | null
  total_falhos?: number | null
  total_contatados?: number | null
  agendado_para?: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Erro desconhecido')
}

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!context.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { id: campanhaId } = await params

    let campanhaQuery = adminClient
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
    campanhaQuery = context.tenantId
      ? campanhaQuery.eq('tenant_id', context.tenantId)
      : campanhaQuery.is('tenant_id', null)

    const { data: campanha, error: campErr } = await campanhaQuery.single()
    if (campErr || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (!['rascunho', 'pausada', 'ativa', 'agendada'].includes(campanha.status)) {
      return NextResponse.json(
        { error: `Campanha já está ${campanha.status}` },
        { status: 400 },
      )
    }

    const campaign = campanha as CampaignRow
    const dispatchClient = adminClient as unknown as CampaignDispatchClient
    const diagnosticsBeforeStart = await getCampaignDispatchDiagnostics(dispatchClient, campaign)

    const now = new Date().toISOString()
    if (campaign.status !== 'ativa') {
      await adminClient
        .from('campanhas')
        .update({
          status: 'ativa',
          iniciado_em:
            campaign.status === 'rascunho' || campaign.status === 'agendada'
              ? now
              : campaign.iniciado_em || now,
          agendado_para: now,
          updated_at: now,
        })
        .eq('id', campaign.id)
        .eq('tenant_id', campaign.tenant_id)
    }

    const activeCampaign: CampaignRow = {
      ...campaign,
      status: 'ativa',
      iniciado_em:
        campaign.status === 'rascunho' || campaign.status === 'agendada'
          ? now
          : campaign.iniciado_em || now,
      agendado_para: now,
    }

    const firstStep = await processCampaignDispatchStep(dispatchClient, activeCampaign)

    return NextResponse.json({
      success: true,
      workerDriven: true,
      campaignId: campaign.id,
      diagnostics: diagnosticsBeforeStart,
      firstStep,
      message:
        'Campanha iniciada em modo resiliente. O primeiro envio foi processado agora e os próximos seguem pelo worker sem depender de uma requisição longa.',
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
