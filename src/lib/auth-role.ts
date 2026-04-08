import { createClient } from '@/lib/supabase/server'
import { hasPermission, isMissingPermissionsColumnError, type PermissionMap, type Role } from '@/lib/permissions'

export { hasPermission }

export interface UsuarioLogado {
  id: string
  auth_id: string
  tenant_id: string | null
  nome: string
  email: string
  role: Role
  permissions?: Partial<PermissionMap> | null
  ativo: boolean
}

export async function getUsuarioLogado(): Promise<UsuarioLogado | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let query = await supabase
    .from('usuarios')
    .select('id, auth_id, tenant_id, nome, email, role, permissions, ativo')
    .eq('auth_id', user.id)
    .limit(1)
    .single()

  if (isMissingPermissionsColumnError(query.error)) {
    query = await supabase
      .from('usuarios')
      .select('id, auth_id, tenant_id, nome, email, role, ativo')
      .eq('auth_id', user.id)
      .limit(1)
      .single()
  }

  const { data } = query

  if (!data || !data.ativo) return null
  return {
    ...data,
    permissions: 'permissions' in data ? data.permissions : null,
  } as UsuarioLogado
}

export function podeAcessar(role: Role, minimo: Role): boolean {
  const hierarquia: Record<Role, number> = { admin: 3, operador: 2, visualizador: 1 }
  return hierarquia[role] >= hierarquia[minimo]
}

export function soAdmin(role: Role): boolean { return role === 'admin' }
export function podeCriar(role: Role): boolean { return podeAcessar(role, 'operador') }
export function podeEditar(role: Role): boolean { return podeAcessar(role, 'operador') }
export function podeDeletar(role: Role): boolean { return role === 'admin' }
