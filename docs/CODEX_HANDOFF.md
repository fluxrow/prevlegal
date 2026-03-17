# PrevLegal - Handoff de Trabalho

Este documento registra o que foi analisado, alterado, validado e combinado durante a continuidade do desenvolvimento no Codex.

Objetivo:
- servir como memoria de trabalho local
- facilitar o repasse posterior para o Claude
- registrar decisoes, arquivos afetados, validacoes e proximos passos

## Estado Atual Confirmado

Data da ultima revisao: 2026-03-16

- Repositorio local em `main`
- `HEAD` local: `2f79771`
- Esse commit coincide com o deploy atual mostrado na imagem enviada pelo usuario
- O projeto esta vinculado a Vercel pelo arquivo `.vercel/project.json`
- `npm run build` executado com sucesso no estado atual
- `README.md` foi expandido nesta sessao para documentar o sistema

## Mapa Atual do Sistema

Modulos ja identificados no app:
- dashboard geral
- leads e pagina de detalhe do lead
- calculadora previdenciaria
- geracao de documentos juridicos por IA
- portal do cliente por link unico
- caixa de entrada e mensagens
- busca global
- campanhas
- relatorios
- configuracoes e gestao de usuarios
- perfil multi-advogado
- financeiro basico

## Documentos Juridicos Ja Implementados

- Peticao Inicial
- Procuracao
- Requerimento INSS

Base atual identificada:
- prompts em `src/lib/doc-templates.ts`
- geracao via API em `src/app/api/leads/[id]/gerar-documento/route.ts`

## Proxima Fase Combinada

Fase 21 - Gestao Financeira Basica

Escopo combinado pelo usuario:
- contratos de honorarios por lead
- parcelas automaticas
- pagamentos e pendencias
- resumo financeiro
- pagina `/financeiro`
- bloco de contrato na pagina do lead
- item Financeiro na sidebar

## Cuidados de Compatibilidade

Pontos que precisam ser preservados durante a implementacao:
- nao quebrar o fluxo atual do lead detail
- nao interferir na geracao de documentos IA
- nao quebrar a navegacao da sidebar
- manter compatibilidade com autenticacao atual via Supabase
- respeitar o isolamento de dados ja existente no app
- validar build ao final de cada fase importante

## Registro de Validacoes

2026-03-16
- Confirmado que o projeto local esta alinhado ao commit `2f79771`
- Confirmado que o build atual passa
- Confirmado que existe ligacao local com a Vercel via `.vercel/project.json`
- Confirmado que o README atual nao documenta o sistema

2026-03-16 - Fase 21 implementada no codigo local
- Criada a migration `supabase/migrations/029_financeiro.sql`
- Criado o helper `src/lib/financeiro.ts`
- Criadas as APIs:
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/contratos/[id]/route.ts`
  - `src/app/api/financeiro/parcelas/[id]/route.ts`
  - `src/app/api/financeiro/resumo/route.ts`
- Criada a tela `src/app/(dashboard)/financeiro/page.tsx`
- Criado o componente `src/components/contrato-lead.tsx`
- Integrado o financeiro na pagina do lead
- Adicionado o item Financeiro na sidebar
- `npm run build` executado novamente com sucesso apos a implementacao

2026-03-16 - Publicacao e ambiente
- Preview deploy publicado na Vercel com status Ready
- URL de preview: `https://prevlegal-1vaer5xfa-fluxrow.vercel.app`
- Alias adicional da Vercel: `https://prevlegal-fbcfarias-8916-fluxrow.vercel.app`
- `npx vercel inspect` confirmou deploy pronto
- Supabase CLI encontrado localmente (`2.78.1`), mas sem autenticacao ativa
- A migration `029_financeiro.sql` ainda nao foi aplicada no projeto remoto por falta de `SUPABASE_ACCESS_TOKEN` ou login local do CLI

## Arquivos Alterados Nesta Sessao

- `supabase/migrations/029_financeiro.sql`
- `src/lib/financeiro.ts`
- `src/app/api/financeiro/contratos/route.ts`
- `src/app/api/financeiro/contratos/[id]/route.ts`
- `src/app/api/financeiro/parcelas/[id]/route.ts`
- `src/app/api/financeiro/resumo/route.ts`
- `src/app/(dashboard)/financeiro/page.tsx`
- `src/components/contrato-lead.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/components/sidebar.tsx`
- `README.md`
- `docs/CODEX_HANDOFF.md`

## Proximos Passos

- aplicar a migration `029_financeiro.sql` no Supabase do projeto
- validar o fluxo do financeiro no preview
- autenticar o Supabase CLI ou fornecer token para aplicar a migration remota
- depois do banco atualizado, promover para producao se desejar
- continuar atualizando este arquivo a cada bloco de trabalho concluido
