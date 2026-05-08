export const OPERATIONAL_CONVERSATION_STATES = [
  'em_andamento',
  'morno',
  'frio',
  'aguardando_cliente',
  'aguardando_documentos',
  'aguardando_contrato',
  'agendado',
  'em_atendimento_humano',
  'convertido',
  'encerrado',
] as const

export type OperationalConversationState = (typeof OPERATIONAL_CONVERSATION_STATES)[number]

export const OPERATIONAL_STATE_LABELS: Record<OperationalConversationState, string> = {
  em_andamento: 'Em andamento',
  morno: 'Morno',
  frio: 'Frio',
  aguardando_cliente: 'Aguardando cliente',
  aguardando_documentos: 'Aguardando documentos',
  aguardando_contrato: 'Aguardando contrato',
  agendado: 'Agendado',
  em_atendimento_humano: 'Em atendimento humano',
  convertido: 'Convertido',
  encerrado: 'Encerrado',
}

export const OPERATIONAL_STATE_META: Record<
  OperationalConversationState,
  {
    color: string
    bg: string
    hint: string
    requiresDeadline: boolean
  }
> = {
  em_andamento: {
    color: '#4f7aff',
    bg: '#4f7aff20',
    hint: 'Conversa ativa em condução normal.',
    requiresDeadline: false,
  },
  morno: {
    color: '#f5c842',
    bg: '#f5c84220',
    hint: 'Lead interessado, mas em pausa.',
    requiresDeadline: false,
  },
  frio: {
    color: '#94a3b8',
    bg: '#94a3b820',
    hint: 'Lead frio, pronto para eventual recuperação futura.',
    requiresDeadline: false,
  },
  aguardando_cliente: {
    color: '#f59e0b',
    bg: '#f59e0b20',
    hint: 'Esperando retorno simples do cliente.',
    requiresDeadline: true,
  },
  aguardando_documentos: {
    color: '#fb7185',
    bg: '#fb718520',
    hint: 'Documentação foi pedida; prazo opcional para cobrança futura.',
    requiresDeadline: true,
  },
  aguardando_contrato: {
    color: '#a78bfa',
    bg: '#a78bfa20',
    hint: 'Contrato ou proposta enviados; prazo opcional para lembrete.',
    requiresDeadline: true,
  },
  agendado: {
    color: '#22c55e',
    bg: '#22c55e20',
    hint: 'Ao salvar, o compromisso entra na agenda real do responsável.',
    requiresDeadline: true,
  },
  em_atendimento_humano: {
    color: '#2dd4a0',
    bg: '#2dd4a020',
    hint: 'Humano conduzindo a conversa.',
    requiresDeadline: false,
  },
  convertido: {
    color: '#14b8a6',
    bg: '#14b8a620',
    hint: 'Lead convertido em cliente.',
    requiresDeadline: false,
  },
  encerrado: {
    color: '#4a5060',
    bg: '#4a506020',
    hint: 'Caso encerrado operacionalmente.',
    requiresDeadline: false,
  },
}

const OPERATIONAL_STATE_SET = new Set<string>(OPERATIONAL_CONVERSATION_STATES)

export function isOperationalConversationState(value: string | null | undefined): value is OperationalConversationState {
  return typeof value === 'string' && OPERATIONAL_STATE_SET.has(value)
}

export function normalizeOperationalConversationState(
  value: string | null | undefined,
  conversationStatus?: string | null,
): OperationalConversationState {
  if (isOperationalConversationState(value)) {
    return value
  }

  switch (conversationStatus) {
    case 'humano':
      return 'em_atendimento_humano'
    case 'aguardando_cliente':
      return 'aguardando_cliente'
    case 'resolvido':
    case 'encerrado':
      return 'encerrado'
    default:
      return 'em_andamento'
  }
}
