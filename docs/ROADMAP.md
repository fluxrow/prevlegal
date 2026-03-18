# PrevLegal — ROADMAP.md
> Última atualização: 18/03/2026

## Fases Concluídas

| Fase | Feature | Commit |
|------|---------|--------|
| 1-8 | Core: Kanban, Listas, WhatsApp, Agente IA, Relatórios, Google Calendar | — |
| 9 | Relatórios com Recharts | — |
| 10 | Google Calendar OAuth | b5cca53 |
| 11 | Notificações em tempo real | — |
| 12 | Fix 404 leads/[id], tooltips parciais | — |
| 13 | Calculadora previdenciária | 0e6307e |
| 14 | Geração de documentos IA | 8329b6b |
| 15 | Agente IA compliance OAB | banco |
| 16 | Criação manual de lead | 973e210 |
| 17 | Busca global ⌘K | e69ef26 |
| 18 | Multi-usuário com roles (admin/operador/visualizador) | d9c22b1 |
| 19 | Perfil multi-advogado + avatar topbar | aecc4e1 |
| 20 | Portal do cliente (token, timeline, docs, chat) | a44ff96 |
| 21 | Gestão financeira (contratos, parcelas, dashboard) | cf99ff5 |
| 22 | Onboarding tooltips — 6 páginas | 18a859b |
| 23 | ROI por campanha (contratual + sucumbência separados) | b60be88 |

## Commits das sessões 17-18/03/2026

| Commit | Descrição |
|--------|-----------|
| e18cee6 | fix: disparo de campanhas, middleware de auth e LP inicial |
| e26cc42 | fix(ui): UX de campanhas, sidebar e agente IA |
| cf99ff5 | feat: gestão financeira + fix adminSupabase |
| 61ac925 | fix: auth-role remove tenant_id inexistente |
| aac9c07 | fix: busca global usa ultima_mensagem_em + proxy Next.js 16 |
| 9983704 | fix: LP corrige CTA, email e remove NB do agente |
| a930735 | feat: LP nova — posicionamento operações captação |
| a52c4f2 | feat: honorários de sucumbência no contrato e financeiro |
| 6ee6da4 | feat: LP — Cabinet Grotesk |
| 3c305bd | fix: LP — remove vínculo escritório no agente |
| e0b6ec5 | fix: agente como consultora previdenciária |
| b60be88 | feat: ROI por campanha |
| 9d38513 | feat: admin — MRR, filtros, toggle, alertas trial |
| de80551 | docs: MASTER, LEARNINGS, ROADMAP criados |
| 89c302b | fix: email git para fbcfarias@icloud.com |
| 1d6a4fe | fix: LP CTA para /login + link admin no footer |
| 5d78202 | chore: script sync-obsidian.sh criado |
| affb16c | chore: redeploy env vars admin Vercel |

## Migrations Aplicadas (lrqvvxmgimjlghpwavdb)

| # | Migration | Descrição |
|---|-----------|-----------|
| 029 | financeiro | Tabelas contratos e parcelas |
| 030 | honorarios_sucumbencia | Campos sucumbência em contratos |
| 031 | honorarios_separados_campanhas | View campanhas_resumo_financeiro |

## Env Vars Adicionadas no Vercel (18/03/2026)

| Var | Descrição |
|-----|-----------|
| ADMIN_FLUXROW_EMAIL | Email de acesso ao painel admin |
| ADMIN_FLUXROW_SENHA | Senha de acesso ao painel admin |
| ADMIN_FLUXROW_TOKEN | Token de sessão httpOnly — gerado com openssl |

## Obsidian — Setup Concluído

- Vault criado em `~/Documents/Fluxrow`
- Plugin Local REST API instalado (porta 27124 HTTPS)
- Claude Desktop configurado com `obsidian-filesystem` + `obsidian-rest` MCPs
- `uvx` instalado via Homebrew
- Script `sync-obsidian.sh` em `scripts/sync-obsidian.sh`

## Conhecimento Consolidado das Sessões 17-18/03/2026

### Arquitetura e compatibilidade
- Next.js 16 exige `proxy.ts` com export `proxy`, não apenas rename do arquivo
- Handlers admin com Supabase service role precisam instanciar `createClient` dentro de cada função
- A tabela `usuarios` é single-tenant e não possui `tenant_id`
- A tabela `conversas` usa `ultima_mensagem_em`, não `updated_at`

### Produto e posicionamento
- PrevLegal não é SaaS para advogado autônomo: o posicionamento correto é operação de captação previdenciária com escritório parceiro
- O agente comercial nunca deve se apresentar como representante do escritório parceiro
- O CTA principal da LP deve apontar para `/login`, não para a raiz do domínio

### Financeiro e ROI
- O sistema agora separa honorários contratuais de honorários de sucumbência
- A sucumbência tem campos próprios em contratos, KPI específico no financeiro e totais separados no resumo
- ROI por campanha agora tem aba dedicada com ranking, gráfico e tabela detalhada

### Admin e segurança operacional
- O admin ganhou filtros por plano/status, MRR estimado, toggle ativar/suspender e alerta de trial expirando
- O acesso admin foi desenhado em 3 camadas:
  - rota discreta
  - cookie httpOnly
  - token secreto validado no servidor com expiração
- Após configurar env vars no Vercel, foi necessário forçar redeploy para garantir leitura no ambiente de produção

### Marketing site / LP
- A LP foi reescrita com foco em operações de captação previdenciária
- Tipografia de títulos migrada para Cabinet Grotesk
- Mockups e copy do agente foram limpos de NB e de qualquer vínculo explícito com escritório parceiro

### Documentação viva e rotina de sessão
- `MASTER.md`, `ROADMAP.md` e `LEARNINGS.md` passaram a funcionar como memória viva do projeto
- Ao final de cada sessão, a documentação deve ser sincronizada com o vault do Obsidian
- O script `scripts/sync-obsidian.sh` cria uma nota datada da sessão com commits recentes e próximo passo

## Backlog

### Alta prioridade
- [ ] Vídeo animado de demo para a LP (HTML/CSS/JS)
- [ ] Twilio multi-tenant — subcontas por tenant, credenciais no admin

### Média prioridade
- [ ] Página de detalhe do tenant no admin (métricas de uso por cliente)

### Baixa prioridade
- [ ] Repo GitHub privado
- [ ] Domínio + email exclusivo PrevLegal (prevlegal.com.br)
- [ ] Stripe Billing
