Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

# PrevLegal — Arquitetura de Portfólio

> Regra canônica para expansão do produto sem descaracterizar o core operacional.

## Navegação

- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[PREVIDENCIARIO_EXPANSION_STRATEGY]]
- [[MOBILE_CLIENT_APP_PLAN]]

## Tese central

O PrevLegal não deve perder sua espinha dorsal ao crescer.

O produto continua sendo, antes de tudo, uma plataforma para:

- captação previdenciária
- qualificação de leads
- operação humana
- agendamento
- portal/app do cliente
- conversão em contrato

Novas frentes não substituem esse núcleo.

Elas devem se conectar a ele.

## Estrutura oficial do produto

### 1. PrevLegal Core

Superfície principal do produto.

Inclui:

- leads e listas
- campanhas e mensageria
- agentes
- cadências / follow-ups
- colaboração interna contextual
- inbox humana
- agendamentos
- portal/mobile do cliente
- financeiro
- admin operacional por tenant

Regra:

- tudo que for essencial para a operação diária do escritório parceiro e da operação de captação pertence ao core

### 2. Adjacências operacionais

Frentes que ampliam a eficiência do core sem mudar sua identidade.

Inclui:

- PWA / mobile do cliente
- múltiplos providers de WhatsApp
- refinamentos de funil, saúde do tenant e visibilidade operacional

Regra:

- devem melhorar a execução do core
- não devem virar uma segunda narrativa de produto

### 3. Módulos premium

Frentes especializadas, de maior complexidade jurídica ou alto valor percebido.

Inclui:

- PrevGlobal
- análise avançada de CNIS com IA
- geração de peças com IA
- acompanhamento processual inteligente

Regra:

- entram como módulos ou linhas premium
- não devem confundir a narrativa principal do core

## Dois tipos de entrada no ecossistema

### Entrada A — Operação de readequação / listas

Fluxo principal já validado no produto.

Características:

- volume maior
- planilhas prontas
- abordagem comercial
- qualificação
- agenda
- transição para jurídico parceiro

### Entrada B — Planejamento técnico / cálculo / totalização

Fluxo especializado e de maior ticket.

Características:

- profundidade previdenciária maior
- menor volume
- maior valor por caso
- dependência de regras jurídicas e cálculo comparativo

## Regra de separação

As duas entradas podem coexistir no mesmo ecossistema.

Mas não devem ser misturadas na mesma narrativa de produto inicial.

## O que não pode acontecer

- o core virar uma colcha de retalhos de módulos técnicos
- a home/LP principal falar com todos os públicos ao mesmo tempo
- uma frente premium atrasar entregas estruturais do core
- uma feature nova mudar a identidade do PrevLegal sem decisão explícita

## Teste obrigatório para novas frentes

Toda nova iniciativa deve responder:

1. Isso fortalece o core ou é módulo?
2. Isso interfere no fluxo principal?
3. Isso exige curadoria jurídica pesada?
4. Isso aumenta ticket ou só aumenta complexidade?

Se a resposta for “aumenta complexidade sem fortalecer o core nem aumentar ticket”, não entra agora.

## Aplicação prática atual

### Core em execução

- mobile do cliente via portal/PWA
- WhatsApp provider real
- inbox humana
- agenda
- pipeline operacional

### Próxima frente oficial do core

- agentes por tenant
- cadências configuráveis
- colaboração interna contextual

Referência canônica:

- `docs/AGENTES_CADENCIAS_COLABORACAO_PLAN.md`

### Expansão em discovery / arquitetura

- PrevGlobal
- CNIS com IA
- cálculo previdenciário aprofundado

## Regra de continuidade

Enquanto o core estiver em execução ativa:

- o roadmap principal continua mandando
- novas possibilidades entram como arquitetura, spec e discovery
- só viram implementação quando tiverem trilha própria e não desorganizarem o core

## Decisão atual

- manter `PrevLegal` como marca mãe e plataforma principal
- tratar `PrevGlobal` como módulo premium separado
- continuar a execução do mobile/core sem desvio de identidade
- preservar a leitura de que o motor conversacional e operacional poderá ser reutilizado em outras verticais jurídicas no futuro, sem descaracterizar o foco previdenciário atual
