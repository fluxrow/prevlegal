import { createClient } from '@/lib/supabase/server'
import { hasPermission, type PermissionMap, type Role } from '@/lib/permissions'
import { resolveUsuarioAtual } from '@/lib/current-usuario'

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

  const usuario = await resolveUsuarioAtual(user)
  if (!usuario) return null
  return usuario as UsuarioLogado
}

export function podeAcessar(role: Role, minimo: Role): boolean {
  const hierarquia: Record<Role, number> = { admin: 3, operador: 2, visualizador: 1 }
  return hierarquia[role] >= hierarquia[minimo]
}

export function soAdmin(role: Role): boolean { return role === 'admin' }
export function podeCriar(role: Role): boolean { return podeAcessar(role, 'operador') }
export function podeEditar(role: Role): boolean { return podeAcessar(role, 'operador') }
export function podeDeletar(role: Role): boolean { return role === 'admin' }
