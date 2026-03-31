import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantContext } from '@/lib/tenant-context'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'

function normalizarTexto(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizarBusca(value: unknown) {
  return normalizarTexto(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function criarNbManual(body: Record<string, unknown>) {
  const telefone = normalizarTexto(body.telefone).replace(/\D/g, '')
  const cpf = normalizarTexto(body.cpf).replace(/\D/g, '')
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
  const q = normalizarTexto(searchParams.get('q'))
  const qNormalizada = normalizarBusca(q)
  const limit = Math.min(Number(searchParams.get('limit') || 20) || 20, 50)
  const fetchLimit = q ? Math.max(limit * 4, 120) : limit
  const scope = normalizarTexto(searchParams.get('scope'))
  const allowTenantWideSearch = scope === 'operational' || scope === 'scheduling'

  let query = adminSupabase
    .from('leads')
    .select('id, nome, telefone, status, email, banco, tenant_id, responsavel_id, lgpd_optout, updated_at')
    .eq('tenant_id', context.tenantId)
    .order('updated_at', { ascending: false })
    .limit(fetchLimit)

  if (!context.isAdmin && !allowTenantWideSearch) {
    query = query.eq('responsavel_id', context.usuarioId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const leadsFiltrados = (data || [])
    .filter((lead) => lead.lgpd_optout !== true)
    .filter((lead) => {
      if (!qNormalizada) return true

      const telefoneDigits = normalizarTexto(lead.telefone).replace(/\D/g, '')
      const queryDigits = q.replace(/\D/g, '')
      const haystack = [
        normalizarBusca(lead.nome),
        normalizarBusca(lead.email),
        normalizarBusca(lead.banco),
        normalizarBusca(lead.telefone),
      ]

      const matchTexto = haystack.some((field) => field.includes(qNormalizada))
      const matchTelefone = queryDigits ? telefoneDigits.includes(queryDigits) : false

      return matchTexto || matchTelefone
    })
    .slice(0, limit)

  return NextResponse.json({
    leads: leadsFiltrados.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      status: lead.status,
      email: lead.email,
    })),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, tenant_id')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario?.tenant_id) {
    return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })
  }

  let { data: listaManual } = await adminSupabase
    .from('listas')
    .select('id, total_registros, total_ativos, ganho_potencial_total')
    .eq('tenant_id', usuario.tenant_id)
    .eq('nome', LISTA_MANUAL_NOME)
    .eq('fornecedor', LISTA_MANUAL_FORNECEDOR)
    .limit(1)
    .maybeSingle()

  if (!listaManual) {
    const { data: novaLista, error: listaError } = await adminSupabase
      .from('listas')
      .insert({
        tenant_id: usuario.tenant_id,
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
        importado_por: usuario?.id || null,
      })
      .select('id, total_registros, total_ativos, ganho_potencial_total')
      .single()

    if (listaError || !novaLista) {
      return NextResponse.json({ error: listaError?.message || 'Erro ao criar lista técnica para cadastro manual' }, { status: 500 })
    }

    listaManual = novaLista
  }

  const ganhoPotencial = body.ganho_potencial ? parseFloat(body.ganho_potencial) : null
  const nbManual = normalizarTexto(body.nb) || criarNbManual(body)

  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: usuario.tenant_id,
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
      responsavel_id: usuario.id,
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
