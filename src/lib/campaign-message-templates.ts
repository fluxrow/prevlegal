import {
  DEFAULT_OPERATION_PROFILE,
  normalizeOperationProfile,
  type OperationProfile,
} from "@/lib/operation-profile";

type TemplateMap = Record<string, string>;

const BENEFITS_TITULAR_TEMPLATES: TemplateMap = {
  triagem:
    "Olá, {nome}. Estou entrando em contato porque identificamos uma possibilidade previdenciária importante de revisão ou readequação do seu benefício. Se fizer sentido para você, eu posso te explicar isso em poucas linhas por aqui e ver se vale avançar.",
  reativacao:
    "Olá, {nome}. Estou retomando este contato porque ficou pendente uma informação previdenciária importante sobre uma possível revisão do seu benefício. Se você quiser, eu posso te resumir por aqui o que vale entender antes de avançar.",
  followup_comercial:
    "Olá, {nome}. Como já existe interesse no seu caso, o próximo passo mais seguro é organizar sua conversa com a equipe jurídica responsável. Se fizer sentido, eu deixo isso encaminhado de forma simples por aqui.",
  documental:
    "Olá, {nome}. Para avançar com segurança no seu caso, o próximo passo é organizar alguns documentos básicos do benefício. Se quiser, eu te digo exatamente o que costuma ser mais importante separar primeiro.",
  confirmacao_agenda:
    "Olá, {nome}. Estou confirmando seu atendimento sobre a revisão ou readequação do benefício. Se estiver tudo certo para seguir, me responda por aqui e eu deixo a equipe alinhada com você.",
};

const BENEFITS_FAMILY_TEMPLATES: TemplateMap = {
  triagem:
    "Olá. Estou tentando falar com um familiar responsável por {nome} sobre uma possibilidade previdenciária importante de revisão ou readequação do benefício dele(a). Se você puder me confirmar se é a melhor pessoa para receber esse recado, eu explico em poucas linhas por aqui.",
  reativacao:
    "Olá. Estou retomando um contato relacionado a um familiar de {nome} porque ficou pendente uma informação previdenciária importante sobre o benefício dele(a). Se você for a pessoa mais adequada para receber esse recado, eu posso resumir o contexto por aqui.",
  followup_comercial:
    "Olá. Estou tentando alinhar com um familiar responsável por {nome} se ainda faz sentido avançar para uma conversa com a equipe jurídica sobre o benefício dele(a). Se você puder me confirmar se é a melhor pessoa para isso, eu explico de forma breve.",
  documental:
    "Olá. Estou tentando organizar com um familiar de {nome} os documentos básicos para avançar com segurança no caso previdenciário dele(a). Se você for a pessoa mais adequada para receber esse recado, eu explico com clareza o próximo passo por aqui.",
  confirmacao_agenda:
    "Olá. Estou tentando confirmar um atendimento relacionado ao caso previdenciário de {nome}. Se você puder me dizer se é a melhor pessoa para receber esse recado, eu explico rapidamente por aqui.",
};

const PLANNING_TITULAR_TEMPLATES: TemplateMap = {
  triagem:
    "Olá, {nome}. Estou entrando em contato porque muita gente contribui para o INSS sem uma estratégia clara de aposentadoria. Se fizer sentido para você, eu posso te explicar em poucas linhas como funciona um diagnóstico de planejamento previdenciário.",
  reativacao:
    "Olá, {nome}. Estou retomando nosso contato porque talvez ainda faça sentido organizar sua estratégia previdenciária com mais clareza. Se você quiser, eu te explico em poucas linhas como funciona o próximo passo.",
  followup_comercial:
    "Olá, {nome}. Pelo seu perfil, ainda acredito que vale uma conversa estratégica sobre planejamento previdenciário e aposentadoria futura. Se fizer sentido, eu já te explico como funciona esse diagnóstico.",
  documental:
    "Olá, {nome}. Estou organizando a etapa documental do seu diagnóstico de planejamento previdenciário. Se quiser, eu posso te orientar sobre o que normalmente faz mais diferença separar primeiro.",
  confirmacao_agenda:
    "Olá, {nome}. Estou confirmando sua reunião de diagnóstico de planejamento previdenciário. Se estiver tudo certo para seguir, me responda por aqui e eu deixo a equipe alinhada com você.",
};

const PLANNING_FAMILY_TEMPLATES: TemplateMap = {
  triagem:
    "Olá. Estou tentando falar com um familiar de {nome} sobre organização previdenciária e planejamento de aposentadoria. Se você puder me confirmar se é a melhor pessoa para receber esse recado, eu explico de forma breve por aqui.",
  reativacao:
    "Olá. Estou retomando um contato relacionado a um familiar de {nome} sobre planejamento previdenciário e organização de aposentadoria. Se você for a melhor pessoa para receber esse recado, eu posso resumir por aqui.",
  followup_comercial:
    "Olá. Estou tentando alinhar com um familiar de {nome} se ainda faz sentido avançar numa conversa de planejamento previdenciário. Se você puder confirmar se é a pessoa mais adequada para isso, eu explico de forma breve.",
  documental:
    "Olá. Estou tentando organizar com um familiar de {nome} a etapa documental de um diagnóstico de planejamento previdenciário. Se você for a pessoa mais adequada para receber esse recado, eu explico com clareza o próximo passo.",
  confirmacao_agenda:
    "Olá. Estou tentando confirmar uma reunião de diagnóstico de planejamento previdenciário relacionada a um familiar de {nome}. Se você puder me dizer se é a melhor pessoa para receber esse recado, eu explico rapidamente por aqui.",
};

function resolveTemplate(
  agentType: string,
  directTemplates: TemplateMap,
  familyTemplates: TemplateMap,
  target: string,
) {
  const normalizedAgentType = agentType in directTemplates ? agentType : "triagem";
  const isFamilyTarget = ["conjuge", "filho", "irmao"].includes(target);
  return isFamilyTarget
    ? familyTemplates[normalizedAgentType]
    : directTemplates[normalizedAgentType];
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

  if (profile === "planejamento_previdenciario") {
    return resolveTemplate(
      normalizedAgentType,
      PLANNING_TITULAR_TEMPLATES,
      PLANNING_FAMILY_TEMPLATES,
      target,
    );
  }

  return resolveTemplate(
    normalizedAgentType,
    BENEFITS_TITULAR_TEMPLATES,
    BENEFITS_FAMILY_TEMPLATES,
    target,
  );
}
