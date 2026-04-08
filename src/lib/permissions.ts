export type Role = 'admin' | 'operador' | 'visualizador'

export type PermissionKey =
  | 'usuarios_manage'
  | 'agentes_manage'
  | 'automacoes_manage'
  | 'financeiro_manage'
  | 'listas_manage'
  | 'agendamentos_assign'
  | 'inbox_humana_manage'
  | 'configuracoes_manage'

export type PermissionMap = Record<PermissionKey, boolean>

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<Role, PermissionMap> = {
  admin: {
    usuarios_manage: true,
    agentes_manage: true,
    automacoes_manage: true,
    financeiro_manage: true,
    listas_manage: true,
    agendamentos_assign: true,
    inbox_humana_manage: true,
    configuracoes_manage: true,
  },
  operador: {
    usuarios_manage: false,
    agentes_manage: false,
    automacoes_manage: false,
    financeiro_manage: false,
    listas_manage: false,
    agendamentos_assign: false,
    inbox_humana_manage: true,
    configuracoes_manage: false,
  },
  visualizador: {
    usuarios_manage: false,
    agentes_manage: false,
    automacoes_manage: false,
    financeiro_manage: false,
    listas_manage: false,
    agendamentos_assign: false,
    inbox_humana_manage: false,
    configuracoes_manage: false,
  },
}

export function resolvePermissions(
  role: Role,
  overrides?: Partial<PermissionMap> | null,
): PermissionMap {
  return {
    ...DEFAULT_PERMISSIONS_BY_ROLE[role],
    ...(overrides || {}),
  }
}

export function hasPermission(
  source: { role: Role; permissions?: Partial<PermissionMap> | null },
  permission: PermissionKey,
) {
  return resolvePermissions(source.role, source.permissions)[permission]
}

export function isMissingPermissionsColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details.toLowerCase() : ''

  return (message.includes('permissions') || details.includes('permissions'))
    && (message.includes('column') || details.includes('column'))
}
