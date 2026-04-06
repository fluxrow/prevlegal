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
| E | Gatilhos de Ativação Automática (BD, APIs e Orquestrador backend) | a528367..atual |

## Pendências operacionais (próxima rodada)
- Validar se o Vercel Cron das 5min foi oficialmente pausado na dashboard para usar o plano Hobby (atualmente 0 0 * * *).
- Continuar desenhando a interface do Formulário Modal Avançado de Gatilhos na aba de `Automações`.

## Arquitetura de Roteamento (Fase D & E)
Prioridade no responder mantém Fase D.
Gatilho automático: a mudança de status do lead na API `PATCH` chama o *Orquestrador*, varrendo `event_triggers` e rodando followups (podendo cancelar os velhos).

## Próximo bloco (Divisão Segura anti-timeout)
1. Concluir a Interface Modal de Automações (`novo gatilho`).
2. Fazer o Botão "Templates Seed" que injeta os padrões de mercado.
3. Dashboard Executivo e Warm-up.

## Arquivos-chave para contexto rápido
- `docs/ROADMAP.md` — histórico completo
- `docs/SESSION_BRIEF.md` — estado atual e transição de IAs
- `src/lib/events/orchestrator.ts` — orquestrador de gatilhos na mudança de status do lead
- `supabase/migrations/042_event_triggers.sql` — infra de BD para eventos
