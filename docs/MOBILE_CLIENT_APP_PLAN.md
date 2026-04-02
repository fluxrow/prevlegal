# PrevLegal — MOBILE_CLIENT_APP_PLAN.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

> Plano canônico para a frente mobile do cliente/familiar no PrevLegal.
> Baseado no estado atual do portal, inbox, agendamentos e produto multi-tenant.

---

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[MOBILE_CLIENT_APP_BACKLOG]]

## Tese de Produto

O app mobile do cliente deve nascer como **evolução do portal**, e não como produto paralelo.

Hoje o PrevLegal já possui:
- portal por link/token
- mensagens com o escritório
- acompanhamento de status
- documentos compartilhados
- agendamentos / Google Meet

A decisão recomendada é:

1. transformar o portal em uma experiência **mobile-first**
2. lançar primeiro como **PWA instalável**
3. só depois avaliar **app nativo**

Isso maximiza reaproveitamento do backend atual, reduz risco e acelera validação real de uso.

Backlog técnico derivado desta direção:
- `docs/MOBILE_CLIENT_APP_BACKLOG.md`

## Para quem é o app

O app não é só para o beneficiário.

Na prática, o usuário recorrente pode ser:
- o próprio cliente
- filho/filha
- familiar
- cuidador
- responsável pelo caso

Por isso, o desenho correto é de **responsável pelo caso**, não apenas de “titular do benefício”.

## Problema que o app resolve

O app deve reduzir fricção entre qualificação, acompanhamento e andamento do caso.

As dores que ele deve resolver primeiro:
- o cliente/familiar não sabe em que etapa está
- perde link de portal
- não vê claramente próximos passos
- tem dificuldade de mandar documentos
- não encontra facilmente o link da reunião
- quer falar com a equipe sem cair no WhatsApp disperso

## Decisão de Arquitetura

### Recomendação principal

**PWA primeiro.**

### O que isso significa

- manter o backend atual do PrevLegal
- reaproveitar a superfície de `portal`
- criar uma experiência mobile-first autenticável
- permitir instalação no aparelho como app

### O que não fazer agora

- não abrir React Native / Expo logo de saída
- não duplicar backend
- não criar lógica paralela de mensagens/agendamentos/documentos

### Quando considerar app nativo

Somente depois de provar:
- frequência real de uso
- necessidade concreta de push nativo mais forte
- necessidade concreta de câmera/scan/background além do que a PWA entrega

## Modelo de Acesso

Hoje o portal usa `token` por link.

Para o mobile evoluir de verdade, o produto deve caminhar para dois modos:

### Fase inicial
- acesso por magic link / código / link seguro

### Fase seguinte
- conta persistente do cliente/familiar

### Direção correta de modelagem

Criar uma identidade separada dos usuários internos do escritório:

- `portal_users` ou entidade equivalente
- vínculo com `lead`
- depois vínculo com `contrato` / caso, quando existir

Isso evita misturar:
- operador interno
- admin do escritório
- cliente/familiar do portal

## Escopo recomendado do MVP

O MVP deve ter 5 áreas.

### 1. Início
- status atual do caso
- resumo do último andamento
- próxima ação esperada
- próximos agendamentos
- pendências de documento

### 2. Mensagens
- conversa com a equipe
- histórico simples
- anexos leves depois

### 3. Agenda
- consultas futuras
- botão para entrar no Meet
- instruções da reunião
- pedido de remarcação

### 4. Documentos
- checklist do que já foi enviado
- checklist do que falta
- upload por celular
- status do documento

### 5. Perfil
- nome
- telefone
- e-mail
- responsável familiar
- preferências de contato

## O que fica fora do MVP

- financeiro detalhado do cliente
- assinatura eletrônica complexa
- IA aberta dentro do app
- white-label total por escritório
- múltiplos perfis complexos por caso
- área jurídica pesada com excesso de informação

## Experiência do Usuário

### Linguagem

O app do cliente deve falar em:
- acompanhamento
- próximos passos
- documentos
- consulta
- falar com a equipe

Não deve falar em:
- lead
- pipeline
- campanha
- funil
- operação

### Direção visual

- simples
- humana
- segura
- clara
- menos “CRM”
- mais “acompanhamento do seu caso”

## Integração com o produto atual

O app/PWA precisa se apoiar nos módulos já existentes:

- `portal_mensagens`
- `lead_documentos`
- `agendamentos`
- `conversas` somente quando houver uma camada de portal x WhatsApp bem definida
- `configuracoes` e Google Meet quando o convite existir

## Fases de Implementação

### Fase 1 — Portal mobile-first

Objetivo:
- tornar o portal atual bom de verdade no celular

Entregas:
- revisão visual mobile
- home com status + próximos passos
- mensagens mais claras
- agenda do cliente
- documentos compartilhados / pendentes
- upload de documento pelo próprio cliente/familiar
- PWA instalável

Critério de sucesso:
- cliente consegue acompanhar e agir sem depender de link perdido no WhatsApp

### Fase 2 — Acesso persistente

Objetivo:
- parar de depender só de token temporário

Entregas:
- identidade do cliente/familiar
- magic link ou OTP
- dispositivo recorrente
- gestão básica de sessão

Critério de sucesso:
- o cliente volta ao app sem atrito

### Fase 3 — Operação mobile completa

Objetivo:
- transformar o portal em canal ativo de relacionamento

Entregas:
- notificações
- upload melhor de documentos
- pedido de remarcação
- histórico de andamentos mais rico

Critério de sucesso:
- o canal mobile reduz fricção operacional real da equipe

### Fase 4 — App nativo, se justificar

Objetivo:
- capturar ganhos que a PWA não entrega bem

Possíveis gatilhos:
- push nativo exigir mais confiabilidade
- câmera/scan ser essencial
- uso recorrente diário justificar store presence

## Riscos principais

### 1. Misturar usuário interno com cliente/familiar
Isso não pode acontecer.

### 2. Abrir uma segunda frente técnica cedo demais
Nativo cedo demais aumenta custo, complexidade e manutenção.

### 3. Repetir regras de negócio
O app do cliente deve reaproveitar a base existente.

### 4. Portal sem identidade persistente
Bom para começar, ruim para escalar experiência.

### 5. Multi-tenant no portal/mobile
Toda a frente mobile precisa nascer tenant-aware de verdade.

## Recomendação executiva

### Escolha de produto

**Fazer PWA primeiro.**

### Escolha de escopo

**Começar por acompanhamento, mensagens, agenda e documentos.**

### Escolha de arquitetura

**Evoluir o portal atual, não criar um segundo produto paralelo.**

## Próximo passo recomendado

Transformar esse plano em backlog técnico com:
- entidades de banco necessárias
- rotas novas
- revisão das rotas atuais de portal
- telas do MVP
- ordem de implementação por sprint

## Atualizacao 2026-04-02 - Confirmacao de presenca

- o MVP mobile do cliente agora tambem inclui `confirmacao de presença` na proxima consulta
- isso reforca a tese de que o portal deve virar um canal operacional leve:
  - Meet
  - remarcacao como pedido
  - confirmacao de presenca como automacao segura
