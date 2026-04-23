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

export interface ExtractedClientData {
  cliente_nome: string | null
  cliente_nacionalidade: string | null
  cliente_estado_civil: string | null
  cliente_profissao: string | null
  cliente_cpf: string | null
  cliente_rg: string | null
  cliente_email: string | null
  cliente_endereco_rua: string | null
  cliente_endereco_numero: string | null
  cliente_bairro: string | null
  cliente_cidade: string | null
  cliente_cep: string | null
}

export type ContractManualValues = Partial<Record<string, string | null | undefined>>

export const EMPTY_EXTRACTED_CLIENT_DATA: ExtractedClientData = {
  cliente_nome: null,
  cliente_nacionalidade: null,
  cliente_estado_civil: null,
  cliente_profissao: null,
  cliente_cpf: null,
  cliente_rg: null,
  cliente_email: null,
  cliente_endereco_rua: null,
  cliente_endereco_numero: null,
  cliente_bairro: null,
  cliente_cidade: null,
  cliente_cep: null,
}

export const CONTRACT_TEMPLATE_PLACEHOLDERS: ContractTemplatePlaceholderDefinition[] = [
  { key: 'cliente_nome', label: 'Nome do cliente', description: 'Nome completo do lead.' },
  { key: 'cliente_nacionalidade', label: 'Nacionalidade do cliente', description: 'Nacionalidade explicitamente informada pelo cliente.' },
  { key: 'cliente_estado_civil', label: 'Estado civil do cliente', description: 'Estado civil informado pelo cliente.' },
  { key: 'cliente_profissao', label: 'Profissão do cliente', description: 'Profissão atual informada pelo cliente.' },
  { key: 'cliente_cpf', label: 'CPF do cliente', description: 'CPF do lead, quando disponível.' },
  { key: 'cliente_rg', label: 'RG do cliente', description: 'RG do cliente, quando informado durante a conversa.' },
  { key: 'cliente_telefone', label: 'Telefone do cliente', description: 'Telefone principal do lead.' },
  { key: 'cliente_email', label: 'E-mail do cliente', description: 'E-mail do lead, quando disponível.' },
  { key: 'cliente_nb', label: 'NB do cliente', description: 'NB do benefício, quando existir.' },
  { key: 'cliente_data_nascimento', label: 'Nascimento do cliente', description: 'Data de nascimento em formato brasileiro.' },
  { key: 'cliente_idade', label: 'Idade do cliente', description: 'Idade atual do lead.' },
  { key: 'cliente_endereco_rua', label: 'Rua do cliente', description: 'Rua do endereço informado pelo cliente.' },
  { key: 'cliente_endereco_numero', label: 'Número do endereço', description: 'Número do endereço informado pelo cliente.' },
  { key: 'cliente_bairro', label: 'Bairro do cliente', description: 'Bairro do endereço informado pelo cliente.' },
  { key: 'cliente_cidade', label: 'Cidade do cliente', description: 'Cidade do endereço informado pelo cliente.' },
  { key: 'cliente_cep', label: 'CEP do cliente', description: 'CEP do endereço informado pelo cliente.' },
  { key: 'cliente_endereco', label: 'Endereço completo do cliente', description: 'Endereço completo em uma única linha, montado a partir dos dados extraídos ou preenchidos manualmente.' },
  { key: 'escritorio_nome', label: 'Nome do escritório', description: 'Nome do tenant/escritório.' },
  { key: 'escritorio_slug', label: 'Slug do escritório', description: 'Identificador técnico do tenant.' },
  { key: 'responsavel_nome', label: 'Nome do responsável', description: 'Nome do responsável do escritório.' },
  { key: 'responsavel_email', label: 'E-mail do responsável', description: 'E-mail principal do escritório.' },
  { key: 'responsavel_telefone', label: 'Telefone do responsável', description: 'Telefone do responsável do escritório.' },
  { key: 'responsavel_oab', label: 'OAB do responsável', description: 'OAB formatada com estado e número.' },
  { key: 'valor_total', label: 'Valor total do contrato', description: 'Valor total dos honorários pactuados, formatado em reais.' },
  { key: 'valor_total_extenso', label: 'Valor total por extenso', description: 'Valor total dos honorários escrito por extenso.' },
  { key: 'numero_parcelas_extenso', label: 'Parcelamento por extenso', description: 'Forma de parcelamento escrita por extenso, como até 10x no boleto.' },
  { key: 'valor_primeira_parcela', label: 'Valor da primeira parcela', description: 'Valor da primeira parcela ou entrada prevista no contrato.' },
  { key: 'valor_primeira_parcela_extenso', label: 'Primeira parcela por extenso', description: 'Valor da primeira parcela escrito por extenso.' },
  { key: 'datas_parcelas', label: 'Datas das parcelas', description: 'Lista de datas das parcelas futuras, separadas por vírgula.' },
  { key: 'data_contrato_extenso', label: 'Data do contrato por extenso', description: 'Cidade e data da assinatura por extenso.' },
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

function formatDateExtenso(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function normalizeTemplateValue(value: string | null | undefined) {
  if (value == null) return ''
  const normalized = String(value).trim()
  return normalized
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = normalizeTemplateValue(value)
    if (normalized) return normalized
  }

  return ''
}

function buildCombinedAddress(parts: {
  rua: string
  numero: string
  bairro: string
  cidade: string
  cep: string
}) {
  const tokens = [
    parts.rua ? `${parts.rua}${parts.numero ? `, ${parts.numero}` : ''}` : '',
    parts.bairro,
    parts.cidade,
    parts.cep,
  ].filter(Boolean)

  return tokens.join(' - ')
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
  extractedClientData: Partial<ExtractedClientData> = EMPTY_EXTRACTED_CLIENT_DATA,
  manualValues: ContractManualValues = {},
) {
  const now = new Date()
  const oabParts = [tenant.oab_estado || '', tenant.oab_numero || ''].filter(Boolean)
  const clienteEnderecoRua = pickFirstNonEmpty(
    manualValues.cliente_endereco_rua,
    extractedClientData.cliente_endereco_rua,
  )
  const clienteEnderecoNumero = pickFirstNonEmpty(
    manualValues.cliente_endereco_numero,
    extractedClientData.cliente_endereco_numero,
  )
  const clienteBairro = pickFirstNonEmpty(
    manualValues.cliente_bairro,
    extractedClientData.cliente_bairro,
  )
  const clienteCidade = pickFirstNonEmpty(
    manualValues.cliente_cidade,
    extractedClientData.cliente_cidade,
  )
  const clienteCep = pickFirstNonEmpty(
    manualValues.cliente_cep,
    extractedClientData.cliente_cep,
  )
  const clienteEndereco = pickFirstNonEmpty(
    manualValues.cliente_endereco,
    buildCombinedAddress({
      rua: clienteEnderecoRua,
      numero: clienteEnderecoNumero,
      bairro: clienteBairro,
      cidade: clienteCidade,
      cep: clienteCep,
    }),
  )

  return {
    cliente_nome: pickFirstNonEmpty(manualValues.cliente_nome, extractedClientData.cliente_nome, lead.nome),
    cliente_nacionalidade: pickFirstNonEmpty(manualValues.cliente_nacionalidade, extractedClientData.cliente_nacionalidade),
    cliente_estado_civil: pickFirstNonEmpty(manualValues.cliente_estado_civil, extractedClientData.cliente_estado_civil),
    cliente_profissao: pickFirstNonEmpty(manualValues.cliente_profissao, extractedClientData.cliente_profissao),
    cliente_cpf: pickFirstNonEmpty(manualValues.cliente_cpf, extractedClientData.cliente_cpf, lead.cpf),
    cliente_rg: pickFirstNonEmpty(manualValues.cliente_rg, extractedClientData.cliente_rg),
    cliente_telefone: pickFirstNonEmpty(manualValues.cliente_telefone, lead.telefone),
    cliente_email: pickFirstNonEmpty(manualValues.cliente_email, extractedClientData.cliente_email, lead.email),
    cliente_nb: pickFirstNonEmpty(manualValues.cliente_nb, lead.nb),
    cliente_data_nascimento: formatDate(lead.data_nascimento),
    cliente_idade: lead.idade != null ? String(lead.idade) : '',
    cliente_endereco_rua: clienteEnderecoRua,
    cliente_endereco_numero: clienteEnderecoNumero,
    cliente_bairro: clienteBairro,
    cliente_cidade: clienteCidade,
    cliente_cep: clienteCep,
    cliente_endereco: clienteEndereco,
    escritorio_nome: pickFirstNonEmpty(manualValues.escritorio_nome, tenant.nome),
    escritorio_slug: pickFirstNonEmpty(manualValues.escritorio_slug, tenant.slug),
    responsavel_nome: pickFirstNonEmpty(manualValues.responsavel_nome, tenant.responsavel_nome),
    responsavel_email: pickFirstNonEmpty(manualValues.responsavel_email, tenant.responsavel_email),
    responsavel_telefone: pickFirstNonEmpty(manualValues.responsavel_telefone, tenant.responsavel_telefone),
    responsavel_oab: oabParts.length > 0 ? oabParts.join('/') : '',
    valor_total: pickFirstNonEmpty(manualValues.valor_total),
    valor_total_extenso: pickFirstNonEmpty(manualValues.valor_total_extenso),
    numero_parcelas_extenso: pickFirstNonEmpty(manualValues.numero_parcelas_extenso),
    valor_primeira_parcela: pickFirstNonEmpty(manualValues.valor_primeira_parcela),
    valor_primeira_parcela_extenso: pickFirstNonEmpty(manualValues.valor_primeira_parcela_extenso),
    datas_parcelas: pickFirstNonEmpty(manualValues.datas_parcelas),
    data_contrato_extenso: pickFirstNonEmpty(manualValues.data_contrato_extenso),
    data_hoje: now.toLocaleDateString('pt-BR'),
    data_hoje_extenso: formatDateExtenso(now),
  } satisfies Record<string, string>
}

export function extractPlaceholdersFromBody(bodyHtml: string) {
  const matches = bodyHtml.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)
  return Array.from(new Set(Array.from(matches, (match) => match[1])))
}

export function getMissingTemplateFields(
  placeholderKeys: string[],
  values: Record<string, string>,
) {
  return placeholderKeys.filter((key) => !normalizeTemplateValue(values[key]))
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
