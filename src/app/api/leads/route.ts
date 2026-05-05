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
import { normalizeOperationProfile } from '@/lib/operation-profile'
import { normalizeHumanText } from '@/lib/text-repair'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'
const ALLOWED_LEAD_STATUSES = new Set(['new', 'contacted', 'awaiting', 'scheduled', 'converted', 'lost'])

function criarNbManual(body: Record<string, unknown>, operationProfile: string) {
  const telefone = normalizeDigits(body.telefone)
  const cpf = normalizeDigits(body.cpf)
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  const base = telefone || cpf || Date.now().toString()
  const prefix = operationProfile === 'planejamento_previdenciario' ? 'PLAN' : 'MANUAL'
  return `${prefix}-${base}-${randomSuffix}`.slice(0, 20)
}

function buildPhoneVariants(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const digits = normalizeDigits(value)
  const variants = new Set<string>()

  if (raw) variants.add(raw)
  if (!digits) return []

  variants.add(digits)
  variants.add(`+${digits}`)
  variants.add(`whatsapp:${digits}`)
  variants.add(`whatsapp:+${digits}`)

  if (digits.startsWith('55') && digits.length > 2) {
    const withoutCountry = digits.slice(2)
    variants.add(withoutCountry)
    variants.add(`+${withoutCountry}`)
    variants.add(`whatsapp:${withoutCountry}`)
    variants.add(`whatsapp:+${withoutCountry}`)
  } else {
    variants.add(`55${digits}`)
    variants.add(`+55${digits}`)
    variants.add(`whatsapp:55${digits}`)
    variants.add(`whatsapp:+55${digits}`)
  }

  return Array.from(variants).filter(Boolean)
}

type ManualLeadProfileSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: boolean) => {
          eq: (column: string, value: boolean) => {
            maybeSingle: () => PromiseLike<{ data: { perfil_operacao?: string | null } | null }>
          }
        }
      }
    }
  }
}

type ManualLeadLookupSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        or: (filters: string) => {
          limit: (value: number) => {
            maybeSingle: () => PromiseLike<{
              data: {
                id: string
                nome?: string | null
                cpf?: string | null
                telefone?: string | null
                email?: string | null
                categoria_profissional?: string | null
                data_nascimento?: string | null
                anotacao?: string | null
                tem_whatsapp?: boolean | null
              } | null
            }>
          }
        }
      }
    }
  }
}

async function resolveManualLeadOperationProfile(
  adminSupabase: ManualLeadProfileSupabase,
  tenantId: string,
) {
  const { data } = await adminSupabase
    .from('agentes')
    .select('perfil_operacao')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .eq('is_default', true)
    .maybeSingle()

  const defaultAgent = data as { perfil_operacao?: string | null } | null
  return normalizeOperationProfile(defaultAgent?.perfil_operacao || null)
}

async function findExistingLeadByPhone(
  adminSupabase: ManualLeadLookupSupabase,
  tenantId: string,
  telefone: unknown,
) {
  const phoneVariants = buildPhoneVariants(telefone)
  if (phoneVariants.length === 0) return null

  const clauses = phoneVariants.flatMap((phone) => [
    `telefone.eq.${phone}`,
    `telefone_enriquecido.eq.${phone}`,
  ])

  const { data } = await adminSupabase
    .from('leads')
    .select('id, nome, cpf, telefone, email, categoria_profissional, data_nascimento, anotacao, tem_whatsapp')
    .eq('tenant_id', tenantId)
    .or(clauses.join(','))
    .limit(1)
    .maybeSingle()

  return data
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
  const scope = normalizeText(searchParams.get('scope'))
  const requestedStatus = normalizeText(searchParams.get('status'))
  const includeCount = searchParams.get('include_count') === '1'
  const allowTenantWideSearch = scope === 'operational' || scope === 'scheduling'
  const maxLimit = allowTenantWideSearch ? 200 : 50
  const limit = Math.min(Number(searchParams.get('limit') || 20) || 20, maxLimit)
  const offset = Math.max(Number(searchParams.get('offset') || 0) || 0, 0)
  const fetchLimit = q ? Math.max(limit * 4, 200) : limit
  const statusFilter = ALLOWED_LEAD_STATUSES.has(requestedStatus) ? requestedStatus : null

  let query = adminSupabase
    .from('leads')
    .select('id, nome, telefone, conjuge_celular, filho_celular, irmao_celular, status, banco, tenant_id, responsavel_id, lgpd_optout, updated_at')
    .eq('tenant_id', context.tenantId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1)

  if (!context.isAdmin && !allowTenantWideSearch) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter)
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
        [lead.nome, lead.banco, lead.telefone, lead.conjuge_celular, lead.filho_celular, lead.irmao_celular],
        tokens,
      )
    })
    .slice(0, limit)

  let totalCount: number | null = null

  if (includeCount) {
    if (!q) {
      let countQuery = adminSupabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId)
        .neq('lgpd_optout', true)

      if (!context.isAdmin && !allowTenantWideSearch) {
        countQuery = countQuery.eq('responsavel_id', context.usuarioId)
      }

      if (statusFilter) {
        countQuery = countQuery.eq('status', statusFilter)
      }

      const { count } = await countQuery
      totalCount = count || 0
    } else {
      totalCount = leadsFiltrados.length
    }
  }

  return NextResponse.json({
    leads: leadsFiltrados.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      status: lead.status,
    })),
    count: totalCount,
    pagination: {
      limit,
      offset,
      has_more: (data || []).length >= fetchLimit,
    },
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
  const explicitProfile = normalizeText(body.perfil_operacao)
  const operationProfile = explicitProfile
    ? normalizeOperationProfile(explicitProfile)
    : await resolveManualLeadOperationProfile(
        adminSupabase as unknown as ManualLeadProfileSupabase,
        context.tenantId,
      )
  const nomeNormalizado = normalizeHumanText(body.nome)
  const email = normalizeText(body.email).toLowerCase() || null
  const categoriaProfissional = normalizeHumanText(body.categoria_profissional) || null
  const dataNascimento = normalizeText(body.data_nascimento) || null
  const anotacao = normalizeHumanText(body.anotacao) || null
  const cpf = normalizeDigits(body.cpf) || null
  const telefone = normalizeText(body.telefone) || null
  const nbManual = normalizeText(body.nb) || criarNbManual(body, operationProfile)

  if (operationProfile === 'planejamento_previdenciario' && telefone) {
    const existingLead = await findExistingLeadByPhone(
      adminSupabase as unknown as ManualLeadLookupSupabase,
      context.tenantId,
      telefone,
    )

    if (existingLead?.id) {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        tem_whatsapp: body.tem_whatsapp ?? existingLead.tem_whatsapp ?? true,
      }

      if (!normalizeText(existingLead.nome) && nomeNormalizado) updatePayload.nome = nomeNormalizado
      if (!normalizeDigits(existingLead.cpf) && cpf) updatePayload.cpf = cpf
      if (!normalizeText(existingLead.email) && email) updatePayload.email = email
      if (!normalizeText(existingLead.categoria_profissional) && categoriaProfissional) {
        updatePayload.categoria_profissional = categoriaProfissional
      }
      if (!normalizeText(existingLead.data_nascimento) && dataNascimento) {
        updatePayload.data_nascimento = dataNascimento
      }
      if (!normalizeText(existingLead.anotacao) && anotacao) {
        updatePayload.anotacao = anotacao
      }

      const { data: leadAtualizado, error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', existingLead.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ lead: leadAtualizado, reused: true })
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: context.tenantId,
      lista_id: listaManual.id,
      nome: nomeNormalizado,
      cpf,
      telefone,
      email,
      contato_abordagem_tipo: 'titular',
      contato_abordagem_origem: 'manual',
      nb: nbManual,
      banco: operationProfile === 'beneficios_previdenciarios' ? body.banco || null : null,
      valor_rma:
        operationProfile === 'beneficios_previdenciarios' && body.valor_rma
          ? parseFloat(body.valor_rma)
          : null,
      ganho_potencial:
        operationProfile === 'beneficios_previdenciarios' ? ganhoPotencial : null,
      categoria_profissional: categoriaProfissional,
      data_nascimento: dataNascimento,
      anotacao,
      status: body.status || 'new',
      tem_whatsapp: body.tem_whatsapp ?? true,
      origem: 'manual',
      responsavel_id: context.usuarioId,
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('leads_nb_key')) {
      return NextResponse.json({
        error:
          operationProfile === 'planejamento_previdenciario'
            ? 'Já existe um lead com esse telefone na base. Para planejamento, reutilize o lead importado em vez de criar outro manual.'
            : 'Já existe um lead com esse NB na base.',
      }, { status: 409 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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
