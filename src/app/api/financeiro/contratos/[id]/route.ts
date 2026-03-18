import { createClient } from '@/lib/supabase/server'
import { hasRecentReauth } from '@/lib/session-security'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const { id } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('contratos')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contrato: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasRecentReauth('app')) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const { id } = await params
  const { error } = await supabase.from('contratos').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
