import { createClient as createAdmin } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { isMissingPermissionsColumnError } from '@/lib/permissions'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function resolveUsuarioAtual(authUser: User) {
  const adminClient = createAdminClient()
  const normalizedEmail = (authUser.email || '').trim().toLowerCase()

  let query = await adminClient
    .from('usuarios')
    .select('id, auth_id, tenant_id, nome, email, role, permissions, ativo, google_calendar_email, google_calendar_connected_at')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (isMissingPermissionsColumnError(query.error)) {
    query = await adminClient
      .from('usuarios')
      .select('id, auth_id, tenant_id, nome, email, role, ativo, google_calendar_email, google_calendar_connected_at')
      .eq('auth_id', authUser.id)
      .maybeSingle()
  }

  let usuario = query.data
  let error = query.error

  if ((!usuario || error) && normalizedEmail) {
    let fallbackQuery = await adminClient
      .from('usuarios')
      .select('id, auth_id, tenant_id, nome, email, role, permissions, ativo, google_calendar_email, google_calendar_connected_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (isMissingPermissionsColumnError(fallbackQuery.error)) {
      fallbackQuery = await adminClient
        .from('usuarios')
        .select('id, auth_id, tenant_id, nome, email, role, ativo, google_calendar_email, google_calendar_connected_at')
        .eq('email', normalizedEmail)
        .maybeSingle()
    }

    usuario = fallbackQuery.data
    error = fallbackQuery.error

    if (usuario && usuario.auth_id !== authUser.id) {
      await adminClient
        .from('usuarios')
        .update({ auth_id: authUser.id, updated_at: new Date().toISOString() })
        .eq('id', usuario.id)
    }
  }

  if (error || !usuario || !usuario.ativo) return null

  return {
    ...usuario,
    email: (usuario.email || normalizedEmail).toLowerCase(),
    permissions: 'permissions' in usuario ? (usuario.permissions || null) : null,
  }
}
