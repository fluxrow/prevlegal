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
  nomeEscritorio?: string | null
  corPrimaria?: string | null
}) {
  return {
    nome_escritorio: payload.nomeEscritorio || payload.tenantNome || 'PrevLegal',
    cor_primaria: payload.corPrimaria || '#4f7aff',
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
    .select('id, tenant_id, portal_ativo')
    .eq('portal_token', token)
    .eq('portal_ativo', true)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 })
  }

  const [{ data: tenant }, { data: configuracao }] = await Promise.all([
    lead.tenant_id
      ? adminSupabase.from('tenants').select('nome').eq('id', lead.tenant_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getConfiguracaoAtual(
      adminSupabase,
      lead.tenant_id,
      'nome_escritorio, cor_primaria',
    ),
  ])

  const branding = normalizeBranding({
    tenantNome: tenant?.nome,
    nomeEscritorio: configuracao?.nome_escritorio,
    corPrimaria: configuracao?.cor_primaria,
  })

  const manifest = {
    name: `${branding.nome_escritorio} — Portal do Cliente`,
    short_name: 'Portal',
    description: 'Acompanhe seu atendimento, documentos, mensagens e agendamentos.',
    start_url: `/portal/${token}`,
    scope: `/portal/${token}`,
    display: 'standalone',
    background_color: '#080b14',
    theme_color: branding.cor_primaria,
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
    ],
  }

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'private, no-store',
    },
  })
}
