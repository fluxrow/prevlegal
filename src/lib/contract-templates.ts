export type ContractTemplateType = 'honorarios_planejamento' | 'honorarios_beneficio'

export interface ContractTemplatePlaceholderDefinition {
  key: string
  label: string
  description: string
}

export interface ContractTemplateSeedTenant {
  id: string
  slug?: string | null
  nome?: string | null
  responsavel_email?: string | null
}

export interface ContractTemplatePreviewLead {
  nome?: string | null
  cpf?: string | null
  telefone?: string | null
  email?: string | null
  nb?: string | null
  data_nascimento?: string | null
  idade?: number | null
}

export interface ContractTemplatePreviewTenant {
  nome?: string | null
  slug?: string | null
  responsavel_nome?: string | null
  responsavel_email?: string | null
  responsavel_telefone?: string | null
  oab_estado?: string | null
  oab_numero?: string | null
}

export const CONTRACT_TEMPLATE_PLACEHOLDERS: ContractTemplatePlaceholderDefinition[] = [
  { key: 'cliente_nome', label: 'Nome do cliente', description: 'Nome completo do lead.' },
  { key: 'cliente_cpf', label: 'CPF do cliente', description: 'CPF do lead, quando disponível.' },
  { key: 'cliente_telefone', label: 'Telefone do cliente', description: 'Telefone principal do lead.' },
  { key: 'cliente_email', label: 'E-mail do cliente', description: 'E-mail do lead, quando disponível.' },
  { key: 'cliente_nb', label: 'NB do cliente', description: 'NB do benefício, quando existir.' },
  { key: 'cliente_data_nascimento', label: 'Nascimento do cliente', description: 'Data de nascimento em formato brasileiro.' },
  { key: 'cliente_idade', label: 'Idade do cliente', description: 'Idade atual do lead.' },
  { key: 'escritorio_nome', label: 'Nome do escritório', description: 'Nome do tenant/escritório.' },
  { key: 'escritorio_slug', label: 'Slug do escritório', description: 'Identificador técnico do tenant.' },
  { key: 'responsavel_nome', label: 'Nome do responsável', description: 'Nome do responsável do escritório.' },
  { key: 'responsavel_email', label: 'E-mail do responsável', description: 'E-mail principal do escritório.' },
  { key: 'responsavel_telefone', label: 'Telefone do responsável', description: 'Telefone do responsável do escritório.' },
  { key: 'responsavel_oab', label: 'OAB do responsável', description: 'OAB formatada com estado e número.' },
  { key: 'data_hoje', label: 'Data de hoje', description: 'Data atual em DD/MM/AAAA.' },
  { key: 'data_hoje_extenso', label: 'Data de hoje por extenso', description: 'Data atual por extenso em português.' },
]

const PLACEHOLDER_MAP = new Map(CONTRACT_TEMPLATE_PLACEHOLDERS.map((item) => [item.key, item]))

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

export function getContractPlaceholderDefinition(key: string) {
  return PLACEHOLDER_MAP.get(key) || null
}

export function getContractTemplatePlaceholders() {
  return CONTRACT_TEMPLATE_PLACEHOLDERS
}

export function buildContractTemplateData(
  lead: ContractTemplatePreviewLead,
  tenant: ContractTemplatePreviewTenant,
) {
  const now = new Date()
  const oabParts = [tenant.oab_estado || '', tenant.oab_numero || ''].filter(Boolean)

  return {
    cliente_nome: lead.nome || '',
    cliente_cpf: lead.cpf || '',
    cliente_telefone: lead.telefone || '',
    cliente_email: lead.email || '',
    cliente_nb: lead.nb || '',
    cliente_data_nascimento: formatDate(lead.data_nascimento),
    cliente_idade: lead.idade != null ? String(lead.idade) : '',
    escritorio_nome: tenant.nome || '',
    escritorio_slug: tenant.slug || '',
    responsavel_nome: tenant.responsavel_nome || '',
    responsavel_email: tenant.responsavel_email || '',
    responsavel_telefone: tenant.responsavel_telefone || '',
    responsavel_oab: oabParts.length > 0 ? oabParts.join('/') : '',
    data_hoje: now.toLocaleDateString('pt-BR'),
    data_hoje_extenso: now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  } satisfies Record<string, string>
}

export function renderContractTemplate(
  bodyHtml: string,
  values: Record<string, string>,
) {
  return bodyHtml.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return values[key] ?? ''
  })
}

export function getPagliucaPlanningTemplateBody() {
  return [
    '<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.65; padding: 32px;">',
    '<h1 style="font-size: 22px; margin-bottom: 8px;">Contrato de Honorários — Planejamento Previdenciário</h1>',
    '<p style="margin: 0 0 18px;">Minuta inicial para revisão jurídica antes do go-live.</p>',
    '<p><strong>Cliente:</strong> {{cliente_nome}}</p>',
    '<p><strong>CPF:</strong> {{cliente_cpf}}</p>',
    '<p><strong>Telefone:</strong> {{cliente_telefone}}</p>',
    '<p><strong>E-mail:</strong> {{cliente_email}}</p>',
    '<hr style="margin: 24px 0; border: none; border-top: 1px solid #d1d5db;" />',
    '<p><strong>Escritório:</strong> {{escritorio_nome}}</p>',
    '<p><strong>Responsável:</strong> {{responsavel_nome}}</p>',
    '<p><strong>OAB:</strong> {{responsavel_oab}}</p>',
    '<p><strong>Data:</strong> {{data_hoje_extenso}}</p>',
    '<hr style="margin: 24px 0; border: none; border-top: 1px solid #d1d5db;" />',
    '<p><strong>TODO:</strong> inserir aqui a redação jurídica definitiva do contrato de honorários de planejamento previdenciário.</p>',
    '<p>Esta minuta serve como base inicial para o tenant Pagliuca, Espínola e Lessnau no piloto comercial.</p>',
    '</div>',
  ].join('')
}

export function shouldSeedPagliucaPlanningTemplate(tenant: ContractTemplateSeedTenant) {
  const slug = String(tenant.slug || '').trim().toLowerCase()
  const email = String(tenant.responsavel_email || '').trim().toLowerCase()
  return slug === 'pagliuca-espinola-e-lessnau' || email === 'anaterra@advocaciacomproposito.com.br'
}
