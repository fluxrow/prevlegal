import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
  const adminSupabase = createAdminSupabase()

  const { data: tenant, error: tenantError } = await adminSupabase
    .from('tenants')
    .select('responsavel_email')
    .eq('id', id)
    .single()

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 })
  }

  const email = tenant?.responsavel_email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email do responsavel nao encontrado para este tenant' }, { status: 404 })
  }

  const { data: authUsersPage, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 })
  }

  const authUsers = authUsersPage?.users || []
  const usuarioExisteNoAuth = authUsers.some((user) => user.email?.toLowerCase() === email)

  if (!usuarioExisteNoAuth) {
    return NextResponse.json({
      error: 'Este responsavel ainda nao foi provisionado no Auth. Use "Enviar acesso do responsavel" primeiro.',
    }, { status: 409 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'
  const nextPath = '/auth/redefinir-senha'
  const redirectTo = `${baseUrl}${nextPath}`

  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tokenHash = data?.properties?.hashed_token
  const verificationType = data?.properties?.verification_type || 'recovery'

  if (!tokenHash) {
    return NextResponse.json({ error: 'Nao foi possivel gerar o token de acesso manual.' }, { status: 500 })
  }

  const url = `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(verificationType)}&next=${encodeURIComponent(nextPath)}`
  const redirectObservado = data?.properties?.redirect_to || ''
  const actionLink = data?.properties?.action_link || ''
  const supabaseConfigInvalida =
    redirectObservado.includes('localhost') ||
    actionLink.includes('localhost')

  return NextResponse.json({
    ok: true,
    email,
    url,
    supabase_config_invalida: supabaseConfigInvalida,
    redirect_observado: redirectObservado,
  })
}
