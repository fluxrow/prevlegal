# PrevLegal — STATE

> Arquivo curto para bootstrap de contexto com baixo custo de token.

## Estado atual confiável

- status geral: produto em reta final de go-live funcional
- build / deploy: `npm run build` passou após o pacote de correção de campanha + autoresponder + Z-API `fromMe`
- fluxo principal validado:
  - importação enriquecida por CPF + nome
  - inbox pessoal por carteira
  - Z-API outbound e inbound
  - campanhas por lista e contatos específicos
  - campanhas por tipo de contato (`titular`, `conjuge`, `filho`, `irmao`)
- maior risco atual:
  - reteste completo de campanha + resposta + continuação do agente ainda precisa ser confirmado em produção depois do ajuste da estratégia de continuidade para benefícios previdenciários e do fallback explícito quando o auto-responder falhar

## O que está funcionando

- importador enriquecido com contato de abordagem e contatos relacionados
- templates de campanha por perfil operacional e tipo de contato
- separação de conversas por usuário / carteira
- Google Calendar operacional
- criação de lead manual sem CPF

## O que está quebrado ou incompleto

- confirmar em runtime se:
  - resposta do lead aciona continuação automática do agente depois do aumento do timeout interno do auto-responder
  - mensagem enviada diretamente pelo celular do escritório aparece na mesma thread de forma consistente
- memória operacional de tenant e de conversa para agentes ainda não foi estruturada como camada formal
- `email` em `leads` segue adiado para a futura frente de mail marketing com Resend
- Anthropic está com saldo insuficiente no ambiente operacional atual; enquanto isso, o agente não conseguirá continuar conversas automaticamente
- agente do WhatsApp não deve usar emojis; a remoção agora é aplicada também no runtime, não só por prompt
- a continuidade do agente em benefícios precisa assumir que a base já veio mapeada para revisão/readequação; em planejamento, a esteira deve poder ir até proposta/contrato antes do handoff humano
- o playbook de planejamento previdenciário ainda precisa de validação em runtime com copy mais consultiva, mais conhecimento técnico geral do cenário brasileiro e limite explícito para não inventar análise individual
- quando o auto-responder falhar por horário, timeout ou provedor, a conversa deve sair do silêncio e cair para humano com notificação explícita
- quando o lead responder fora do horário, o sistema deve enviar mensagem automática de retorno com a janela de atendimento e registrar essa saída na própria thread
- mensagens de campanha enviadas por Z-API não devem duplicar na inbox por causa do espelhamento `fromMe`

## Próximos 3 blocos

1. validar o playbook de `planejamento_previdenciario` até diagnóstico, proposta, contrato e preparação de assinatura
2. criar memória curta nativa por tenant e por conversa para os agentes
3. abrir a frente controlada de `email + Resend` para planejamento previdenciário

## Para retomar sem atrito

- ler [MASTER.md](/Users/cauafarias/Downloads/prevlegal/docs/MASTER.md) se precisar de regra estrutural
- ler [LEARNINGS.md](/Users/cauafarias/Downloads/prevlegal/docs/LEARNINGS.md) se o problema parecer recorrente
- ler [HANDOFF.md](/Users/cauafarias/Downloads/prevlegal/docs/HANDOFF.md) para a última janela operacional
