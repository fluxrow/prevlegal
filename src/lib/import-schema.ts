export type ImportCanonicalField =
  | 'nb'
  | 'nome'
  | 'cpf'
  | 'telefone'
  | 'email'
  | 'aps'
  | 'banco'
  | 'dib'
  | 'tipo_beneficio'
  | 'valor_rma'
  | 'status'
  | 'ganho_potencial'
  | 'cidade'
  | 'categoria_profissional'

export type ImportDetectionMode = 'header_mapping' | 'legacy_fixed'

export type ImportDetectionSummary = {
  mode: ImportDetectionMode
  headerRowIndex: number | null
  fieldMap: Partial<Record<ImportCanonicalField, number>>
  detectedFields: ImportCanonicalField[]
  missingCoreFields: ImportCanonicalField[]
  coreStrategy: 'nb_nome' | 'cpf_nome' | 'none'
}

const HEADER_ALIASES: Record<ImportCanonicalField, string[]> = {
  nb: ['nb', 'numero beneficio', 'n beneficio', 'beneficio', 'numero do beneficio'],
  nome: ['nome', 'nome completo', 'cliente', 'segurado', 'beneficiario'],
  cpf: ['cpf', 'documento', 'cpf cliente', 'cpf do cliente'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'contato', 'telefone whatsapp'],
  email: ['email', 'e-mail', 'mail'],
  aps: ['aps', 'agencia', 'agencia aps'],
  banco: ['banco', 'instituicao financeira', 'instituicao'],
  dib: ['dib', 'data inicio beneficio', 'data de inicio do beneficio', 'inicio beneficio'],
  tipo_beneficio: ['tipo', 'tipo beneficio', 'especie', 'beneficio tipo', 'categoria beneficio'],
  valor_rma: ['rma', 'valor rma', 'valor mensal', 'renda mensal', 'rma atual'],
  status: ['status', 'situacao', 'status beneficio', 'beneficio status'],
  ganho_potencial: ['ganho', 'ganho potencial', 'potencial', 'valor potencial', 'ganho estimado'],
  cidade: ['cidade', 'municipio', 'localidade'],
  categoria_profissional: ['profissao', 'categoria profissional', 'ocupacao', 'segmento'],
}

function normalizeHeader(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function scoreCellAgainstAliases(cell: string, aliases: string[]) {
  return aliases.some((alias) => {
    if (cell === alias) return true

    if (alias.includes(' ')) {
      return cell.includes(alias)
    }

    const aliasPattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}(\\s|\\d|$)`)
    return aliasPattern.test(cell)
  })
}

function buildFieldMapFromHeaderRow(row: unknown[]) {
  const normalizedCells = row.map((cell) => normalizeHeader(cell))
  const fieldMap: Partial<Record<ImportCanonicalField, number>> = {}

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[ImportCanonicalField, string[]]>) {
    const index = normalizedCells.findIndex((cell) => cell && scoreCellAgainstAliases(cell, aliases))
    if (index >= 0) {
      fieldMap[field] = index
    }
  }

  return fieldMap
}

export function detectImportSchema(rows: unknown[][]): ImportDetectionSummary {
  let bestHeaderRowIndex: number | null = null
  let bestFieldMap: Partial<Record<ImportCanonicalField, number>> = {}

  for (let index = 0; index < Math.min(rows.length, 6); index++) {
    const row = rows[index] || []
    const fieldMap = buildFieldMapFromHeaderRow(row)

    if (Object.keys(fieldMap).length > Object.keys(bestFieldMap).length) {
      bestFieldMap = fieldMap
      bestHeaderRowIndex = index
    }
  }

  const detectedFields = Object.keys(bestFieldMap) as ImportCanonicalField[]
  const hasNbNome = 'nb' in bestFieldMap && 'nome' in bestFieldMap
  const hasCpfNome = 'cpf' in bestFieldMap && 'nome' in bestFieldMap
  const hasHeaderMapping = detectedFields.length >= 2 && (hasNbNome || hasCpfNome)
  const coreStrategy = hasNbNome ? 'nb_nome' : hasCpfNome ? 'cpf_nome' : 'none'

  if (hasHeaderMapping) {
    const requiredCoreFields: ImportCanonicalField[] = coreStrategy === 'nb_nome' ? ['nb', 'nome'] : ['cpf', 'nome']
    return {
      mode: 'header_mapping',
      headerRowIndex: bestHeaderRowIndex,
      fieldMap: bestFieldMap,
      detectedFields,
      missingCoreFields: requiredCoreFields.filter((field) => !(field in bestFieldMap)),
      coreStrategy,
    }
  }

  return {
    mode: 'legacy_fixed',
    headerRowIndex: null,
    fieldMap: {},
    detectedFields: [],
    missingCoreFields: [],
    coreStrategy: 'none',
  }
}

export function getMappedCell(
  row: unknown[],
  schema: ImportDetectionSummary,
  field: ImportCanonicalField,
): unknown {
  const index = schema.fieldMap[field]
  if (index === undefined) return null
  return row[index] ?? null
}
