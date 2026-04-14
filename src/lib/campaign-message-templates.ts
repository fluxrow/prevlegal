import {
  DEFAULT_OPERATION_PROFILE,
  normalizeOperationProfile,
  type OperationProfile,
} from "@/lib/operation-profile";

function buildFamilyMessage(profile: OperationProfile) {
  if (profile === "planejamento_previdenciario") {
    return "Olá! Estou tentando falar com um familiar de {nome} sobre organização previdenciária e planejamento de aposentadoria. Se você puder me confirmar se é a melhor pessoa para receber esse recado, eu explico de forma breve por aqui."
  }

  return "Olá! Estou tentando falar com um familiar de {nome} sobre uma triagem previdenciária importante. Se você puder me confirmar se é a melhor pessoa para receber esse recado, eu explico de forma breve por aqui."
}

function buildBenefitsTemplate(agentType: string) {
  switch (agentType) {
    case "confirmacao_agenda":
      return "Olá, {nome}. Estou confirmando sua consulta previdenciária já agendada. Se estiver tudo certo para seguir, me responda por aqui e eu deixo a equipe alinhada com você."
    case "reativacao":
      return "Olá, {nome}. Estou retomando seu caso porque ainda pode fazer sentido revisar ou organizar esse ponto previdenciário com calma. Se você quiser, eu te explico em poucas linhas qual seria o próximo passo."
    case "followup_comercial":
      return "Olá, {nome}. Revendo seu caso, acredito que ainda pode valer uma análise previdenciária mais organizada antes de você deixar isso para depois. Se fizer sentido, eu te explico o próximo passo por aqui."
    case "documental":
      return "Olá, {nome}. Estou organizando a parte documental do seu caso previdenciário. Se fizer sentido para você, eu posso te explicar exatamente o que costuma ser mais importante separar primeiro."
    case "triagem":
    default:
      return "Olá, {nome}. Estou entrando em contato porque estamos fazendo uma triagem previdenciária para identificar casos que podem merecer orientação mais cuidadosa sobre benefício, revisão ou pendência no INSS. Se fizer sentido para você, eu posso te explicar em poucas linhas e ver se vale avançar."
  }
}

function buildPlanningTemplate(agentType: string) {
  switch (agentType) {
    case "confirmacao_agenda":
      return "Olá, {nome}. Estou confirmando sua reunião de diagnóstico de planejamento previdenciário. Se estiver tudo certo para seguir, me responda por aqui e eu deixo a equipe alinhada com você."
    case "reativacao":
      return "Olá, {nome}. Estou retomando nosso contato porque talvez ainda faça sentido organizar sua estratégia previdenciária com mais clareza. Se quiser, eu te explico em poucas linhas como funciona o próximo passo."
    case "followup_comercial":
      return "Olá, {nome}. Pelo seu perfil, ainda acredito que vale uma conversa estratégica sobre planejamento previdenciário e aposentadoria futura. Se fizer sentido, eu já te explico como funciona esse diagnóstico."
    case "documental":
      return "Olá, {nome}. Estou organizando a etapa documental do seu diagnóstico de planejamento previdenciário. Se quiser, eu posso te orientar sobre o que normalmente faz mais diferença separar primeiro."
    case "triagem":
    default:
      return "Olá, {nome}. Estou entrando em contato porque muita gente contribui para o INSS sem uma estratégia clara de aposentadoria. Se fizer sentido para você, eu posso te explicar em poucas linhas como funciona um diagnóstico de planejamento previdenciário."
  }
}

export function buildCampaignMessageTemplate(
  operationProfile?: string | null | undefined,
  agentType?: string | null | undefined,
  contactTargetType?: string | null | undefined,
) {
  const profile = normalizeOperationProfile(
    operationProfile || DEFAULT_OPERATION_PROFILE,
  );
  const normalizedAgentType = String(agentType || "triagem").trim().toLowerCase();
  const target = String(contactTargetType || "").trim().toLowerCase();

  if (["conjuge", "filho", "irmao"].includes(target)) {
    return buildFamilyMessage(profile);
  }

  if (profile === "planejamento_previdenciario") {
    return buildPlanningTemplate(normalizedAgentType);
  }

  return buildBenefitsTemplate(normalizedAgentType);
}
