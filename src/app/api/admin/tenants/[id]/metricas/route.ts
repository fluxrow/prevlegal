import { NextResponse } from 'next/server'
import { verificarAdminAuth } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant } = await adminSupabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const [
    { count: totalLeads },
    { count: leadsConvertidos },
    { count: totalConversas },
    { count: conversasHumano },
    { count: totalCampanhas },
    { count: totalContratos },
    { data: receitaData },
    { count: portalNaoLidas },
    { count: totalAgendamentos },
    { count: totalUsuarios },
    { data: ultimasConversas },
    { data: ultimosCampanhas },
  ] = await Promise.all([
    adminSupabase.from('leads').select('id', { count: 'exact', head: true }),
    adminSupabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
    adminSupabase.from('conversas').select('id', { count: 'exact', head: true }),
    adminSupabase.from('conversas').select('id', { count: 'exact', head: true }).eq('status', 'humano'),
    adminSupabase.from('campanhas').select('id', { count: 'exact', head: true }),
    adminSupabase.from('contratos').select('id', { count: 'exact', head: true }),
    adminSupabase.from('contratos').select('honorario_contratual, honorario_sucumbencia'),
    adminSupabase.from('portal_mensagens').select('id', { count: 'exact', head: true }).eq('remetente', 'cliente').eq('lida', false),
    adminSupabase.from('agendamentos').select('id', { count: 'exact', head: true }),
    adminSupabase.from('usuarios').select('id', { count: 'exact', head: true }),
    adminSupabase
      .from('conversas')
      .select('telefone, ultima_mensagem, ultima_mensagem_at, status')
      .order('ultima_mensagem_at', { ascending: false })
      .limit(5),
    adminSupabase
      .from('campanhas')
      .select('nome, status, total_enviados, total_convertidos, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const receitaTotal = (receitaData || []).reduce((acc: number, contrato: { honorario_contratual?: number | null; honorario_sucumbencia?: number | null }) => {
    return acc + Number(contrato.honorario_contratual || 0) + Number(contrato.honorario_sucumbencia || 0)
  }, 0)

  return NextResponse.json({
    tenant,
    metricas: {
      totalLeads: totalLeads || 0,
      leadsConvertidos: leadsConvertidos || 0,
      taxaConversao: totalLeads ? (((leadsConvertidos || 0) / totalLeads) * 100).toFixed(1) : '0',
      totalConversas: totalConversas || 0,
      conversasHumano: conversasHumano || 0,
      totalCampanhas: totalCampanhas || 0,
      totalContratos: totalContratos || 0,
      receitaTotal,
      portalNaoLidas: portalNaoLidas || 0,
      totalAgendamentos: totalAgendamentos || 0,
      totalUsuarios: totalUsuarios || 0,
    },
    ultimasConversas: ultimasConversas || [],
    ultimosCampanhas: ultimosCampanhas || [],
  })
}
