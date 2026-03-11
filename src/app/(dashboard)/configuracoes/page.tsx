import { requireAdmin } from '@/lib/auth/get-user-role'
import { redirect } from 'next/navigation'
import UsuariosManager from '@/components/usuarios-manager'

export default async function ConfiguracoesPage() {
  const user = await requireAdmin()
  if (!user) redirect('/dashboard')

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Configurações
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Gerencie os usuários do escritório</p>
      </div>
      <UsuariosManager />
    </div>
  )
}
