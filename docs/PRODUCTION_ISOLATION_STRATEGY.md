# PrevLegal — Production Isolation Strategy

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Estratégia canônica para isolar operações, evoluir playbooks sem quebrar tenants pagantes e profissionalizar o rollout em produção.
> Última atualização: 16/04/2026

## Por que isso existe

O PrevLegal já saiu da fase em que todo ajuste pode ser tratado como “mudança global do sistema”.

Agora existem três realidades convivendo:
- tenants já pagantes ou quase em go-live
- playbooks operacionais diferentes (`beneficios_previdenciarios` e `planejamento_previdenciario`)
- melhorias novas que ainda carregam risco de regressão

Se qualquer evolução entrar direto no comportamento-base da produção, um bug novo pode atingir escritórios ativos e contaminar operações já estabilizadas.

## Princípio central

O produto deve evoluir como:

- `core único`
- `playbooks operacionais isolados`
- `rollout controlado por tenant`

Ou seja:
- o mesmo produto continua servindo vários escritórios
- mas comportamento, mensagens, etapas e automações deixam de ser “globais por acidente”
- e passam a ser ativados por perfil, versão e flag

## Camadas de isolamento

### 1. Core único

Permanece compartilhado:
- auth
- leads
- inbox
- campanhas
- agenda
- portal
- financeiro
- documentos

Essa camada deve mudar com mais cautela, porque afeta todos os tenants.

### 2. Playbooks operacionais

Cada tenant pode operar em um ou mais playbooks:
- `beneficios_previdenciarios`
- `planejamento_previdenciario`

Cada playbook define:
- mensagem inicial
- tom de voz
- etapas da esteira
- papel dos agentes
- regra de handoff
- filtros de campanha
- lógica de segmentação

### 3. Tenant

Cada escritório deve ser tratado como unidade de rollout.

Isso significa:
- configuração própria
- canais próprios
- agentes próprios
- campanhas próprias
- possibilidade de ativar ou não uma feature nova

### 4. Feature flags

Toda evolução com risco operacional deve nascer atrás de flag.

Exemplos:
- `benefits_reajuste_flow_v1`
- `planning_flow_v1`
- `planning_contract_handoff_v1`
- `agent_multistage_memory_v1`
- `resend_mailmarketing_v1`

## Regra por playbook

### Benefícios previdenciários

Premissas:
- pode abordar `titular` ou contato relacionado
- a base pode vir previamente mapeada para revisão/readequação
- o agente aquece, explica o essencial e prepara handoff jurídico

Handoff:
- acontece quando o lead demonstra interesse real ou quando a próxima etapa exige continuidade jurídica da advogada responsável

### Planejamento previdenciário

Premissas:
- abordagem `titular-only`
- não usa fluxo de parentes como padrão
- o agente conduz da triagem até:
  - diagnóstico
  - proposta
  - contrato
  - preparação de assinatura

Handoff:
- não acontece por “dúvida difícil” de forma automática
- acontece no marco operacional definido pelo playbook:
  - proposta madura
  - contrato preparado
  - assinatura encaminhada
  - responsável humano assume para validação final e fechamento

Regra crítica:
- o agente deve saber muito sobre planejamento previdenciário brasileiro
- mas nunca pode inventar análise individual, estratégia ideal ou conclusão personalizada sem base

## Regra de rollout

Toda feature nova deve seguir esta ordem:

1. `local/dev`
- construção e validação técnica

2. `tenant sandbox interno`
- teste controlado em tenant não pagante
- mesmo produto, mesma produção, comportamento isolado por flag

3. `tenant piloto`
- ativação em escritório específico e monitorado

4. `rollout gradual`
- só depois de validar comportamento, métricas e ausência de regressão

## Decisão imediata

### Escritório da Jessica

Fica como referência principal de:
- `beneficios_previdenciarios`
- reajuste / revisão / readequação

### Novo escritório de planejamento

Deve ser criado como tenant separado para:
- `planejamento_previdenciario`
- evolução segura do playbook sem contaminar o tenant da Jessica

## Política de mudança em produção

Quando já houver tenant pagante:

- nenhuma mudança de playbook entra “para todo mundo” por padrão
- mudanças com risco ficam atrás de flag por tenant
- mudanças de copy, agente e esteira devem ser versionadas por perfil operacional
- mudanças de schema só entram quando:
  - o caso de uso está claro
  - o impacto transversal foi mapeado
  - existe patch manual ou migration segura

## Versões operacionais recomendadas

Modelo inicial recomendado:

- `playbook_version`
- `agent_runtime_version`
- `campaign_copy_version`

Escopo:
- por tenant
- por perfil operacional

Exemplo:
- tenant A:
  - `beneficios_previdenciarios = v1`
  - `planejamento_previdenciario = disabled`
- tenant B:
  - `beneficios_previdenciarios = disabled`
  - `planejamento_previdenciario = v1`

## O que não fazer mais

- não usar o mesmo tenant para validar operações radicalmente diferentes
- não tratar evolução de agente como ajuste global invisível
- não lançar mudança nova em produção sem saber qual tenant será impactado
- não misturar melhorias de `benefícios` e `planejamento` no mesmo teste operacional

## Próxima implementação estrutural

1. criar a camada formal de flags/versionamento por tenant
2. marcar `planejamento_previdenciario` como `titular-only` por regra de produto
3. isolar o tenant de planejamento como piloto separado
4. fazer toda nova frente nascer com:
   - flag
   - tenant piloto
   - rollback simples

## Regra prática

Agora que o PrevLegal tem pagantes:

- estabilidade é feature
- isolamento é arquitetura
- rollout controlado é parte do produto

