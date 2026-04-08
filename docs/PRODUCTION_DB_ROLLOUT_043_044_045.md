# PrevLegal — Production DB Rollout 043 / 044 / 045

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Runbook curto para estabilizar a produção antes do go-live real.
> Última atualização: 08/04/2026

## Objetivo

Aplicar em produção, com segurança, as foundations:
- `043_user_calendar_ownership`
- `044_user_permissions_foundation`
- `045_document_processing_foundation`

## Por que isso é prioridade

Sem esse patch, o produto continua funcional apenas porque o runtime ganhou vários fallbacks.

Isso é aceitável para continuidade de desenvolvimento, mas não é estado final de operação.

Hoje os principais efeitos desse atraso são:
- agenda Google operando em modo de compatibilidade
- ownership do calendário não persistido de forma completa
- permissões granulares ainda dependentes de fallback
- foundation Docling ainda sem schema canônica no banco

## Artefato canônico de aplicação

Arquivo:
- `supabase/manual/2026-04-08_apply_043_044_045.sql`

Esse patch é:
- idempotente
- focado só no que está pendente
- seguro para banco que ainda não recebeu essas colunas/tabelas

## Caminho recomendado

### Opção 1 — SQL Editor do Supabase

Usar quando:
- o CLI estiver sem senha do Postgres remoto
- o histórico de migrations remoto estiver divergente dos nomes locais

Passos:
1. abrir o projeto operacional `lrqvvxmgimjlghpwavdb`
2. abrir SQL Editor
3. executar `supabase/manual/2026-04-08_apply_043_044_045.sql`
4. validar o resultado com as consultas abaixo

### Opção 2 — CLI / psql

Usar apenas quando:
- a senha do Postgres remoto estiver disponível
- ou o histórico de migrations já tiver sido normalizado

## Validação mínima após aplicar

### 1. Agenda por usuário

Confirmar existência das colunas:
- `usuarios.google_calendar_token`
- `usuarios.google_calendar_email`
- `usuarios.google_calendar_connected_at`
- `configuracoes.google_calendar_email`
- `configuracoes.google_calendar_connected_at`
- `agendamentos.calendar_owner_scope`
- `agendamentos.calendar_owner_usuario_id`
- `agendamentos.calendar_owner_email`

### 2. Permissões granulares

Confirmar existência da coluna:
- `usuarios.permissions`

### 3. Foundation Docling

Confirmar existência das tabelas:
- `document_processing_jobs`
- `document_parsed_contents`
- `document_chunks`

## Smoke test obrigatório depois da aplicação

1. login do responsável do tenant
2. login de usuário convidado
3. edição de permissões por usuário
4. conexão Google do usuário
5. conexão do calendário do escritório
6. criar agendamento
7. remarcar agendamento
8. cancelar agendamento
9. upload de documento do lead
10. conferir status de parsing no lead

## Situação do CLI nesta sessão

Foi confirmado:
- o repo foi ligado ao projeto `lrqvvxmgimjlghpwavdb`
- o `supabase db push` não é o caminho seguro agora

Motivos:
- histórico remoto de migrations não bate com os nomes locais
- CLI está sem senha válida do Postgres remoto para `db push`

Conclusão:
- aplicar o patch SQL direto é o caminho mais seguro e rápido

## Próximo passo oficial

Executar `supabase/manual/2026-04-08_apply_043_044_045.sql` no projeto operacional e validar a agenda Google sem fallback.
