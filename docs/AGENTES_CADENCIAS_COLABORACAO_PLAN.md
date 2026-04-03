Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

# PrevLegal — Plano de Agentes, Cadências e Colaboração Interna

> Documento canônico da próxima frente do core operacional.
> Atualizado em 03/04/2026.

## Navegação

- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[PRODUCT_PORTFOLIO_STRATEGY]]

## Contexto

Depois da maturação do portal mobile e do hardening tenant-aware das superfícies mais sensíveis, a próxima frente mais valiosa do core não é mais só UX ou isolamento residual.

O próximo salto do PrevLegal é virar uma camada operacional conversacional completa para o escritório.

Data operacional relevante:

- há uma reunião marcada para **07/04/2026** com um escritório de advocacia para discutir uma possível sociedade e uma atuação mais próxima de produto/tecnologia

Isso aumenta a importância de duas coisas:

- mostrar visão clara de produto
- continuar preservando independência estratégica do sistema para venda a outros escritórios

## Tese central

O PrevLegal não deve evoluir para "mais um bot jurídico".

Ele deve evoluir para um **sistema operacional de captação e operação conversacional**.

Os três pilares da próxima fase são:

1. `Agentes`
2. `Cadências`
3. `Colaboração interna`

Esses três pilares se conectam ao core já existente:

- leads
- campanhas
- inbox humana
- agendamentos
- portal/mobile do cliente
- financeiro

## O que esta frente resolve

### 1. Agentes por escritório

Hoje existe configuração de agente, mas o produto ainda não trata bem a ideia de múltiplos agentes com objetivos diferentes.

O próximo estágio deve permitir:

- vários agentes por tenant
- nome público diferente por agente
- personalidade/tonalidade própria
- foco operacional próprio
- base de conhecimento específica
- janela de atendimento própria
- canal/número padrão próprio

### 2. Cadências e follow-ups

Hoje a operação ainda depende demais de memória humana ou ação pontual.

O próximo estágio deve permitir:

- follow-ups configuráveis
- ativação manual no Kanban, inbox e detalhe do lead
- ativação automática por regra
- pausa/retomada
- stop conditions
- escalada para humano

### 3. Colaboração interna contextual

Não vale criar um chat interno genérico e solto.

O valor real está em colaboração operacional contextualizada por trabalho.

O próximo estágio deve permitir:

- thread interna por lead
- thread interna por conversa
- comentários e handoffs
- `@menções`
- tarefas internas
- histórico de quem assumiu, devolveu, pediu ação ou concluiu algo
- trilha auditável para gestão do escritório

## Princípios obrigatórios

### 1. Nada de "Slack jurídico"

O PrevLegal não deve abrir uma superfície de chat livre sem contexto.

A colaboração deve nascer:

- dentro do lead
- dentro da conversa
- dentro do agendamento
- dentro do contrato/financeiro quando fizer sentido

### 2. Cadência precisa apontar para ação real

Todo follow-up precisa ter:

- gatilho claro
- canal de envio
- agente responsável
- texto/template
- regra de parada
- dono da exceção

### 3. Agente precisa ser configurável, mas não anárquico

O escritório pode personalizar:

- nome
- tom
- playbook
- canal
- objetivo

Mas o produto continua preservando as travas de compliance do PrevLegal:

- sem vínculo indevido com escritório parceiro na abordagem inicial
- sem expor NB, banco ou valores cedo demais
- sem promessas inadequadas

### 4. Toda camada nova precisa gerar dados gerenciais

Essa frente não é só UX.

Ela precisa gerar visão para o administrador:

- quem está fazendo o quê
- onde o lead travou
- qual agente converte mais
- qual cadência funciona melhor
- onde a operação humana está virando gargalo

## Modelo de produto recomendado

## Camada 1 — Agentes

### Entidades recomendadas

- `agentes`
  - `id`
  - `tenant_id`
  - `nome_interno`
  - `nome_publico`
  - `descricao`
  - `objetivo`
  - `persona`
  - `prompt_base`
  - `ativo`
  - `is_default`
  - `whatsapp_number_id_default`
  - `janela_inicio`
  - `janela_fim`
  - `dias_uteis_only`

- `agente_documentos`
  - substituir a camada atual `agent_documents` por uma estrutura com `tenant_id` e opcionalmente `agente_id`

- `agente_templates`
  - templates por etapa, objetivo e contexto

- `agente_playbooks`
  - playbook principal do agente

### Tipos iniciais de agente

- `triagem`
- `reativacao`
- `documental`
- `confirmacao_agenda`
- `followup_comercial`

## Camada 2 — Playbooks

Cada agente deve poder rodar um playbook próprio.

Exemplos:

- captar resposta inicial
- qualificar elegibilidade/interesse
- convidar para consulta
- cobrar documento pendente
- confirmar consulta
- reativar lead parado

### Entidades recomendadas

- `agente_playbooks`
- `agente_playbook_steps`
- `agente_playbook_versions`

## Camada 3 — Cadências / Follow-ups

### Casos de uso iniciais

- lead novo sem resposta em `1 dia`
- lead respondeu mas não agendou em `3 dias`
- consulta marcada sem confirmação em `1 dia`
- documento pedido e não enviado em `2 dias`
- lead sumido após consulta em `5 dias`

### Entidades recomendadas

- `followup_rules`
  - regra configurável por tenant
- `followup_rule_steps`
  - passos da cadência
- `followup_runs`
  - instância ativa por lead
- `followup_events`
  - disparos, pausas, falhas, stop, escalada

### Ativação

- manual no Kanban
- manual na Caixa de Entrada
- manual no detalhe do lead
- automática por regra
- opcionalmente por campanha/lista

### Stop conditions

- lead respondeu
- humano assumiu
- agendamento criado
- contrato criado
- lead marcado como perdido

## Camada 4 — Colaboração interna

### Superfícies recomendadas

- thread interna no detalhe do lead
- thread interna na conversa da inbox
- handoff de responsabilidade
- tarefas internas rápidas
- marcadores de etapa:
  - `assumido por`
  - `aguardando fulano`
  - `devolver ao agente`
  - `aguardando financeiro`
  - `aguardando jurídico`

### Entidades recomendadas

- `lead_threads_internas`
- `lead_mensagens_internas`
- `lead_tasks`
- `lead_handoffs`
- `lead_watchers`
- `timeline_interna`

## Camada 5 — Governança e métricas

### Métricas por agente

- volume de interações
- taxa de resposta
- taxa de agendamento
- taxa de conversão
- taxa de escalada humana
- taxa de no-show evitado
- taxa de pendência documental resolvida

### Métricas por cadência

- cadências iniciadas
- cadências concluídas
- resposta por passo
- tempo médio até resposta
- cadências interrompidas por ação humana
- ganho operacional por tipo de sequência

### Métricas por equipe

- tempo até primeira ação
- handoffs por lead
- leads sem dono
- leads travados
- SLA por fila

## Superfícies de UI recomendadas

### 1. Tela de agentes

- lista de agentes do escritório
- criar/editar/duplicar/desativar
- escolher canal padrão
- vincular playbook
- ver performance

### 2. Tela de cadências

- biblioteca de cadências
- condições de disparo
- passos da sequência
- regras de pausa/stop
- histórico de execuções

### 3. Inbox / lead / Kanban

- botão `Ativar follow-up`
- botão `Transferir`
- botão `Comentar internamente`
- botão `Devolver ao agente`
- dono atual do lead/conversa

### 4. Admin operacional do escritório

- gargalos da operação
- performance por usuário
- performance por agente
- performance por cadência

## Ordem oficial de implementação

### Fase A — Colaboração interna mínima

- notas internas contextualizadas por lead
- thread interna por lead
- `@menção`
- dono atual
- handoff simples

### Fase B — Follow-up engine v1

- cadência manual
- ativação por lead/kanban/inbox
- passos sequenciais simples
- stop conditions básicas

### Fase C — Multiagente por tenant

- vários agentes por escritório
- persona
- objetivo
- número padrão
- playbook básico por agente

### Fase D — Orquestração avançada

- roteamento por campanha
- roteamento por estágio do lead
- roteamento por canal
- comparação de performance por agente

## O que não entra agora

- chat interno livre entre toda a equipe sem contexto
- automação irrestrita sem stop conditions
- motor de workflow genérico para qualquer coisa
- expansão para outras especialidades jurídicas dentro do mesmo fluxo agora

## Ponte estratégica para o futuro

O PrevLegal continua sendo um produto vertical de entrada no mercado.

Mas a arquitetura dessa nova fase deve nascer com separação suficiente para, no futuro, permitir uma plataforma reaproveitável para outras especialidades do direito.

Leitura correta:

- `PrevLegal` continua como vertical principal atual
- `motor de agentes + cadências + colaboração` pode virar uma fundação mais ampla no futuro
- isso não muda a narrativa comercial agora
- isso protege a independência do produto no médio prazo

## Decisão atual

O próximo bloco estratégico do core passa a ser:

- `agentes por tenant`
- `cadências/follow-ups`
- `colaboração interna contextual`

Essa frente deve ser tratada como evolução do `PrevLegal Core`, e não como módulo premium.
