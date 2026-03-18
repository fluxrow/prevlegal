# PrevLegal — ROADMAP.md
> Status atualizado: 18/03/2026

---

## Fases Concluídas

| Fase | Feature | Commit |
|------|---------|--------|
| 1-8 | Core: Kanban, Listas, WhatsApp, Agente IA, Relatórios base, Google Calendar | — |
| 9 | Relatórios com Recharts | — |
| 10 | Google Calendar OAuth | b5cca53 |
| 11 | Notificações em tempo real | — |
| 12 | Fix 404 leads/[id], tooltips parciais | — |
| 13 | Calculadora previdenciária (6 regras, fator prev, RMI) | 0e6307e |
| 14 | Geração de documentos IA | 8329b6b |
| 15 | Agente IA compliance (RE 564.354, OAB) | banco |
| 16 | Criação manual de lead + badge Manual | 973e210 |
| 17 | Busca global ⌘K | e69ef26 |
| 18 | Multi-usuário com roles (admin/operador/visualizador) | d9c22b1 |
| 19 | Perfil multi-advogado (tabela advogados) + avatar topbar | aecc4e1 |
| 20 | Portal do cliente (token, timeline, docs, chat) | a44ff96 |
| 21 | Gestão financeira (contratos, parcelas, dashboard) | cf99ff5 |
| 22 | Onboarding tooltips — 6 páginas | 18a859b |
| 23 | ROI por campanha (contratual + sucumbência separados) | b60be88 |

## Fixes importantes

| Fix | Commit |
|-----|--------|
| auth-role.ts remove tenant_id | 61ac925 |
| Busca global usa ultima_mensagem_em + proxy Next.js 16 | aac9c07 |
| LP nova — posicionamento operações captação | a930735 |
| Honorários de sucumbência | a52c4f2 |
| LP Cabinet Grotesk | 6ee6da4 |
| LP agente como consultora previdenciária | e0b6ec5 |
| Admin melhorias (MRR, filtros, toggle, alertas) | 9d38513 |

## Migrations Aplicadas (lrqvvxmgimjlghpwavdb)

| # | Migration | Descrição |
|---|-----------|-----------|
| 029 | financeiro | Tabelas contratos e parcelas |
| 030 | honorarios_sucumbencia | Campos sucumbência na tabela contratos |
| 031 | honorarios_separados_campanhas | Campos separados + view campanhas_resumo_financeiro |

---

## Backlog

### Alta prioridade
- [ ] Twilio multi-tenant — subcontas por tenant, credenciais no admin
- [ ] Vídeo animado de demo para a LP

### Média prioridade
- [ ] Obsidian MCP integration
- [ ] Página de detalhe do tenant no admin (métricas de uso por cliente)

### Baixa prioridade
- [ ] Repo GitHub privado
- [ ] Domínio + email exclusivo PrevLegal
- [ ] Stripe Billing integration
- [ ] Mobile dashboard read-only
