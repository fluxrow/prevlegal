import { cookies } from 'next/headers'

const ADMIN_TOKEN = process.env.ADMIN_FLUXROW_TOKEN || 'fluxrow-admin-secret-2026'

export async function verificarAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_token')?.value === ADMIN_TOKEN
}
