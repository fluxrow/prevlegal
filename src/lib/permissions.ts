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

export const PERMISSION_KEYS = [
  'usuarios_manage',
  'agentes_manage',
  'automacoes_manage',
  'financeiro_manage',
  'listas_manage',
  'agendamentos_assign',
  'inbox_humana_manage',
  'configuracoes_manage',
] as const satisfies readonly PermissionKey[]

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

/**
 * Sanitiza overrides opcionais de permissões vindos do fluxo de convite.
 *
 * Regras:
 * - `null`, `undefined` e objeto vazio retornam `null`
 * - valores não-objeto são ignorados e retornam `null`
 * - apenas chaves conhecidas em `PERMISSION_KEYS` são consideradas
 * - apenas booleanos (`true` / `false`) são aceitos
 * - se nada válido for encontrado, retorna `null`
 *
 * Observação: o objeto retornado contém somente as chaves explicitamente
 * definidas no convite. As permissões restantes continuam sendo derivadas
 * do papel (`role`) no momento de uso.
 */
export function sanitizeInvitePermissions(
  input: unknown,
): PermissionMap | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const sanitized: Partial<PermissionMap> = {}

  for (const key of PERMISSION_KEYS) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value === 'boolean') {
      sanitized[key] = value
    }
  }

  return Object.keys(sanitized).length > 0 ? (sanitized as PermissionMap) : null
}

export function isMissingColumnError(error: unknown, columns: string[]) {
  if (!error || typeof error !== 'object') return false

  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details.toLowerCase() : ''

  return columns.some((column) => message.includes(column.toLowerCase()) || details.includes(column.toLowerCase()))
    && (message.includes('column') || details.includes('column'))
}

export function isMissingPermissionsColumnError(error: unknown) {
  return isMissingColumnError(error, ['permissions'])
}

export function isMissingUsuarioOptionalColumnError(error: unknown) {
  return isMissingColumnError(error, [
    'permissions',
    'google_calendar_email',
    'google_calendar_connected_at',
  ])
}

export function isMissingUserCalendarColumnError(error: unknown) {
  return isMissingColumnError(error, [
    'google_calendar_token',
    'google_calendar_email',
    'google_calendar_connected_at',
  ])
}

export function isMissingAgendamentoOwnerColumnError(error: unknown) {
  return isMissingColumnError(error, [
    'calendar_owner_scope',
    'calendar_owner_usuario_id',
    'calendar_owner_email',
  ])
}
