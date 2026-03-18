import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'

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
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()

  let { data: listaManual } = await adminSupabase
    .from('listas')
    .select('id, total_registros, total_ativos, ganho_potencial_total')
    .eq('nome', LISTA_MANUAL_NOME)
    .eq('fornecedor', LISTA_MANUAL_FORNECEDOR)
    .limit(1)
    .maybeSingle()

  if (!listaManual) {
    const { data: novaLista, error: listaError } = await adminSupabase
      .from('listas')
      .insert({
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

  const { data, error } = await supabase
    .from('leads')
    .insert({
      lista_id: listaManual.id,
      nome: body.nome,
      cpf: body.cpf || null,
      telefone: body.telefone || null,
      nb: body.nb || null,
      banco: body.banco || null,
      valor_rma: body.valor_rma ? parseFloat(body.valor_rma) : null,
      ganho_potencial: ganhoPotencial,
      status: body.status || 'new',
      tem_whatsapp: body.tem_whatsapp ?? true,
      origem: 'manual',
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
