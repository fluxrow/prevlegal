import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildInboxHref } from '@/lib/contact-shortcuts'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  anyFieldMatchesSearch,
  buildSearchTokens,
} from '@/lib/search-normalization'

type LeadSearchRow = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  nb: string | null
  status: string
  origem: string | null
}

type DocumentoSearchRow = {
  id: string
  lead_id: string
  nome: string
  tipo: string
  gerado_por_ia: boolean | null
  created_at: string
  leads: { nome?: string | null } | { nome?: string | null }[] | null
}

type ConversaSearchRow = {
  id: string
  lead_id: string | null
  status: string
  ultima_mensagem_em: string | null
  leads:
    | { id?: string | null; nome?: string | null; telefone?: string | null }
    | { id?: string | null; nome?: string | null; telefone?: string | null }[]
    | null
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function asSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ resultados: [] })

  const { searchParams } = new URL(request.url)
  const tokens = buildSearchTokens(searchParams.get('q'))
  const q = tokens.text
  if (!q || q.length < 2) return NextResponse.json({ resultados: [] })

  const termo = `%${q}%`
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const leadRawQuery = adminSupabase
    .from('leads')
    .select('id, nome, cpf, telefone, nb, status, origem')
    .eq('tenant_id', context.tenantId)
    .or(`nome.ilike.${termo},cpf.ilike.${termo},telefone.ilike.${termo},nb.ilike.${termo}`)
    .limit(12)

  const leadRecentQuery = adminSupabase
    .from('leads')
    .select('id, nome, cpf, telefone, nb, status, origem')
    .eq('tenant_id', context.tenantId)
    .order('updated_at', { ascending: false })
    .limit(250)

  const docRawQuery = adminSupabase
    .from('lead_documentos')
    .select('id, lead_id, nome, tipo, gerado_por_ia, created_at, leads(nome)')
    .eq('tenant_id', context.tenantId)
    .ilike('nome', termo)
    .limit(12)

  const docRecentQuery = adminSupabase
    .from('lead_documentos')
    .select('id, lead_id, nome, tipo, gerado_por_ia, created_at, leads(nome)')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  const conversaRawQuery = adminSupabase
    .from('conversas')
    .select('id, lead_id, status, ultima_mensagem_em, leads!inner(id, nome, telefone)')
    .eq('tenant_id', context.tenantId)
    .ilike('leads.nome', termo)
    .limit(12)

  const conversaRecentQuery = adminSupabase
    .from('conversas')
    .select('id, lead_id, status, ultima_mensagem_em, leads!inner(id, nome, telefone)')
    .eq('tenant_id', context.tenantId)
    .order('ultima_mensagem_em', { ascending: false })
    .limit(200)

  const [
    { data: leadsRaw },
    { data: leadsRecent },
    { data: documentosRaw },
    { data: documentosRecent },
    { data: conversasRaw },
    { data: conversasRecent },
  ] = await Promise.all([
    leadRawQuery,
    leadRecentQuery,
    docRawQuery,
    docRecentQuery,
    conversaRawQuery,
    conversaRecentQuery,
  ])

  const leads = dedupeById<LeadSearchRow>([
    ...((leadsRaw || []) as LeadSearchRow[]),
    ...((leadsRecent || []) as LeadSearchRow[]),
  ])
    .filter((lead) =>
      anyFieldMatchesSearch(
        [lead.nome, lead.cpf, lead.telefone, lead.nb, lead.origem],
        tokens,
      ),
    )
    .slice(0, 6)

  const documentos = dedupeById<DocumentoSearchRow>([
    ...((documentosRaw || []) as DocumentoSearchRow[]),
    ...((documentosRecent || []) as DocumentoSearchRow[]),
  ])
    .filter((documento) => {
      const lead = asSingleRelation(documento.leads)
      return anyFieldMatchesSearch(
        [documento.nome, documento.tipo, lead?.nome],
        tokens,
      )
    })
    .slice(0, 4)

  const conversas = dedupeById<ConversaSearchRow>([
    ...((conversasRaw || []) as ConversaSearchRow[]),
    ...((conversasRecent || []) as ConversaSearchRow[]),
  ])
    .filter((conversa) => {
      const lead = asSingleRelation(conversa.leads)
      return anyFieldMatchesSearch(
        [lead?.nome, lead?.telefone, conversa.status],
        tokens,
      )
    })
    .slice(0, 4)

  const resultados = [
    ...leads.map(l => ({
      tipo: 'lead' as const,
      id: l.id,
      titulo: l.nome,
      subtitulo: l.telefone || l.cpf || l.nb || '',
      badge: l.status,
      href: `/leads/${l.id}`,
    })),
    ...conversas.map((c) => {
      const lead = asSingleRelation(c.leads)

      return {
        tipo: 'conversa' as const,
        id: c.id,
        titulo: `Conversa — ${lead?.nome || 'Lead'}`,
        subtitulo:
          c.status === 'agente'
            ? 'Com agente IA'
            : c.status === 'humano'
              ? 'Com advogado'
              : 'Encerrada',
        badge: c.status,
        href: buildInboxHref({ conversaId: c.id, telefone: lead?.telefone }),
      }
    }),
    ...documentos.map((d) => {
      const lead = asSingleRelation(d.leads)

      return {
        tipo: 'documento' as const,
        id: d.id,
        titulo: d.nome,
        subtitulo: `Lead: ${lead?.nome || ''}`,
        badge: d.gerado_por_ia ? 'IA' : d.tipo,
        href: `/leads/${d.lead_id}`,
      }
    }),
  ]

  return NextResponse.json({ resultados })
}
