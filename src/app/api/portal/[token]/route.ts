import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getConfiguracaoAtual } from '@/lib/configuracoes'

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

export async function GET(
  request: Request,
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

  const [{ data: tenant }, { data: configuracao }, { data: documentos }, { data: mensagens }, { data: proximoAgendamento }] =
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
    ])

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
    resumo: {
      documentos_compartilhados: documentos?.length || 0,
      mensagens_nao_lidas: mensagensNaoLidas,
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
