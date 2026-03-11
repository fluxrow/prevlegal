import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { texto } = await request.json()

  if (!texto?.trim()) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })

  // Buscar usuario_id da tabela public.usuarios
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('lead_anotacoes')
    .insert({
      lead_id: id,
      usuario_id: usuario?.id || user.id,
      texto: texto.trim()
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, anotacao: data })
}
