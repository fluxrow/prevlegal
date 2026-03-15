import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'operador' | 'visualizador'

export interface UsuarioLogado {
  id: string
  auth_id: string
  nome: string
  email: string
  role: Role
  ativo: boolean
  tenant_id: string
}

export async function getUsuarioLogado(): Promise<UsuarioLogado | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id, auth_id, nome, email, role, ativo, tenant_id')
    .eq('auth_id', user.id)
    .limit(1)
    .single()

  if (!data || !data.ativo) return null
  return data as UsuarioLogado
}

export function podeAcessar(role: Role, minimo: Role): boolean {
  const hierarquia: Record<Role, number> = { admin: 3, operador: 2, visualizador: 1 }
  return hierarquia[role] >= hierarquia[minimo]
}

export function soAdmin(role: Role): boolean { return role === 'admin' }
export function podeCriar(role: Role): boolean { return podeAcessar(role, 'operador') }
export function podeEditar(role: Role): boolean { return podeAcessar(role, 'operador') }
export function podeDeletar(role: Role): boolean { return role === 'admin' }
