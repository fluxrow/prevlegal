import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantContext } from '@/lib/tenant-context'
import {
  anyFieldMatchesSearch,
  buildSearchTokens,
  normalizeDigits,
  normalizeText,
} from '@/lib/search-normalization'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'

function criarNbManual(body: Record<string, unknown>) {
  const telefone = normalizeDigits(body.telefone)
  const cpf = normalizeDigits(body.cpf)
  const base = telefone || cpf || Date.now().toString()
  return `MANUAL-${base}`
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ leads: [] })

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const tokens = buildSearchTokens(searchParams.get('q'))
  const q = tokens.text
  const qDigits = tokens.digits
  const limit = Math.min(Number(searchParams.get('limit') || 20) || 20, 50)
  const fetchLimit = q ? Math.max(limit * 4, 200) : limit
  const scope = normalizeText(searchParams.get('scope'))
  const allowTenantWideSearch = scope === 'operational' || scope === 'scheduling'

  let query = adminSupabase
    .from('leads')
    .select('id, nome, telefone, status, banco, tenant_id, responsavel_id, lgpd_optout, updated_at')
    .eq('tenant_id', context.tenantId)
    .order('updated_at', { ascending: false })
    .limit(fetchLimit)

  if (!context.isAdmin && !allowTenantWideSearch) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  if (q) {
    const termo = `%${q}%`
    const textFilters = [
      `nome.ilike.${termo}`,
      `banco.ilike.${termo}`,
      `telefone.ilike.${termo}`,
    ]

    if (qDigits.length >= 3 && qDigits !== q) {
      textFilters.push(`telefone.ilike.%${qDigits}%`)
    }

    query = query.or(textFilters.join(','))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const leadsFiltrados = (data || [])
    .filter((lead) => lead.lgpd_optout !== true)
    .filter((lead) => {
      if (!tokens.normalized && !tokens.digits) return true

      return anyFieldMatchesSearch(
        [lead.nome, lead.banco, lead.telefone],
        tokens,
      )
    })
    .slice(0, limit)

  return NextResponse.json({
    leads: leadsFiltrados.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      status: lead.status,
    })),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) {
    return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })
  }

  const body = await request.json()

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let { data: listaManual } = await adminSupabase
    .from('listas')
    .select('id, total_registros, total_ativos, ganho_potencial_total')
    .eq('tenant_id', context.tenantId)
    .eq('nome', LISTA_MANUAL_NOME)
    .eq('fornecedor', LISTA_MANUAL_FORNECEDOR)
    .limit(1)
    .maybeSingle()

  if (!listaManual) {
    const { data: novaLista, error: listaError } = await adminSupabase
      .from('listas')
      .insert({
        tenant_id: context.tenantId,
        nome: LISTA_MANUAL_NOME,
        fornecedor: LISTA_MANUAL_FORNECEDOR,
        arquivo_original: null,
        total_registros: 0,
        total_ativos: 0,
        total_cessados: 0,
        total_duplicados: 0,
        ganho_potencial_total: 0,
        ganho_potencial_medio: 0,
        percentual_com_telefone: 0,
        importado_por: context.usuarioId,
      })
      .select('id, total_registros, total_ativos, ganho_potencial_total')
      .single()

    if (listaError || !novaLista) {
      return NextResponse.json({ error: listaError?.message || 'Erro ao criar lista técnica para cadastro manual' }, { status: 500 })
    }

    listaManual = novaLista
  }

  const ganhoPotencial = body.ganho_potencial ? parseFloat(body.ganho_potencial) : null
  const nbManual = normalizeText(body.nb) || criarNbManual(body)

  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: context.tenantId,
      lista_id: listaManual.id,
      nome: body.nome,
      cpf: body.cpf || null,
      telefone: body.telefone || null,
      nb: nbManual,
      banco: body.banco || null,
      valor_rma: body.valor_rma ? parseFloat(body.valor_rma) : null,
      ganho_potencial: ganhoPotencial,
      status: body.status || 'new',
      tem_whatsapp: body.tem_whatsapp ?? true,
      origem: 'manual',
      responsavel_id: context.usuarioId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminSupabase
    .from('listas')
    .update({
      total_registros: (listaManual.total_registros || 0) + 1,
      total_ativos: (listaManual.total_ativos || 0) + 1,
      ganho_potencial_total: Number(listaManual.ganho_potencial_total || 0) + Number(ganhoPotencial || 0),
      ganho_potencial_medio:
        ((Number(listaManual.ganho_potencial_total || 0) + Number(ganhoPotencial || 0)) /
          ((listaManual.total_ativos || 0) + 1)),
    })
    .eq('id', listaManual.id)

  return NextResponse.json({ lead: data })
}
