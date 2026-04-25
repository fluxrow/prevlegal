# PrevLegal — OPERATIONAL_BOOK_MULTITENANT.md

Contexto: [[OPERATIONAL_BOOK]]
Mestra: [[MASTER_PREV_LEGAL]]

## Objetivo

Consolidar as regras práticas de operação multi-tenant no estado atual do produto.

## Regra de ouro

Toda decisão operacional deve partir do tenant atual do usuário autenticado.

## Fonte de verdade

O tenant operacional do usuário vem de `public.usuarios` vinculado ao `auth.uid()`.

## Estado atual

- o isolamento principal está nas rotas/backend
- o banco ainda tem débito técnico de RLS em partes do sistema
- por isso, toda mudança que toca leitura ou escrita sensível precisa respeitar tenant no backend

## Convites e acessos

- convite precisa nascer no tenant correto
- aceite precisa criar o usuário certo e autenticar a conta certa
- não assumir que o navegador vai trocar de sessão sozinho

## Mesma pessoa em mais de um escritório

Não tratar isso como resolvido no produto atual.

Regra operacional:

- antes de existir seletor formal de escritório, evitar depender do mesmo login operando múltiplos tenants de forma simultânea

## Containment

Quando houver contenção operacional:

- preferir allowlist por `tenant_id`
- evitar regra final baseada só em e-mail

## Quando auditar isolamento

Auditar sempre que houver:

- novo tenant pagante
- nova rota sensível
- mudança em campanhas, inbox, documentos ou configurações

## Referências

- [[PRODUCTION_ISOLATION_STRATEGY]]
- [[TENANT_ISOLATION_AUDIT]]
- [[TENANT_SMOKE_TEST_CHECKLIST]]
