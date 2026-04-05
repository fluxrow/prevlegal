# SESSION_BRIEF — PrevLegal (atualizado 05/04/2026)

## Stack e repositório
- Next.js 16 App Router + React 19 + Supabase + Twilio WhatsApp + Claude API + Vercel
- Repo: https://github.com/fluxrow/prevlegal
- Branch operacional: `main` (commit atual: 34e3f92)

## Banco operacional
- Supabase project: `lrqvvxmgimjlghpwavdb`

## Fases entregues (todas no main)

| Fase | Descrição | Commits |
|------|-----------|---------|
| A | Colaboração interna — thread, tasks, handoff, inbox strip | 7b468e1..d7eea54 |
| B | Follow-up engine — worker Vercel Cron 5min, stop conditions em 4 pontos | e1a9027..8bea965 |
| C | Multi-agente por tenant — tabela agentes, CRUD, UI, wire responder com fallback | 1e8ae47 |
| D | Roteamento por campanha/estágio + métricas por agente | 34e3f92 |

## Pendências operacionais (ação manual do usuário)
1. **CRON_SECRET no Vercel** — adicionar env var no Vercel dashboard
2. **Aplicar migration 041** — SQL Editor do Supabase:
   ```sql
   -- supabase/migrations/041_campanha_agente_routing.sql
   -- enum agente_tipo, tipo em agentes, agente_id em campanhas, agente_respondente_id em mensagens_inbound
   ```

## Arquitetura de roteamento do agente (Fase D)
Prioridade no responder:
1. Agente da campanha do lead (`campanhas.agente_id`)
2. Agente por tipo do estágio do lead (`agentes.tipo` = STATUS_TO_TIPO[lead.status])
3. Agente padrão do tenant (`is_default = true`)
4. Config global (`configuracoes`)

Mapa status → tipo:
- novo/em_contato → triagem
- qualificado/agendado → confirmacao_agenda
- perdido/sem_resposta → reativacao

## Próximo bloco — Fase E (sugestão)
- Orquestração avançada: encadear múltiplos agentes por lead
- Dashboard executivo: painel centralizado por agente/campanha
- Warm-up automático de números WhatsApp

## Arquivos-chave para contexto rápido
- `docs/ROADMAP.md` — histórico completo de fases
- `docs/CODEX_HANDOFF.md` — log técnico detalhado
- `docs/LEARNINGS.md` — aprendizados acumulados
- `src/app/api/agente/responder/route.ts` — lógica de roteamento
- `src/app/api/agentes/[id]/metricas/route.ts` — métricas por agente
- `supabase/migrations/041_campanha_agente_routing.sql` — migration Fase D
