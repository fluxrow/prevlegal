import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenants } = await adminSupabase
    .from('tenants').select('*').order('created_at', { ascending: false })

  const [{ count: totalLeads }, { count: totalConversas }] = await Promise.all([
    adminSupabase.from('leads').select('id', { count: 'exact', head: true }),
    adminSupabase.from('conversas').select('id', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    tenants: tenants || [],
    metricas: { totalLeads: totalLeads || 0, totalConversas: totalConversas || 0 },
  })
}

export async function POST(request: Request) {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { data, error } = await adminSupabase.from('tenants').insert({
    ...body,
    twilio_account_sid: body.twilio_account_sid || null,
    twilio_auth_token: body.twilio_auth_token || null,
    twilio_whatsapp_number: body.twilio_whatsapp_number || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
