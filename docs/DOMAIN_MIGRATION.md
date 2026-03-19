# PrevLegal — Domain Migration Checklist
> Preparação para migrar de `prevlegal.vercel.app` para domínio próprio
> Atualizado em: 19/03/2026

## Objetivo

Migrar o projeto para domínio próprio com separação clara entre:

- site / LP
- plataforma
- possíveis superfícies futuras de admin

## Decisão operacional aprovada

- `www.prevlegal.com.br` -> site / LP canônico
- `prevlegal.com.br` -> redirect para `www.prevlegal.com.br`
- `app.prevlegal.com.br` -> plataforma principal
- `admin.prevlegal.com.br` -> painel admin desde o início

## Status da migração

- Fase 0 = CONCLUÍDA
- Fase 2 = CONCLUÍDA
- Fase 3 = CONCLUÍDA
- Fase 4 = CONCLUÍDA
- Fase 5 = CONCLUÍDA
- Fase 6 = CONCLUÍDA
- Commit principal da Fase 2: `cebda979`
- Nota Obsidian da execução: `2026-03-18-fase2-dominio-seo-lp-raiz.md`
- Observação operacional importante:
  - o apex `prevlegal.com.br` chegou a ficar misturado entre GoDaddy WebsiteBuilder e Vercel
  - esse conflito impediu a validação completa dos subdomínios e do SSL
  - após remover o WebsiteBuilder do apex, o painel passou a mostrar `Generating SSL Certificate` para `prevlegal.com.br`
  - `www`, `app` e `admin` podem permanecer alguns minutos em `Invalid Configuration` ou aguardando SSL até a emissão em cascata terminar

### Estado do app hoje

- produção canônica da plataforma: `https://app.prevlegal.com.br`
- produção canônica do site: `https://www.prevlegal.com.br`
- apex `https://prevlegal.com.br` redireciona para `https://www.prevlegal.com.br/`
- `https://admin.prevlegal.com.br` permanece no projeto principal do app
- `https://prevlegal.vercel.app` virou host técnico/fallback, não canônico
- o código usa `NEXT_PUBLIC_APP_URL` para fluxos autenticados e links operacionais
- `NEXT_PUBLIC_SITE_URL` separa SEO/site/metadata da plataforma

### Fechamento operacional confirmado em 2026-03-19

- Projeto `prevlegal-site` criado na Vercel com `Root Directory = site`
- `www.prevlegal.com.br` ligado ao projeto `prevlegal-site`
- `prevlegal.com.br` configurado na Vercel com redirect para `www.prevlegal.com.br`
- `prevlegal-site` ganhou `robots.txt` e `sitemap.xml` estaticos para o host publico
- `app.prevlegal.com.br` e `admin.prevlegal.com.br` preservados no projeto `prevlegal`
- DNS final no GoDaddy:
  - `@` -> `A` -> `216.198.79.1`
  - `www` -> `CNAME` -> `adac959f3e49cb9d.vercel-dns-017.com.`
  - `app` -> `CNAME` -> `cname.vercel-dns.com.`
  - `admin` -> `CNAME` -> `cname.vercel-dns.com.`
- Env alinhadas no projeto `prevlegal`:
  - `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br`
  - `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br`
  - `GOOGLE_REDIRECT_URI=https://app.prevlegal.com.br/api/google/callback`
- Observacao operacional:
  - `Preview` envs ficaram fora do corte final via CLI porque a Vercel exigiu branch especifica para esse target
  - `Production` e `Development` ficaram alinhados

### Estrutura preparada para separação em dois projetos Vercel

- `site/` foi criado no repositório como raiz dedicada para o projeto público/LP
- `site/index.html` replica a LP atual
- `site/demo.html` replica o demo embedado e já mostra `app.prevlegal.com.br`
- `site/vercel.json` permite deploy estático limpo no projeto novo `prevlegal-site`
- objetivo operacional:
  - projeto atual `prevlegal` -> `app.prevlegal.com.br` e `admin.prevlegal.com.br`
  - projeto novo `prevlegal-site` -> `www.prevlegal.com.br`
  - `prevlegal.com.br` -> redirect para `www.prevlegal.com.br`

## Estado atual encontrado no código

### URLs absolutas e pontos de atenção

- `public/lp.html`
  - CTAs ainda apontam para `https://prevlegal.vercel.app/login`
  - fallback literal mantido temporariamente por ser HTML estático fora do bundle do Next
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
  - agora usa `NEXT_PUBLIC_APP_URL` em vez de antecipar subdomínio por tenant
- `docs/MASTER.md`
  - ainda registra a produção atual como `https://prevlegal.vercel.app`

### Observações

- O projeto agora separa `NEXT_PUBLIC_SITE_URL` (site/LP/SEO) de `NEXT_PUBLIC_APP_URL` (plataforma/convites/portal).
- HTMLs estáticos em `public/` não conseguem ler `process.env` em runtime; por isso usam fallback literal temporário até o cutover.
- O mockup do demo e a LP precisam ser ajustados em conjunto na janela final da migração para evitar inconsistência visual.

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
- [x] escolher host canônico do site:
  - [x] `www.prevlegal.com.br`
  - [ ] `prevlegal.com.br`
- [x] confirmar `app.prevlegal.com.br` para a plataforma
- [x] decidir host inicial do admin:
  - [x] `admin.prevlegal.com.br`

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
- [x] recriar `src/app/page.tsx` com redirect inteligente:
  - [x] sessão -> `/dashboard`
  - [x] sem sessão -> `/lp.html`
- [x] substituir `src/app/layout.tsx` por metadata SEO completa
- [x] criar `src/app/sitemap.ts`
- [x] criar `src/app/robots.ts`
- [x] criar `public/manifest.json`
- [x] endurecer `next.config.ts` com headers de segurança
- [x] criar `src/app/og/route.tsx`
- [x] adicionar assets públicos de ícone para SEO/PWA
- [x] normalizar `NEXT_PUBLIC_APP_URL` em `src/app/api/usuarios/convidar/route.ts`
- [x] normalizar `NEXT_PUBLIC_APP_URL` em `src/app/api/portal/link/[leadId]/route.ts`
- [ ] revisar `src/app/api/webhooks/twilio/route.ts`
- [ ] revisar `src/app/api/webhooks/twilio/status/route.ts`
- [ ] revisar `src/app/api/google/callback/route.ts`
- [x] revisar `src/app/admin/[id]/page.tsx`
- [x] criar `NEXT_PUBLIC_SITE_URL` em `.env.local`
- [x] manter `public/lp.html` com fallback literal temporário documentado
- [x] atualizar docs de URL principal
- [x] rodar `npm run build`

Saída esperada:
- nenhum link crítico hardcoded para `prevlegal.vercel.app`
- separação clara entre URL pública do site e URL pública da plataforma

### Fase 3 — configurar Vercel

Objetivo:
- preparar os hosts no projeto antes do DNS final

Checklist:
- [ ] criar projeto novo `prevlegal-site`
- [ ] conectar o mesmo repositório no projeto novo
- [ ] definir `Root Directory = site`
- [ ] manter no projeto atual `prevlegal` apenas:
  - [ ] `app.prevlegal.com.br`
  - [ ] `admin.prevlegal.com.br`
- [ ] mover `www.prevlegal.com.br` para o projeto `prevlegal-site`
- [ ] configurar `prevlegal.com.br` com redirect para `https://www.prevlegal.com.br`
- [ ] revisar qual host ficará como primary domain em cada projeto

Saída esperada:
- Vercel pronta para validar DNS e emitir HTTPS

Checklist de verificação real:
- [ ] confirmar que o domínio foi adicionado no owner/time correto da Vercel
- [ ] confirmar que o painel não mostra conflito de ownership ou acesso ao domínio
- [ ] confirmar que o apex entrou em `Generating SSL Certificate` antes de concluir que o setup está certo

### Fase 4 — configurar DNS

Objetivo:
- apontar o domínio comprado para o projeto certo

Checklist:
- [ ] criar/editar registros solicitados pela Vercel
- [ ] remover WebsiteBuilder / forwarding / parking da GoDaddy no apex
- [ ] garantir que o `@` não mistura IP da GoDaddy com IPs da Vercel
- [ ] validar resolução do apex
- [ ] validar resolução de `www`
- [ ] validar resolução de `app`
- [ ] aguardar propagação completa

Saída esperada:
- todos os hosts resolvendo corretamente

Sinais de erro conhecidos:
- se `prevlegal.com.br` responder com `Server: DPS/2.0.0-beta`, o apex ainda está na GoDaddy
- se o apex validar mas `www`, `app` e `admin` ficarem amarelos, pode ser apenas a emissão em cascata do SSL
- não mexer de novo nos registros enquanto o painel já estiver em `Generating SSL Certificate`, salvo se houver apontamento claro para GoDaddy ainda ativo

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
- [ ] apex não responde mais conteúdo/headers da GoDaddy
- [ ] `www`, `app` e `admin` saíram do estado `Invalid Configuration`

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
- [ ] registrar explicitamente se houve conflito com GoDaddy WebsiteBuilder / DNS misto / SSL em cascata

Saída esperada:
- memória do projeto atualizada com o novo domínio oficial

## Branding dos emails de Auth

Objetivo:
- evitar emails genéricos de `Supabase Auth`
- aumentar confiança do usuário ao redefinir senha ou ativar conta

Recomendação:
- configurar SMTP próprio no Supabase Auth
- usar remetente como `no-reply@auth.prevlegal.com.br`
- usar nome do remetente como `PrevLegal`
- personalizar os templates de `Reset password`, `Invite user` e `Magic link`
- avaliar custom domain do Supabase Auth (`auth.prevlegal.com.br`) para branding completo do host dos links

Observação prática:
- personalizar remetente e conteúdo é simples via Supabase Dashboard/Management API
- personalizar também o host visível do link depende de custom SMTP + template e, para experiência completa, de custom domain no Supabase Auth

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

## Env vars definitivas aprovadas

- `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br`
- `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br`

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

- [ ] Atualizar `public/lp.html` com o domínio final do app na janela de cutover
- [ ] Atualizar `public/demo.html` com o domínio final do app na janela de cutover
- [x] Atualizar `src/app/api/usuarios/convidar/route.ts`
- [x] Atualizar `src/app/api/portal/link/[leadId]/route.ts`
- [ ] Revisar `src/app/api/webhooks/twilio/route.ts`
- [ ] Revisar `src/app/api/webhooks/twilio/status/route.ts`
- [ ] Revisar `src/app/api/google/callback/route.ts`
- [x] Revisar `src/app/admin/[id]/page.tsx`
- [x] Atualizar `docs/MASTER.md`

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

1. configurar `www`, apex redirect, `app` e `admin` no Vercel
2. aplicar o DNS pedido pelo painel
3. trocar as env vars para os valores finais e redeployar na mesma janela

## Fontes

- Vercel — Adding & Configuring a Custom Domain:
  https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel — Setting up a custom domain:
  https://vercel.com/docs/domains/set-up-custom-domain
- Vercel — Deploying & Redirecting Domains:
  https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting
