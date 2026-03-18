import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id } = await params
  const body = await request.json()
  const { data, error } = await adminSupabase
    .from('tenants').update({
      ...body,
      twilio_account_sid: body.twilio_account_sid || null,
      twilio_auth_token: body.twilio_auth_token || null,
      twilio_whatsapp_number: body.twilio_whatsapp_number || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id } = await params
  await adminSupabase.from('tenants').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
