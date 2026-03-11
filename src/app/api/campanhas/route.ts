export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await adminClient
      .from('campanhas')
      .select('*, listas(nome)')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campanhas: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, lista_id, mensagem_template, delay_min_ms, delay_max_ms, tamanho_lote, pausa_entre_lotes_s, limite_diario, apenas_verificados, agendado_para } = body

    if (!nome || !lista_id || !mensagem_template) {
      return NextResponse.json({ error: 'nome, lista_id e mensagem_template são obrigatórios' }, { status: 400 })
    }

    // contar leads da lista
    const { count } = await adminClient
      .from('lista_leads')
      .select('*', { count: 'exact', head: true })
      .eq('lista_id', lista_id)

    const { data, error } = await adminClient
      .from('campanhas')
      .insert({
        nome,
        lista_id,
        mensagem_template,
        status: 'rascunho',
        total_leads: count || 0,
        total_contatados: 0,
        total_responderam: 0,
        total_agendados: 0,
        total_convertidos: 0,
        honorarios_gerados: 0,
        total_enviados: 0,
        total_entregues: 0,
        total_lidos: 0,
        total_respondidos: 0,
        total_falhos: 0,
        delay_min_ms: delay_min_ms || 1500,
        delay_max_ms: delay_max_ms || 3500,
        tamanho_lote: tamanho_lote || 50,
        pausa_entre_lotes_s: pausa_entre_lotes_s || 30,
        limite_diario: limite_diario || 500,
        apenas_verificados: apenas_verificados ?? true,
        agendado_para: agendado_para || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campanha: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
