import { createClient } from '@/lib/supabase/server'
import { resolveUsuarioAtual } from '@/lib/current-usuario'

export async function getUserWithRole() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const usuario = await resolveUsuarioAtual(user)
  if (!usuario) return null
  return { ...user, perfil: usuario }
}

export async function requireAdmin() {
  const user = await getUserWithRole()
  if (!user || user.perfil.role !== 'admin') return null
  return user
}
