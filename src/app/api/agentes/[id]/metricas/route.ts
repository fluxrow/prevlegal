export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/agentes/[id]/metricas
// Retorna métricas de performance do agente (Fase D)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authSupabase = await createServerClient()
    const context = await getTenantContext(authSupabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // Verificar que o agente pertence ao tenant
    const { data: agente } = await adminClient
      .from('agentes')
      .select('id, nome_interno, nome_publico, tipo, ativo')
      .eq('id', id)
      .eq('tenant_id', context.tenantId)
      .maybeSingle()

    if (!agente) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    // 1. Total de respostas enviadas por este agente (via agente_respondente_id — Fase D)
    const { count: totalRespostas } = await adminClient
      .from('mensagens_inbound')
      .select('id', { count: 'exact', head: true })
      .eq('agente_respondente_id', id)
      .eq('respondido_por_agente', true)

    // 2. Leads ativos atendidos pelo agente via campanha
    const { count: leadsViaCampanha } = await adminClient
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId)
      .not('campanha_id', 'is', null)
      .in(
        'campanha_id',
        // subconsulta: campanhas com este agente
        adminClient
          .from('campanhas')
          .select('id')
          .eq('agente_id', id) as any
      )

    // 3. Taxa de escalonamento para humano
    // leads cujas conversas foram assumidas por humano após o agente responder
    const { data: mensagensDoAgente } = await adminClient
      .from('mensagens_inbound')
      .select('lead_id')
      .eq('agente_respondente_id', id)
      .eq('respondido_por_agente', true)
      .not('lead_id', 'is', null)
      .limit(500)

    const leadIds = [...new Set((mensagensDoAgente || []).map((m: any) => m.lead_id).filter(Boolean))]

    let taxaEscalonamento = 0
    let escalonamentos = 0

    if (leadIds.length > 0) {
      const { count: conversasEscalonadas } = await adminClient
        .from('conversas')
        .select('id', { count: 'exact', head: true })
        .in('lead_id', leadIds)
        .eq('status', 'humano')

      escalonamentos = conversasEscalonadas || 0
      taxaEscalonamento = leadIds.length > 0
        ? Math.round((escalonamentos / leadIds.length) * 100)
        : 0
    }

    // 4. Campanhas vinculadas
    const { data: campanhasVinculadas } = await adminClient
      .from('campanhas')
      .select('id, nome, status')
      .eq('agente_id', id)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      agente: {
        id: agente.id,
        nome_interno: agente.nome_interno,
        nome_publico: agente.nome_publico,
        tipo: agente.tipo,
        ativo: agente.ativo,
      },
      metricas: {
        total_respostas: totalRespostas || 0,
        leads_via_campanha: leadsViaCampanha || 0,
        total_leads_atendidos: leadIds.length,
        escalonamentos,
        taxa_escalonamento_pct: taxaEscalonamento,
      },
      campanhas: campanhasVinculadas || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
