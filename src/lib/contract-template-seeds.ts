import {
  getContractTemplatePlaceholders,
  getPagliucaPlanningTemplateBody,
  shouldSeedPagliucaPlanningTemplate,
  type ContractTemplateSeedTenant,
} from '@/lib/contract-templates'

type QueryError = {
  message: string
}

type ContractTemplateSeedSelectQuery = {
  eq: (column: string, value: string) => ContractTemplateSeedSelectQuery
  limit: (count: number) => ContractTemplateSeedSelectQuery
  maybeSingle: () => PromiseLike<{ data: { id: string } | null; error: QueryError | null }>
}

type ContractTemplateSeedSupabase = {
  from: (table: string) => {
    select: (columns: string) => ContractTemplateSeedSelectQuery
    insert: (values: Record<string, unknown>) => PromiseLike<{ error: QueryError | null }>
  }
}

export async function seedDefaultPlanningContractTemplate(
  supabase: ContractTemplateSeedSupabase,
  tenant: ContractTemplateSeedTenant,
) {
  if (!tenant?.id || !shouldSeedPagliucaPlanningTemplate(tenant)) {
    return
  }

  const nome = 'Contrato de Honorários — Planejamento Previdenciário'
  const tipo = 'honorarios_planejamento'

  const { data: existing, error: existingError } = await supabase
    .from('contract_templates')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('nome', nome)
    .eq('tipo', tipo)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) return

  const body = getPagliucaPlanningTemplateBody()
  const placeholders = getContractTemplatePlaceholders().filter((placeholder) =>
    body.includes(`{{${placeholder.key}}}`),
  )

  const { error } = await supabase
    .from('contract_templates')
    .insert({
      tenant_id: tenant.id,
      nome,
      tipo,
      corpo_html: body,
      placeholders_definidos: placeholders,
      ativo: true,
    })

  if (error) {
    throw new Error(error.message)
  }
}
