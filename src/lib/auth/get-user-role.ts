import { createClient } from '@/lib/supabase/server'

export async function getUserWithRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, ativo')
    .eq('auth_id', user.id)
    .single()

  if (!usuario || !usuario.ativo) return null
  return { ...user, perfil: usuario }
}

export async function requireAdmin() {
  const user = await getUserWithRole()
  if (!user || user.perfil.role !== 'admin') {
    return null
  }
  return user
}
