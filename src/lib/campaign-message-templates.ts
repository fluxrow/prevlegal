import {
  DEFAULT_OPERATION_PROFILE,
  type OperationProfile,
  normalizeOperationProfile,
} from "@/lib/operation-profile";

export type CampaignTemplateAgentType =
  | "triagem"
  | "reativacao"
  | "followup_comercial"
  | "documental"
  | "confirmacao_agenda";

export type CampaignTemplateOrigin = "sistema" | "custom";

export type CampaignMessageTemplateLibraryItem = {
  id: string;
  nome: string;
  mensagem: string;
  perfil_operacao: OperationProfile | null;
  agente_tipo: CampaignTemplateAgentType | null;
  contato_alvo_tipo: string | null;
  ativo: boolean;
  origem: CampaignTemplateOrigin;
  created_at?: string | null;
  updated_at?: string | null;
};

type TemplateMap = Record<CampaignTemplateAgentType, string>;

export const CAMPAIGN_AGENT_TEMPLATE_OPTIONS: Array<{
  value: CampaignTemplateAgentType;
  label: string;
}> = [
  { value: "triagem", label: "Triagem" },
  { value: "reativacao", label: "Reativação" },
  { value: "followup_comercial", label: "Follow-up comercial" },
  { value: "documental", label: "Documental" },
  { value: "confirmacao_agenda", label: "Confirmação de agenda" },
];

const ALLOWED_CONTACT_TARGET_TYPES = new Set([
  "titular",
  "conjuge",
  "filho",
  "irmao",
]);

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
    "Olá, {nome}. Estou entrando em contato porque muitas pessoas com carreira consolidada contribuem para o INSS sem revisar a estratégia previdenciária com a profundidade que o tema exige. Se fizer sentido para você, eu posso te explicar em poucas linhas como funciona um diagnóstico de planejamento previdenciário e ver se isso faz sentido para o seu momento.",
  reativacao:
    "Olá, {nome}. Estou retomando nosso contato porque talvez ainda faça sentido revisar sua estratégia previdenciária com mais clareza. Se você quiser, eu te explico em poucas linhas como costuma funcionar o próximo passo de um diagnóstico bem feito.",
  followup_comercial:
    "Olá, {nome}. Pelo que conversamos, ainda faz sentido avançar com uma conversa estratégica de planejamento previdenciário. Se você quiser, eu te explico de forma objetiva como funciona o diagnóstico, a proposta e os próximos passos até a formalização.",
  documental:
    "Olá, {nome}. Estou organizando a etapa documental do seu diagnóstico de planejamento previdenciário. Se quiser, eu posso te orientar com clareza sobre quais documentos costumam fazer mais diferença separar primeiro e por quê.",
  confirmacao_agenda:
    "Olá, {nome}. Estou confirmando sua reunião de diagnóstico de planejamento previdenciário. Se estiver tudo certo para seguir, me responda por aqui e eu deixo a equipe alinhada com você.",
};

const PLANNING_FAMILY_TEMPLATES: TemplateMap = {
  triagem:
    "Olá. Estou tentando falar com um familiar de {nome} sobre organização previdenciária e planejamento de aposentadoria. Se você puder me confirmar se é a melhor pessoa para receber esse recado, eu explico de forma breve e respeitosa por aqui.",
  reativacao:
    "Olá. Estou retomando um contato relacionado a um familiar de {nome} sobre planejamento previdenciário e organização de aposentadoria. Se você for a melhor pessoa para receber esse recado, eu posso resumir o contexto por aqui.",
  followup_comercial:
    "Olá. Estou tentando alinhar com um familiar de {nome} se ainda faz sentido avançar numa conversa de planejamento previdenciário. Se você puder confirmar se é a pessoa mais adequada para isso, eu explico de forma breve como funciona o próximo passo.",
  documental:
    "Olá. Estou tentando organizar com um familiar de {nome} a etapa documental de um diagnóstico de planejamento previdenciário. Se você for a pessoa mais adequada para receber esse recado, eu explico com clareza o próximo passo e o que costuma ser necessário separar.",
  confirmacao_agenda:
    "Olá. Estou tentando confirmar uma reunião de diagnóstico de planejamento previdenciário relacionada a um familiar de {nome}. Se você puder me dizer se é a melhor pessoa para receber esse recado, eu explico rapidamente por aqui.",
};

function resolveTemplate(
  agentType: CampaignTemplateAgentType,
  directTemplates: TemplateMap,
  familyTemplates: TemplateMap,
  target: string,
) {
  const isFamilyTarget = ["conjuge", "filho", "irmao"].includes(target);
  return isFamilyTarget
    ? familyTemplates[agentType]
    : directTemplates[agentType];
}

export function normalizeCampaignTemplateAgentType(
  value: string | null | undefined,
): CampaignTemplateAgentType | null {
  const normalized = String(value || "").trim().toLowerCase();
  return CAMPAIGN_AGENT_TEMPLATE_OPTIONS.some(
    (option) => option.value === normalized,
  )
    ? (normalized as CampaignTemplateAgentType)
    : null;
}

export function normalizeCampaignTemplateOperationProfile(
  value: string | null | undefined,
): OperationProfile | null {
  const normalized = String(value || "").trim();
  return normalized ? normalizeOperationProfile(normalized) : null;
}

export function normalizeCampaignTemplateContactTarget(
  value: string | null | undefined,
): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  return ALLOWED_CONTACT_TARGET_TYPES.has(normalized) ? normalized : null;
}

export function getCampaignTemplateAgentLabel(
  value: string | null | undefined,
) {
  const normalized = normalizeCampaignTemplateAgentType(value);
  return (
    CAMPAIGN_AGENT_TEMPLATE_OPTIONS.find((option) => option.value === normalized)
      ?.label || "Template livre"
  );
}

export function buildCampaignMessageTemplate(
  operationProfile?: string | null | undefined,
  agentType?: string | null | undefined,
  contactTargetType?: string | null | undefined,
) {
  const profile = normalizeOperationProfile(
    operationProfile || DEFAULT_OPERATION_PROFILE,
  );
  const normalizedAgentType =
    normalizeCampaignTemplateAgentType(agentType) || "triagem";
  const target = normalizeCampaignTemplateContactTarget(contactTargetType) || "";

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

export function getCampaignSystemTemplates(
  operationProfile?: string | null | undefined,
  contactTargetType?: string | null | undefined,
): CampaignMessageTemplateLibraryItem[] {
  const normalizedOperationProfile =
    normalizeCampaignTemplateOperationProfile(operationProfile) ||
    DEFAULT_OPERATION_PROFILE;
  const normalizedContactTarget =
    normalizeCampaignTemplateContactTarget(contactTargetType);

  return CAMPAIGN_AGENT_TEMPLATE_OPTIONS.map((option) => ({
    id: `system:${normalizedOperationProfile}:${normalizedContactTarget || "geral"}:${option.value}`,
    nome: option.label,
    mensagem: buildCampaignMessageTemplate(
      normalizedOperationProfile,
      option.value,
      normalizedContactTarget,
    ),
    perfil_operacao: normalizedOperationProfile,
    agente_tipo: option.value,
    contato_alvo_tipo: normalizedContactTarget,
    ativo: true,
    origem: "sistema",
  }));
}
