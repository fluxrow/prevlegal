import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

  const { data } = await supabase
    .from('convites')
    .select('id, email, role, expires_at, aceito')
    .eq('token', token)
    .eq('aceito', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })
  return NextResponse.json({ convite: data })
}
