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
  - reteste completo de campanha + resposta + continuação do agente ainda precisa ser confirmado em produção depois do último pacote de correções

## O que está funcionando

- importador enriquecido com contato de abordagem e contatos relacionados
- templates de campanha por perfil operacional e tipo de contato
- separação de conversas por usuário / carteira
- Google Calendar operacional
- criação de lead manual sem CPF

## O que está quebrado ou incompleto

- confirmar em runtime se:
  - campanha `Somente titular` voltou a enviar em leads manuais/legados
  - resposta do lead aciona continuação automática do agente
  - mensagem enviada diretamente pelo celular do escritório aparece na mesma thread
- memória operacional de tenant e de conversa para agentes ainda não foi estruturada como camada formal
- `email` em `leads` segue adiado para a futura frente de mail marketing com Resend

## Próximos 3 blocos

1. retestar campanha ponta a ponta (`disparo -> resposta -> continuação do agente`)
2. criar memória curta nativa por tenant e por conversa para os agentes
3. abrir a frente controlada de `email + Resend` para planejamento previdenciário

## Para retomar sem atrito

- ler [MASTER.md](/Users/cauafarias/Downloads/prevlegal/docs/MASTER.md) se precisar de regra estrutural
- ler [LEARNINGS.md](/Users/cauafarias/Downloads/prevlegal/docs/LEARNINGS.md) se o problema parecer recorrente
- ler [HANDOFF.md](/Users/cauafarias/Downloads/prevlegal/docs/HANDOFF.md) para a última janela operacional
