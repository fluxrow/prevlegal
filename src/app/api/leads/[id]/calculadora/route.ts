import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data } = await supabase
    .from('calculadora_prev')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle()
  return NextResponse.json({ calculadora: data || {} })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const { data: existing } = await supabase
    .from('calculadora_prev')
    .select('id')
    .eq('lead_id', id)
    .maybeSingle()

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('calculadora_prev')
      .update({ ...body, lead_id: id, updated_at: new Date().toISOString() })
      .eq('lead_id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await supabase
      .from('calculadora_prev')
      .insert({ ...body, lead_id: id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  return NextResponse.json({ calculadora: result })
}
