import { createClient as createAdmin } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { isMissingUsuarioOptionalColumnError } from '@/lib/permissions'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const USUARIO_SELECT_VARIANTS = [
  'id, auth_id, tenant_id, nome, email, role, permissions, ativo, google_calendar_email, google_calendar_connected_at',
  'id, auth_id, tenant_id, nome, email, role, permissions, ativo',
  'id, auth_id, tenant_id, nome, email, role, ativo',
] as const

async function runUsuarioLookup(executor: (selectClause: string) => Promise<{ data: any; error: unknown }>) {
  let lastResult: { data: any; error: unknown } | null = null

  for (const selectClause of USUARIO_SELECT_VARIANTS) {
    const result = await executor(selectClause)
    if (!result.error) return result
    lastResult = result

    if (!isMissingUsuarioOptionalColumnError(result.error)) {
      return result
    }
  }

  return lastResult!
}

async function findUsuarioByAuthId(adminClient: ReturnType<typeof createAdminClient>, authUserId: string) {
  return runUsuarioLookup(async (selectClause) =>
    await adminClient
      .from('usuarios')
      .select(selectClause)
      .eq('auth_id', authUserId)
      .maybeSingle(),
  )
}

async function findUsuarioByEmail(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  return runUsuarioLookup(async (selectClause) =>
    await adminClient
      .from('usuarios')
      .select(selectClause)
      .eq('email', email)
      .maybeSingle(),
  )
}

async function ensureResponsibleTenantAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  authUser: User,
  normalizedEmail: string,
) {
  const { data: tenantMatches, error: tenantError } = await adminClient
    .from('tenants')
    .select('id, nome, responsavel_nome, responsavel_email')
    .eq('responsavel_email', normalizedEmail)
    .limit(2)

  if (tenantError || !tenantMatches || tenantMatches.length !== 1) return null

  const tenant = tenantMatches[0]

  const usuarioPorEmail = await findUsuarioByEmail(adminClient, normalizedEmail)
  let usuario = usuarioPorEmail.data

  if (!usuario) {
    const usuarioAdminTenant = await runUsuarioLookup(async (selectClause) =>
      await adminClient
        .from('usuarios')
        .select(selectClause)
        .eq('tenant_id', tenant.id)
        .eq('role', 'admin')
        .order('convidado_em', { ascending: true })
        .limit(1)
        .maybeSingle(),
    )

    usuario = usuarioAdminTenant.data
  }

  const payload = {
    auth_id: authUser.id,
    tenant_id: tenant.id,
    email: normalizedEmail,
    nome: tenant.responsavel_nome || usuario?.nome || tenant.nome,
    role: 'admin',
    ativo: true,
    updated_at: new Date().toISOString(),
  }

  if (usuario) {
    await adminClient
      .from('usuarios')
      .update(payload)
      .eq('id', usuario.id)
  } else {
    await adminClient
      .from('usuarios')
      .insert(payload)
  }

  const repaired = await findUsuarioByAuthId(adminClient, authUser.id)
  return repaired.data || null
}

export async function resolveUsuarioAtual(authUser: User) {
  const adminClient = createAdminClient()
  const normalizedEmail = (authUser.email || '').trim().toLowerCase()

  const authQuery = await findUsuarioByAuthId(adminClient, authUser.id)
  let usuario = authQuery.data
  let error = authQuery.error

  if ((!usuario || error) && normalizedEmail) {
    const fallbackQuery = await findUsuarioByEmail(adminClient, normalizedEmail)
    usuario = fallbackQuery.data
    error = fallbackQuery.error

    if (usuario && usuario.auth_id !== authUser.id) {
      await adminClient
        .from('usuarios')
        .update({ auth_id: authUser.id, updated_at: new Date().toISOString() })
        .eq('id', usuario.id)
    }
  }

  if ((!usuario || error) && normalizedEmail) {
    usuario = await ensureResponsibleTenantAccess(adminClient, authUser, normalizedEmail)
    error = null
  }

  if (error || !usuario || !usuario.ativo) return null

  return {
    ...usuario,
    email: (usuario.email || normalizedEmail).toLowerCase(),
    permissions: 'permissions' in usuario ? (usuario.permissions || null) : null,
  }
}

export async function touchUsuarioUltimoAcesso(authUser: User) {
  const usuario = await resolveUsuarioAtual(authUser)
  if (!usuario) return null

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await adminClient
    .from('usuarios')
    .update({
      auth_id: authUser.id,
      ultimo_acesso: now,
      updated_at: now,
    })
    .eq('id', usuario.id)

  if (error) throw error

  return {
    ...usuario,
    auth_id: authUser.id,
    ultimo_acesso: now,
  }
}
