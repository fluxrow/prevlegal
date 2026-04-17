import {
  getContractTemplatePlaceholders,
  getPagliucaPlanningTemplateBody,
  shouldSeedPagliucaPlanningTemplate,
  type ContractTemplateSeedTenant,
} from '@/lib/contract-templates'

export async function seedDefaultPlanningContractTemplate(
  supabase: any,
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
