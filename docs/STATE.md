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
  - lead agora pode carregar contatos familiares estruturados (`conjuge`, `filho`, `irmao`) e o dispatch por tipo de contato passa a mirar esses campos
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
- o reteste do disparo por `filho` / familiares ainda precisa ser confirmado em produção após a migração para campos estruturados no lead
- o Kanban agora precisa ser validado em runtime com o selo visual do tipo de contato (`Titular`, `Cônjuge`, `Filho`, `Irmão`) para garantir leitura operacional rápida
- outbound de campanha e `iniciar conversa` agora promovem lead `new` para `contacted`; falta só o reteste visual para confirmar a ida automática ao box `Contatados`
- a aba de listas agora precisa ser validada com visão mais real do que a planilha trouxe:
  - contagem de `cônjuges`, `filhos` e `irmãos` com celular
  - checagem de WhatsApp usando o telefone operacional do lead, não o CPF
  - modal do card do Kanban abrindo a conversa pelo `lead_id` quando existir, usando o endpoint do próprio lead como fonte prioritária
- o produto ainda não tem camada formal de flags/versionamento por tenant para proteger escritórios pagantes de evoluções novas
- o admin ainda estava acoplado demais aos preços da LP; para contratos negociados, `plano` deve continuar sendo pacote operacional e a cobrança precisa viver em campo próprio do tenant
- quando o auto-responder falhar por horário, timeout ou provedor, a conversa deve sair do silêncio e cair para humano com notificação explícita
- quando o lead responder fora do horário, o sistema deve enviar mensagem automática de retorno com a janela de atendimento e registrar essa saída na própria thread
- mensagens de campanha enviadas por Z-API não devem duplicar na inbox por causa do espelhamento `fromMe`
- a continuidade do agente em benefícios ainda precisava de endurecimento para não reabrir apresentação nem pedir interesse de novo depois de um retorno positivo curto do lead
- a resposta automática do agente precisava reconciliar `twilio_sid` no mesmo registro para a Z-API não espelhar o mesmo texto depois como mensagem humana
- o runtime do agente ainda precisava ser retestado após a correção da montagem de histórico, que antes buscava as mensagens mais antigas da conversa em vez das mais recentes e podia fazer a IA responder para uma saudação velha em vez da fala atual do lead
- em `beneficios_previdenciarios`, o agente ainda precisava ser refinado para:
  - parar de falar em "análise do caso" quando a base já veio previamente mapeada
  - explicar a readequação do teto em blocos curtos e humanos
  - conduzir para continuidade com a Dra. Jessica em vez de reabrir triagem
  - responder com um pequeno atraso operacional para não parecer instantâneo demais
- listas de teste ainda podiam ficar presas por campanhas `rascunho` ou `encerrada`, impedindo limpeza operacional antes de reimportação

## Próximos 3 blocos

1. estruturar isolamento e rollout por tenant/perfil para produção paga
2. validar o playbook de `planejamento_previdenciario` até diagnóstico, proposta, contrato e preparação de assinatura
3. consolidar cobrança negociada por tenant no admin sem depender só da tabela pública da LP
4. liberar a Ana via allowlist controlada (`TENANT_CONTAINMENT_ALLOWED_EMAILS`) sem abrir o rollout multi-tenant para todos
5. retestar exclusão de lista + reimportação da base enriquecida depois do cleanup automático de campanhas não ativas
6. confirmar no runtime que campanhas de `filho` usam apenas `Celular do filho`, nunca `Telefone do filho`
7. confirmar na aba de listas se `Verificar WhatsApp` retorna números reais depois da troca de `cpf` para `telefone`
8. confirmar no Kanban se o ícone de conversa abre a thread existente via `lead_id`, sem depender da lista geral da inbox

## Para retomar sem atrito

- ler [MASTER.md](/Users/cauafarias/Downloads/prevlegal/docs/MASTER.md) se precisar de regra estrutural
- ler [LEARNINGS.md](/Users/cauafarias/Downloads/prevlegal/docs/LEARNINGS.md) se o problema parecer recorrente
- ler [HANDOFF.md](/Users/cauafarias/Downloads/prevlegal/docs/HANDOFF.md) para a última janela operacional
