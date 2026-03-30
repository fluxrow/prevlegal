import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

function inferirRiscoOperacional({
  totalLeads,
  totalUsuarios,
  usuariosAtivos7d,
  conversas7d,
  agendamentosPendentes,
  totalCampanhas,
}: {
  totalLeads: number
  totalUsuarios: number
  usuariosAtivos7d: number
  conversas7d: number
  agendamentosPendentes: number
  totalCampanhas: number
}) {
  if (totalLeads === 0 || totalUsuarios === 0 || usuariosAtivos7d === 0) {
    return {
      nivel: 'alto',
      resumo: 'Tenant com baixa adoção recente ou onboarding incompleto.',
    }
  }

  if (conversas7d === 0 && agendamentosPendentes === 0 && totalCampanhas === 0) {
    return {
      nivel: 'medio',
      resumo: 'Tenant com base pronta, mas com operação recente muito baixa.',
    }
  }

  return {
    nivel: 'baixo',
    resumo: 'Tenant operando com sinais saudáveis de uso recente.',
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!await verificarAdminReauthRecente()) {
    return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })
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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalLeads },
    { count: leadsConvertidos },
    { count: totalConversas },
    { data: conversasHumanoData },
    { count: totalCampanhas },
    { count: totalContratos },
    { data: receitaData },
    { count: portalNaoLidas },
    { count: totalAgendamentos },
    { count: totalUsuarios },
    { data: ultimasConversas },
    { data: ultimosCampanhas },
    { count: conversas7d },
    { count: agendamentosPendentes },
    { data: usuariosAtividade },
  ] = await Promise.all([
    adminSupabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    adminSupabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('status', 'converted'),
    adminSupabase.from('conversas').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    adminSupabase.from('conversas').select('id, status').eq('tenant_id', id).in('status', ['humano', 'aguardando_cliente']),
    adminSupabase.from('campanhas').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    adminSupabase.from('contratos').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    adminSupabase.from('contratos').select('honorario_contratual, honorario_sucumbencia').eq('tenant_id', id),
    adminSupabase.from('portal_mensagens').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('remetente', 'cliente').eq('lida', false),
    adminSupabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    adminSupabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    adminSupabase
      .from('conversas')
      .select('telefone, ultima_mensagem, ultima_mensagem_at, status')
      .eq('tenant_id', id)
      .order('ultima_mensagem_at', { ascending: false })
      .limit(5),
    adminSupabase
      .from('campanhas')
      .select('nome, status, total_enviados, total_convertidos, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
    adminSupabase
      .from('conversas')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .gte('ultima_mensagem_at', sevenDaysAgo),
    adminSupabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .in('status', ['agendado', 'confirmado', 'remarcado']),
    adminSupabase
      .from('usuarios')
      .select('id, ultimo_acesso')
      .eq('tenant_id', id),
  ])

  const receitaTotal = (receitaData || []).reduce((acc: number, contrato: { honorario_contratual?: number | null; honorario_sucumbencia?: number | null }) => {
    return acc + Number(contrato.honorario_contratual || 0) + Number(contrato.honorario_sucumbencia || 0)
  }, 0)

  const ultimoAcessoEquipe = (usuariosAtividade || [])
    .map((usuario) => usuario.ultimo_acesso)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null

  const usuariosAtivos7d = (usuariosAtividade || []).filter((usuario) => {
    if (!usuario.ultimo_acesso) return false
    return new Date(usuario.ultimo_acesso).getTime() >= new Date(sevenDaysAgo).getTime()
  }).length

  const risco = inferirRiscoOperacional({
    totalLeads: totalLeads || 0,
    totalUsuarios: totalUsuarios || 0,
    usuariosAtivos7d,
    conversas7d: conversas7d || 0,
    agendamentosPendentes: agendamentosPendentes || 0,
    totalCampanhas: totalCampanhas || 0,
  })

  return NextResponse.json({
    tenant,
    metricas: {
      totalLeads: totalLeads || 0,
      leadsConvertidos: leadsConvertidos || 0,
      taxaConversao: totalLeads ? (((leadsConvertidos || 0) / totalLeads) * 100).toFixed(1) : '0',
      totalConversas: totalConversas || 0,
      conversasHumano: conversasHumanoData?.length || 0,
      totalCampanhas: totalCampanhas || 0,
      totalContratos: totalContratos || 0,
      receitaTotal,
      portalNaoLidas: portalNaoLidas || 0,
      totalAgendamentos: totalAgendamentos || 0,
      totalUsuarios: totalUsuarios || 0,
      ultimoAcessoEquipe,
      usuariosAtivos7d,
      conversas7d: conversas7d || 0,
      agendamentosPendentes: agendamentosPendentes || 0,
      riscoOperacional: risco.nivel,
      resumoSaude: risco.resumo,
    },
    ultimasConversas: ultimasConversas || [],
    ultimosCampanhas: ultimosCampanhas || [],
  })
}
