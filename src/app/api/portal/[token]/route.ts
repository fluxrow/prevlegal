import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { resolvePortalViewer } from '@/lib/portal-auth'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normalizeBranding(payload: {
  tenantNome?: string | null
  responsavelEmail?: string | null
  responsavelTelefone?: string | null
  nomeEscritorio?: string | null
  logoUrl?: string | null
  corPrimaria?: string | null
}) {
  return {
    nome_escritorio: payload.nomeEscritorio || payload.tenantNome || 'PrevLegal',
    logo_url: payload.logoUrl || null,
    cor_primaria: payload.corPrimaria || '#4f7aff',
    contato_email: payload.responsavelEmail || null,
    contato_telefone: payload.responsavelTelefone || null,
  }
}

type TimelineEvent = {
  id: string
  tipo: string
  titulo: string
  descricao: string | null
  created_at: string
}

function isMissingRelation(error?: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('does not exist') || false
}

function buildDerivedTimeline({
  lead,
  documentos,
  mensagens,
  agendamentos,
}: {
  lead: { id: string; created_at: string; status: string }
  documentos: Array<{ id: string; nome: string; tipo_documento?: string | null; tipo?: string | null; created_at: string }>
  mensagens: Array<{ id: string; remetente: string; mensagem: string; created_at: string }>
  agendamentos: Array<{ id: string; data_hora: string; status: string; observacoes?: string | null }>
}): TimelineEvent[] {
  const agendamentoLabel: Record<string, { titulo: string; descricao: string }> = {
    agendado: { titulo: 'Consulta agendada', descricao: 'Sua consulta foi registrada no sistema.' },
    confirmado: { titulo: 'Consulta confirmada', descricao: 'A equipe confirmou sua consulta.' },
    remarcado: { titulo: 'Consulta remarcada', descricao: 'A data da consulta foi atualizada.' },
    realizado: { titulo: 'Consulta realizada', descricao: 'Seu atendimento em reunião foi concluído.' },
    cancelado: { titulo: 'Consulta cancelada', descricao: 'A consulta foi cancelada.' },
  }

  const eventos: TimelineEvent[] = [
    {
      id: `lead-${lead.id}`,
      tipo: 'caso_recebido',
      titulo: 'Caso recebido',
      descricao: 'Seu atendimento foi aberto e entrou em análise.',
      created_at: lead.created_at,
    },
    ...documentos.map((documento) => ({
      id: `documento-${documento.id}`,
      tipo: 'documento_compartilhado',
      titulo: 'Documento disponível no portal',
      descricao: documento.nome,
      created_at: documento.created_at,
    })),
    ...mensagens.map((mensagem) => ({
      id: `mensagem-${mensagem.id}`,
      tipo: mensagem.remetente === 'cliente' ? 'mensagem_cliente' : 'mensagem_escritorio',
      titulo:
        mensagem.remetente === 'cliente'
          ? 'Você enviou uma mensagem'
          : 'A equipe enviou uma mensagem',
      descricao: mensagem.mensagem.slice(0, 120),
      created_at: mensagem.created_at,
    })),
    ...agendamentos.map((agendamento) => ({
      id: `agendamento-${agendamento.id}`,
      tipo: `agendamento_${agendamento.status}`,
      titulo: agendamentoLabel[agendamento.status]?.titulo || 'Atualização de consulta',
      descricao: agendamentoLabel[agendamento.status]?.descricao || agendamento.observacoes || null,
      created_at: agendamento.data_hora,
    })),
  ]

  return eventos
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params

  const { data: lead } = await adminSupabase
    .from('leads')
    .select('id, nome, status, created_at, portal_ativo, portal_ultimo_acesso, tenant_id')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  await adminSupabase
    .from('leads')
    .update({ portal_ultimo_acesso: new Date().toISOString() })
    .eq('id', lead.id)

  const [
    { data: tenant },
    { data: configuracao },
    { data: documentos },
    { data: mensagens },
    { data: proximoAgendamento },
    { data: agendamentosRecentes },
    viewerResult,
  ] =
    await Promise.all([
      lead.tenant_id
        ? adminSupabase
            .from('tenants')
            .select('nome, responsavel_email, responsavel_telefone')
            .eq('id', lead.tenant_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getConfiguracaoAtual(
        adminSupabase,
        lead.tenant_id,
        'nome_escritorio, logo_url, cor_primaria',
      ),
      adminSupabase
        .from('lead_documentos')
        .select('id, nome, tipo, arquivo_url, gerado_por_ia, tipo_documento, created_at')
        .eq('lead_id', lead.id)
        .eq('compartilhado_cliente', true)
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('portal_mensagens')
        .select('id, remetente, mensagem, lida, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true }),
      adminSupabase
        .from('agendamentos')
        .select('id, data_hora, duracao_minutos, status, meet_link, observacoes')
        .eq('lead_id', lead.id)
        .in('status', ['agendado', 'confirmado', 'remarcado'])
        .gte('data_hora', new Date().toISOString())
        .order('data_hora', { ascending: true })
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from('agendamentos')
        .select('id, data_hora, status, observacoes')
        .eq('lead_id', lead.id)
        .order('data_hora', { ascending: false })
        .limit(6),
      resolvePortalViewer(adminSupabase, request, lead.id),
    ])

  let pendenciasDocumento:
    | Array<{
        id: string
        titulo: string
        descricao: string | null
        status: string
        created_at: string
        updated_at: string
      }>
    | [] = []

  let timelineExplicita: TimelineEvent[] = []

  const { data: pendenciasData, error: pendenciasError } = await adminSupabase
    .from('portal_document_requests')
    .select('id, titulo, descricao, status, created_at, updated_at')
    .eq('lead_id', lead.id)
    .in('status', ['pendente', 'rejeitado'])
    .order('created_at', { ascending: false })

  if (!pendenciasError) {
    pendenciasDocumento = pendenciasData || []
  } else if (!isMissingRelation(pendenciasError)) {
    return NextResponse.json({ error: pendenciasError.message }, { status: 500 })
  }

  const { data: timelineData, error: timelineError } = await adminSupabase
    .from('portal_timeline_events')
    .select('id, tipo, titulo, descricao, created_at')
    .eq('lead_id', lead.id)
    .eq('visivel_cliente', true)
    .order('created_at', { ascending: false })
    .limit(12)

  if (!timelineError) {
    timelineExplicita = timelineData || []
  } else if (!isMissingRelation(timelineError)) {
    return NextResponse.json({ error: timelineError.message }, { status: 500 })
  }

  await adminSupabase
    .from('portal_mensagens')
    .update({ lida: true })
    .eq('lead_id', lead.id)
    .eq('remetente', 'escritorio')
    .eq('lida', false)

  const branding = normalizeBranding({
    tenantNome: tenant?.nome,
    responsavelEmail: tenant?.responsavel_email,
    responsavelTelefone: tenant?.responsavel_telefone,
    nomeEscritorio: configuracao?.nome_escritorio,
    logoUrl: configuracao?.logo_url,
    corPrimaria: configuracao?.cor_primaria,
  })

  const mensagensNaoLidas = (mensagens || []).filter(
    (message) => message.remetente === 'escritorio' && !message.lida,
  ).length

  return NextResponse.json({
    lead: {
      id: lead.id,
      nome: lead.nome,
      status: lead.status,
      created_at: lead.created_at,
    },
    branding,
    documentos: documentos || [],
    mensagens: mensagens || [],
    proximo_agendamento: proximoAgendamento || null,
    pendencias_documento: pendenciasDocumento,
    timeline:
      timelineExplicita.length > 0
        ? timelineExplicita
        : buildDerivedTimeline({
            lead,
            documentos: documentos || [],
            mensagens: mensagens || [],
            agendamentos: agendamentosRecentes || [],
          }),
    viewer: viewerResult.viewer,
    identity: {
      foundation_pending: viewerResult.foundationPending,
      has_session: Boolean(viewerResult.viewer),
    },
    resumo: {
      documentos_compartilhados: documentos?.length || 0,
      mensagens_nao_lidas: mensagensNaoLidas,
      documentos_pendentes: pendenciasDocumento.length,
    },
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params
  const { mensagem } = await request.json()

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }

  const { data: lead } = await adminSupabase
    .from('leads')
    .select('id, nome, tenant_id')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  const { data, error } = await adminSupabase
    .from('portal_mensagens')
    .insert({
      lead_id: lead.id,
      tenant_id: lead.tenant_id,
      remetente: 'cliente',
      mensagem: mensagem.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminSupabase.from('notificacoes').insert({
    tenant_id: lead.tenant_id,
    tipo: 'portal',
    titulo: `Nova mensagem no portal — ${lead.nome}`,
    descricao: mensagem.trim().substring(0, 80),
    lida: false,
    link: `/leads/${lead.id}`,
  })

  return NextResponse.json({ mensagem: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const adminSupabase = createAdminSupabase()
  const { token } = await params

  const { data: lead } = await adminSupabase
    .from('leads')
    .select('id')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  const viewerResult = await resolvePortalViewer(adminSupabase, request, lead.id)
  if (viewerResult.foundationPending) {
    return NextResponse.json({ error: 'A foundation de identidade do portal ainda não foi aplicada.' }, { status: 409 })
  }

  if (!viewerResult.viewer) {
    return NextResponse.json({ error: 'Acesso persistente não encontrado para este portal.' }, { status: 401 })
  }

  const body = await request.json()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.nome === 'string' && body.nome.trim()) payload.nome = body.nome.trim()
  if (body.email !== undefined) payload.email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  if (body.telefone !== undefined) payload.telefone = typeof body.telefone === 'string' && body.telefone.trim() ? body.telefone.trim() : null

  const { data, error } = await adminSupabase
    .from('portal_users')
    .update(payload)
    .eq('id', viewerResult.viewer.id)
    .select('id, nome, email, telefone, papel, ativo, ultimo_acesso_em')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ viewer: data })
}
