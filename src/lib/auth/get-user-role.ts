import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUserWithRole() {
  const adminClient = createAdminClient()
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  // Usa service_role para evitar bloqueio de RLS na leitura do próprio perfil
  const { data: usuario, error: dbError } = await adminClient
    .from('usuarios')
    .select('id, nome, email, role, ativo')
    .eq('auth_id', user.id)
    .single()

  if (dbError || !usuario || !usuario.ativo) return null
  return { ...user, perfil: usuario }
}

export async function requireAdmin() {
  const user = await getUserWithRole()
  if (!user || user.perfil.role !== 'admin') return null
  return user
}
