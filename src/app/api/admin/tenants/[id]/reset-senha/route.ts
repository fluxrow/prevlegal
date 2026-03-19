import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await verificarAdminReauthRecente()) {
    return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })
  }

  const { id } = await params

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant, error: tenantError } = await adminSupabase
    .from('tenants')
    .select('responsavel_email, nome')
    .eq('id', id)
    .single()

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 })
  }

  if (!tenant?.responsavel_email) {
    return NextResponse.json({ error: 'Email nao encontrado para este tenant' }, { status: 404 })
  }

  const { error } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: tenant.responsavel_email,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    mensagem: `Email de redefinicao enviado para ${tenant.responsavel_email}`,
    email: tenant.responsavel_email,
  })
}
