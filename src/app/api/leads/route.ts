import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('leads')
    .insert({
      nome: body.nome,
      cpf: body.cpf || null,
      telefone: body.telefone || null,
      nb: body.nb || null,
      banco: body.banco || null,
      valor_rma: body.valor_rma ? parseFloat(body.valor_rma) : null,
      ganho_potencial: body.ganho_potencial ? parseFloat(body.ganho_potencial) : null,
      status: body.status || 'new',
      tem_whatsapp: body.tem_whatsapp ?? true,
      origem: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}
