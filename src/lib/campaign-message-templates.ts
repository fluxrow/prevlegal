export function buildCampaignMessageTemplate(agentType: string | null | undefined) {
  const normalized = String(agentType || "triagem").trim().toLowerCase()

  switch (normalized) {
    case "confirmacao_agenda":
      return "Olá {nome}! Passando para confirmar seu compromisso com o escritório. Se estiver tudo certo para seguir, me responda por aqui e eu deixo a equipe alinhada com você."
    case "reativacao":
      return "Olá {nome}! Retomando seu contato com o escritório. Ainda faz sentido avançar no seu caso neste momento? Se quiser, eu organizo o próximo passo de forma simples."
    case "followup_comercial":
      return "Olá {nome}! Pelo histórico do seu caso, acredito que vale retomarmos este ponto com mais clareza. Se fizer sentido para você, eu já deixo o próximo passo encaminhado."
    case "documental":
      return "Olá {nome}! Estou organizando a parte documental do seu caso. Se quiser, eu posso te explicar exatamente o que falta e como enviar da forma mais simples."
    case "triagem":
    default:
      return "Olá {nome}! Recebi seu contato e posso te ajudar a organizar o próximo passo do seu atendimento previdenciário. Se quiser, me conta em uma frase qual é a sua principal dúvida hoje."
  }
}
