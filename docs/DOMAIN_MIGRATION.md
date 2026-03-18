# PrevLegal — Domain Migration Checklist
> Preparação para migrar de `prevlegal.vercel.app` para domínio próprio
> Atualizado em: 18/03/2026

## Objetivo

Migrar o projeto para domínio próprio com separação clara entre:

- site / LP
- plataforma
- possíveis superfícies futuras de admin

## Decisão operacional recomendada

- `www.prevlegal.com.br` -> site / LP canônico
- `prevlegal.com.br` -> redirect para `www.prevlegal.com.br`
- `app.prevlegal.com.br` -> plataforma principal

Se você preferir simplicidade de marca em vez da recomendação da Vercel para sites, pode usar o apex como canônico do site. Mas a decisão deve ser tomada antes de mexer em Vercel, DNS e env vars.

## Status da migração

### Bloqueio atual

- falta decidir explicitamente se o site canônico será `www.prevlegal.com.br` ou `prevlegal.com.br`

### Estado do app hoje

- produção atual continua em `https://prevlegal.vercel.app`
- o código já usa `NEXT_PUBLIC_APP_URL` em vários pontos
- ainda existem fallbacks hardcoded para `prevlegal.vercel.app`

## Estado atual encontrado no código

### URLs absolutas e pontos de atenção

- `public/lp.html`
  - CTAs ainda apontam para `https://prevlegal.vercel.app/login`
- `public/demo.html`
  - mostra `app.prevlegal.com.br/dashboard` no mockup
  - ainda tem link para `https://prevlegal.vercel.app/login`
- `src/app/api/usuarios/convidar/route.ts`
  - usa `NEXT_PUBLIC_APP_URL` com fallback para `https://prevlegal.vercel.app`
- `src/app/api/portal/link/[leadId]/route.ts`
  - usa `NEXT_PUBLIC_APP_URL` com fallback para `https://prevlegal.vercel.app`
- `src/app/api/webhooks/twilio/route.ts`
  - depende de `NEXT_PUBLIC_APP_URL`
- `src/app/api/webhooks/twilio/status/route.ts`
  - depende de `NEXT_PUBLIC_APP_URL`
- `src/app/api/google/callback/route.ts`
  - depende de `NEXT_PUBLIC_APP_URL`
- `src/app/admin/[id]/page.tsx`
  - gera link `https://${tenant.slug}.prevlegal.com.br`
- `docs/MASTER.md`
  - ainda registra a produção atual como `https://prevlegal.vercel.app`

### Observações

- O projeto já usa `NEXT_PUBLIC_APP_URL` em pontos críticos. Isso ajuda a migração.
- Ainda existe fallback hardcoded para `prevlegal.vercel.app`, então a troca de domínio precisa remover esses defaults.
- O mockup do demo e a LP precisam ser ajustados em conjunto para evitar inconsistência visual.

## Decisão de arquitetura

### Opção A — simples e consistente

- `prevlegal.com.br` -> LP/site
- `app.prevlegal.com.br` -> plataforma

### Opção B — recomendação técnica da Vercel para marketing

- `www.prevlegal.com.br` -> LP/site canônico
- `prevlegal.com.br` -> redirect para `www.prevlegal.com.br`
- `app.prevlegal.com.br` -> plataforma

### Recomendação atual

Para longo prazo, a opção mais robusta é:

- `www.prevlegal.com.br` como canônico do site
- `prevlegal.com.br` redirecionando para `www.prevlegal.com.br`
- `app.prevlegal.com.br` para a plataforma

Motivo:

- a Vercel recomenda `www` para maior controle e confiabilidade em domínios de site
- a plataforma fica isolada em `app.`
- marketing e produto deixam de competir pelo mesmo host

Se a prioridade for simplicidade visual da marca, a Opção A também funciona, mas a decisão deve ser explícita antes da troca.

## Runbook de execução

### Fase 0 — decisão final

Objetivo:
- travar a arquitetura para evitar retrabalho

Checklist:
- [ ] escolher host canônico do site:
  - [ ] `www.prevlegal.com.br`
  - [ ] `prevlegal.com.br`
- [ ] confirmar `app.prevlegal.com.br` para a plataforma
- [ ] decidir se o admin permanece dentro do app por enquanto

Saída esperada:
- uma única arquitetura aprovada para Vercel, DNS e código

### Fase 1 — preparar ambiente

Objetivo:
- deixar as variáveis e referências prontas antes da troca pública

Checklist:
- [ ] definir valor final de `NEXT_PUBLIC_APP_URL`
- [ ] definir valor final de `NEXT_PUBLIC_SITE_URL`
- [ ] opcional: criar `NEXT_PUBLIC_MARKETING_URL`
- [ ] listar integrações dependentes de callback URL:
  - [ ] Google OAuth
  - [ ] Twilio webhook
  - [ ] convites
  - [ ] links do portal

Saída esperada:
- valores finais de env aprovados antes de alterar produção

### Fase 2 — ajustar código

Objetivo:
- remover dependência do domínio antigo no repositório

Checklist:
- [ ] atualizar `public/lp.html`
- [ ] atualizar `public/demo.html`
- [ ] remover fallback `https://prevlegal.vercel.app` em `src/app/api/usuarios/convidar/route.ts`
- [ ] remover fallback `https://prevlegal.vercel.app` em `src/app/api/portal/link/[leadId]/route.ts`
- [ ] revisar `src/app/api/webhooks/twilio/route.ts`
- [ ] revisar `src/app/api/webhooks/twilio/status/route.ts`
- [ ] revisar `src/app/api/google/callback/route.ts`
- [ ] revisar `src/app/admin/[id]/page.tsx`
- [ ] atualizar docs de URL principal
- [ ] rodar `npm run build`

Saída esperada:
- nenhum link crítico hardcoded para `prevlegal.vercel.app`

### Fase 3 — configurar Vercel

Objetivo:
- preparar os hosts no projeto antes do DNS final

Checklist:
- [ ] adicionar `prevlegal.com.br`
- [ ] adicionar `www.prevlegal.com.br` se for usado
- [ ] adicionar `app.prevlegal.com.br`
- [ ] configurar redirects entre apex e `www`
- [ ] revisar qual host ficará como primary domain

Saída esperada:
- Vercel pronta para validar DNS e emitir HTTPS

### Fase 4 — configurar DNS

Objetivo:
- apontar o domínio comprado para o projeto certo

Checklist:
- [ ] criar/editar registros solicitados pela Vercel
- [ ] validar resolução do apex
- [ ] validar resolução de `www`
- [ ] validar resolução de `app`
- [ ] aguardar propagação completa

Saída esperada:
- todos os hosts resolvendo corretamente

### Fase 5 — atualizar env vars de produção

Objetivo:
- alinhar o runtime com o domínio final

Checklist:
- [ ] atualizar `NEXT_PUBLIC_APP_URL`
- [ ] atualizar `NEXT_PUBLIC_SITE_URL`
- [ ] revisar outras envs que dependam de URL base
- [ ] forçar redeploy se necessário

Saída esperada:
- callbacks, convites e links automáticos usando o domínio novo

### Fase 6 — validar produção

Objetivo:
- confirmar que marketing, auth e integrações continuam saudáveis

Checklist:
- [ ] LP abre no host canônico
- [ ] CTA vai para o login certo
- [ ] login abre a plataforma no host certo
- [ ] link do portal funciona
- [ ] convite por e-mail abre no host certo
- [ ] callback do Google funciona
- [ ] webhook do Twilio continua funcionando
- [ ] redirect apex/www funciona
- [ ] HTTPS está válido em todos os hosts

Saída esperada:
- migração concluída sem dependência operacional do domínio antigo

### Fase 7 — pós-migração

Objetivo:
- limpar resíduos e registrar a nova base canônica

Checklist:
- [ ] atualizar `docs/MASTER.md`
- [ ] atualizar `docs/ROADMAP.md` se necessário
- [ ] atualizar `docs/LEARNINGS.md` com incidentes reais da migração
- [ ] sincronizar Obsidian

Saída esperada:
- memória do projeto atualizada com o novo domínio oficial

## Execução rápida

Se quiser executar com menor risco, a ordem prática é:

1. decidir host canônico
2. ajustar código + env vars em branch/local
3. validar `npm run build`
4. configurar Vercel
5. configurar DNS
6. atualizar env vars em produção
7. redeploy
8. validar callbacks e links automáticos

## Rollback simples

Se algo crítico quebrar:

1. manter o domínio antigo funcional na Vercel
2. voltar `NEXT_PUBLIC_APP_URL` para o host anterior
3. redeploy
4. revisar callback URLs de Google/Twilio antes de tentar novamente

## Ordem lógica de execução

### Fase 1 — decisão final de domínio

1. Escolher host canônico do site:
   - `prevlegal.com.br`
   - ou `www.prevlegal.com.br`
2. Confirmar que a plataforma será `app.prevlegal.com.br`
3. Decidir se o admin continuará no mesmo app ou se terá `admin.prevlegal.com.br` depois

### Fase 2 — configuração no Vercel

1. Adicionar ao projeto:
   - domínio do site
   - domínio da plataforma
2. Verificar no painel quais registros DNS exatos a Vercel pedir
3. Definir redirects entre apex e `www` conforme a decisão da Fase 1

### Fase 3 — DNS

1. Configurar os registros exigidos no provedor DNS
2. Validar propagação
3. Confirmar HTTPS emitido em todos os hosts

### Fase 4 — variáveis de ambiente

Padronizar pelo menos:

- `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br`
- `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br`
  - ou `https://prevlegal.com.br`, se o site usar apex como canônico

Sugestão adicional:

- criar `NEXT_PUBLIC_MARKETING_URL` para separar claramente site de app

### Fase 5 — ajustes no código

1. remover fallback hardcoded para `https://prevlegal.vercel.app`
2. trocar CTAs da LP para o domínio final do app/login
3. ajustar links do demo
4. revisar links automáticos de:
   - convite
   - portal
   - webhooks e callbacks
   - Google OAuth
5. revisar link do admin detail que usa `tenant.slug`

### Fase 6 — validação funcional

Checklist mínimo:

- LP abre no domínio novo
- CTA leva ao login certo
- login volta para a plataforma certa
- convite por e-mail abre no host correto
- link do portal abre no host correto
- Twilio webhook continua funcionando
- callback do Google continua funcionando
- redirects apex/www funcionam
- certificados HTTPS emitidos

## Checklist técnico pronto para execução

### No Vercel

- [ ] Adicionar `prevlegal.com.br`
- [ ] Adicionar `www.prevlegal.com.br` se este for o canônico
- [ ] Adicionar `app.prevlegal.com.br`
- [ ] Configurar redirect do host não canônico para o canônico
- [ ] Confirmar qual projeto recebe site e qual recebe app

### No DNS

- [ ] Criar os registros pedidos pela Vercel
- [ ] Confirmar resolução do apex
- [ ] Confirmar resolução de `www`
- [ ] Confirmar resolução de `app`

### No código

- [ ] Atualizar `public/lp.html`
- [ ] Atualizar `public/demo.html`
- [ ] Atualizar `src/app/api/usuarios/convidar/route.ts`
- [ ] Atualizar `src/app/api/portal/link/[leadId]/route.ts`
- [ ] Revisar `src/app/api/webhooks/twilio/route.ts`
- [ ] Revisar `src/app/api/webhooks/twilio/status/route.ts`
- [ ] Revisar `src/app/api/google/callback/route.ts`
- [ ] Revisar `src/app/admin/[id]/page.tsx`
- [ ] Atualizar `docs/MASTER.md`

### Em ambiente

- [ ] Atualizar `NEXT_PUBLIC_APP_URL`
- [ ] Criar/atualizar `NEXT_PUBLIC_SITE_URL`
- [ ] Revisar integrações que dependem de callback URL

## Riscos conhecidos

- Google OAuth pode quebrar se o redirect URI não for atualizado junto
- Twilio pode perder webhook se a URL base mudar sem ajuste de env/config
- convites e links de portal podem continuar saindo no domínio antigo se o fallback permanecer
- o detalhe do tenant hoje já assume `tenant.slug.prevlegal.com.br`; isso precisa casar com a estratégia final

## Próximo passo recomendado

Antes de qualquer deploy de migração:

1. decidir entre `prevlegal.com.br` ou `www.prevlegal.com.br` como canônico do site
2. manter `app.prevlegal.com.br` para a plataforma
3. depois executar a troca de env + código + Vercel na mesma janela

## Fontes

- Vercel — Adding & Configuring a Custom Domain:
  https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel — Setting up a custom domain:
  https://vercel.com/docs/domains/set-up-custom-domain
- Vercel — Deploying & Redirecting Domains:
  https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting
