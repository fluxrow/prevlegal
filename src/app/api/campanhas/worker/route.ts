import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processCampaignDispatchStep } from '@/lib/campaign-dispatch'

type CampaignDispatchClient = Parameters<typeof processCampaignDispatchStep>[0]

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
  total_enviados?: number | null
  total_falhos?: number | null
  total_contatados?: number | null
  agendado_para?: string | null
  iniciado_em?: string | null
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const dispatchClient = adminClient as unknown as CampaignDispatchClient
  const now = new Date().toISOString()

  const { data: campaigns, error } = await adminClient
    .from('campanhas')
    .select('*')
    .in('status', ['ativa', 'agendada'])
    .or(`agendado_para.is.null,agendado_para.lte.${now}`)
    .order('agendado_para', { ascending: true, nullsFirst: true })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resultados = []

  for (const campaign of (campaigns || []) as CampaignRow[]) {
    try {
      let activeCampaign = campaign

      if (campaign.status === 'agendada') {
        const { data: activatedCampaign, error: activationError } = await adminClient
          .from('campanhas')
          .update({
            status: 'ativa',
            iniciado_em: campaign.iniciado_em || now,
            agendado_para: now,
            updated_at: now,
          })
          .eq('id', campaign.id)
          .eq('tenant_id', campaign.tenant_id)
          .select('*')
          .single()

        if (activationError || !activatedCampaign) {
          throw new Error(activationError?.message || 'Não foi possível ativar a campanha agendada')
        }

        activeCampaign = activatedCampaign as CampaignRow
      }

      const result = await processCampaignDispatchStep(dispatchClient, activeCampaign)
      resultados.push({
        campaign_id: activeCampaign.id,
        status: result.status,
        lead_id: result.leadId || null,
        next_run_at: result.nextRunAt || null,
        error: result.error || null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      resultados.push({
        campaign_id: campaign.id,
        status: 'erro',
        lead_id: null,
        next_run_at: null,
        error: message,
      })
    }
  }

  return NextResponse.json({
    processados: resultados.length,
    resultados,
  })
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
