# PrevLegal — SESSION_BRIEF.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

Resumo curto para retomada rapida de contexto no inicio de qualquer sessao.

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[CODEX_HANDOFF]]
- [[SESSION_PROTOCOL]]

## Fonte de Verdade

Ordem de leitura:
1. `docs/SESSION_BRIEF.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/ROADMAP.md`
4. `docs/LEARNINGS.md`
5. Vault Obsidian em `~/Documents/Fluxrow/PrevLegal/`

## Estado Atual

Ultima atualizacao: 2026-03-19

- Branch principal: `main`
- Linha atual do produto no Obsidian: Fases 21, 22, 23, 24 e 25 concluidas
- Fase atual: bootstrap multi-tenant apos reset limpo do operacional + ajuste pendente do Google OAuth
- Producao atual: `https://app.prevlegal.com.br`
- LP canônica: `https://www.prevlegal.com.br`
- Dominio comprado: `prevlegal.com.br`
- Estado operacional confirmado:
  - banco operacional alvo: `lrqvvxmgimjlghpwavdb`
  - projeto central preservado: `zjelgobexwhhfoisuilm`
  - `supabase/reset/combined_apply_031_and_reset.sql` executado com sucesso direto no operacional
  - contagens finais zeradas em `tenants`, `usuarios`, `listas`, `leads`, `conversas`, `mensagens_inbound`, `portal_mensagens`, `configuracoes`, `contratos` e `parcelas`
- bootstrap tenant-aware iniciado no codigo para responsavel, convites, importacao e lead manual
- cadastro do primeiro escritorio no admin endurecido com geracao automatica de slug e feedback de erro no modal
- middleware agora respeita `/api/admin/*` com `admin_token`, evitando redirecionamento indevido para `/login` do app durante o bootstrap
- middleware agora tambem respeita `/api/admin/reauth` como rota publica do admin
- primeiro escritorio de teste ja foi criado com sucesso no operacional limpo (`Fluxrow`)
- onboarding do primeiro tenant agora pode seguir mesmo apos a criacao do primeiro usuario, e a tela de redefinicao aceita `token_hash`/`code`
- `Enviar acesso do responsavel` agora ja devolve o link manual de contingencia no mesmo passo
- `Enviar reset de senha` agora tambem devolve o link manual de contingencia no mesmo passo
- reset manual agora usa token proprio no backend e nao depende mais da sessao recovery do Supabase
- importacao de listas foi endurecida:
  - bloqueio de duplicidade por nome/arquivo no mesmo tenant
  - erro real de insert nao e mais engolido
  - `/api/listas` agora mapeia os totais corretamente para a UI
  - `/api/listas` deixa de exibir a lista tecnica `Cadastro manual` na visao padrao
  - `/api/listas/[id]` agora permite excluir uma lista importada pela plataforma
  - `/api/whatsapp/verificar` agora usa `leads.lista_id` e nao mais a tabela legado `lista_leads`
  - listas orfas de teste com `0` leads no tenant `Fluxrow` foram removidas em `2026-03-20` para liberar o reteste
  - o reteste mostrou `78` ativos vs `55` leads inseridos; a UI de importacao agora exibe `falhas_insercao` e os warnings das linhas rejeitadas
- Contencao atual:
  - allowlist do app continua ativa
  - onboarding fora do piloto continua bloqueado
  - endurecimento temporario por ownership de usuario continua no codigo ate o tenant isolation definitivo

## Proximo Passo Recomendado

Validar o primeiro tenant real/limpo:
- reimportar a lista no tenant `Fluxrow` e confirmar que os leads entram
- confirmar que a segunda importacao da mesma lista e bloqueada
- validar a pagina `/listas` com os totais corretos
- depois seguir para tenant isolation canonico por `tenant_id`

## Bloqueios e Cuidados

- Sempre rodar `npm run build` antes de concluir uma fase
- Sempre atualizar `docs/CODEX_HANDOFF.md`, `docs/ROADMAP.md` e `docs/LEARNINGS.md`
- Sempre sincronizar os docs com o Obsidian ao final da sessao
- Ao mexer em produto, considerar `SITE_URL` separado de `APP_URL`
- Na Vercel CLI atual, env de `Preview` pode exigir branch especifica; registrar isso antes de assumir que o projeto esta 100% alinhado
- O modelo atual tem comportamento single-tenant em varias tabelas e APIs; nao subir novos escritorios sem revisar isolamento de dados

## Caminhos Importantes

- Handoff local: `docs/CODEX_HANDOFF.md`
- Roadmap local: `docs/ROADMAP.md`
- Learnings locais: `docs/LEARNINGS.md`
- Master local: `docs/MASTER.md`
- Vault Obsidian:
  - `~/Documents/Fluxrow/PrevLegal/MASTER.md`
  - `~/Documents/Fluxrow/PrevLegal/ROADMAP.md`
  - `~/Documents/Fluxrow/PrevLegal/LEARNINGS.md`

## Regra de Sessao

No inicio:
- ler este arquivo
- rodar `scripts/resume-context.sh`

No final:
- atualizar docs locais
- rodar `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`
