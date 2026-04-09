# PrevLegal — GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Checklist objetivo para tirar o Google OAuth do modo de teste e reduzir atrito comercial no onboarding.
> Última atualização: 09/04/2026

## Objetivo

Remover a sensação de “app de teste” no fluxo de Google Calendar antes de escalar onboarding de escritórios.

## O que já está pronto

- fluxo técnico de conexão Google funcionando em runtime
- conexão por usuário e fallback do escritório funcionando
- páginas públicas no domínio do site:
  - `https://www.prevlegal.com.br/`
  - `https://www.prevlegal.com.br/privacidade`
  - `https://www.prevlegal.com.br/termos`

## Bloqueio atual

O Google ainda mostra alerta de app não verificado durante o consentimento.

Isso não bloqueia testes internos, mas enfraquece confiança comercial.

## Checklist de execução

### 1. Confirmar projeto OAuth correto

- abrir Google Cloud / Google Auth Platform
- confirmar que o projeto usado pelo PrevLegal é o mesmo do client ID em produção
- confirmar dono e e-mail de contato

### 2. Revisar OAuth Consent Screen

- App name: `PrevLegal`
- User support email
- App logo
- Homepage:
  - `https://www.prevlegal.com.br`
- Privacy policy:
  - `https://www.prevlegal.com.br/privacidade`
- Terms of service:
  - `https://www.prevlegal.com.br/termos`
- Developer contact information

### 3. Revisar audience/publicação

- verificar se está em `Testing` ou `In production`
- enquanto a verificação não sair:
  - manter usuários internos/teste cadastrados como test users

### 4. Revisar domínios autorizados

- `prevlegal.com.br`
- `www.prevlegal.com.br`
- `app.prevlegal.com.br`
- `admin.prevlegal.com.br` se necessário

### 5. Revisar redirect URIs do OAuth Client

Confirmar no client usado pela app:

- `https://app.prevlegal.com.br/api/google/callback`
- fallback técnico, se ainda mantido:
  - `https://prevlegal.vercel.app/api/google/callback`

Se existir URI antiga indevida, limpar.

### 6. Revisar escopos

Manter apenas o mínimo necessário para agenda:

- identidade básica do usuário Google
- escopos de Calendar realmente usados pelo produto

Objetivo:

- reduzir atrito na submissão
- reduzir percepção de risco

### 7. Verificação de domínio/branding

- confirmar que o domínio público está verificado no Google
- garantir consistência entre:
  - nome do app
  - logo
  - domínio
  - páginas públicas

### 8. Submeter verificação do app

- iniciar verificação no Google Auth Platform
- anexar o que for pedido:
  - links públicos
  - descrição do uso dos escopos
  - vídeo do fluxo, se necessário

## Critério de pronto

Considerar essa frente pronta quando:

- o fluxo não mostrar mais o aviso de app não verificado para onboarding real
- ou, no mínimo, quando a submissão estiver enviada com material completo e o produto já tiver um runbook de contingência para clientes piloto

## Runbook de contingência até a aprovação

Enquanto a verificação não sai:

- usar contas de teste autorizadas
- orientar onboarding assistido
- explicar que a conexão Google está funcional, mas o app ainda está em etapa de verificação de brand/consent

## Próximo passo depois disso

Rodar o smoke test final do tenant real com:

- login
- convite
- permissões
- inbox
- follow-up
- portal
- agenda
