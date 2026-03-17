# PrevLegal

CRM e plataforma operacional para escritorio previdenciario, com foco em captura e qualificacao de leads, atendimento, automacoes, documentos juridicos e acompanhamento do cliente.

## Visao Geral

O sistema centraliza o fluxo do escritorio em uma unica aplicacao:
- dashboard com indicadores operacionais
- gestao de leads e funil
- caixa de entrada e conversas
- campanhas de contato
- agente IA com configuracao e base de conhecimento
- calculadora previdenciaria
- geracao de documentos juridicos por IA
- portal do cliente por link unico
- gestao de usuarios e roles
- perfil multi-advogado
- financeiro basico por lead

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Supabase
  - Auth
  - Postgres
  - Storage
- Anthropic SDK para geracao de documentos
- Twilio para WhatsApp
- Google APIs para agenda
- Tailwind CSS 4 no projeto, com bastante estilo inline nas telas atuais

## Modulos Principais

### 1. Leads

Arquivos principais:
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/app/api/leads/route.ts`
- `src/app/api/leads/[id]/route.ts`

Responsabilidades:
- listagem e detalhamento de leads
- dados pessoais e previdenciarios
- status do funil
- anexos e documentos do lead
- anotacoes

### 2. Calculadora Previdenciaria

Arquivos principais:
- `src/components/calculadora-prev.tsx`
- `src/lib/calculadora-prev.ts`
- `src/app/api/leads/[id]/calculadora/route.ts`
- `supabase/migrations/023_calculadora_prev.sql`

Responsabilidades:
- calculo de tempo de contribuicao
- regras pos-reforma
- estimativa de RMI
- apoio para documentos juridicos

### 3. Documentos Juridicos por IA

Arquivos principais:
- `src/lib/doc-templates.ts`
- `src/components/gerador-documentos-ia.tsx`
- `src/app/api/leads/[id]/gerar-documento/route.ts`
- `supabase/migrations/024_documentos_ia.sql`

Documentos atuais:
- Peticao Inicial
- Procuracao
- Requerimento INSS

Fluxo:
- o sistema busca dados do lead
- busca o perfil do advogado logado
- busca dados da calculadora, quando houver
- monta um prompt juridico estruturado
- gera o texto via Anthropic
- salva o documento no banco

### 4. Portal do Cliente

Arquivos principais:
- `src/app/portal/[token]/page.tsx`
- `src/components/portal-lead.tsx`
- `src/app/api/portal/[token]/route.ts`
- `src/app/api/portal/link/[leadId]/route.ts`
- `src/app/api/portal/mensagens/[leadId]/route.ts`
- `src/app/api/portal/compartilhar/route.ts`

Responsabilidades:
- link unico por lead
- visualizacao de status
- documentos compartilhados
- troca de mensagens escritorio-cliente

### 5. Multiusuario e Roles

Arquivos principais:
- `src/components/gestao-usuarios.tsx`
- `src/app/api/usuarios/route.ts`
- `src/app/api/usuarios/convidar/route.ts`
- `src/app/api/usuarios/aceitar-convite/route.ts`
- `src/lib/auth-role.ts`
- `supabase/migrations/026_roles_usuarios.sql`

Roles atuais:
- `admin`
- `operador`
- `visualizador`

### 6. Perfil Multi-Advogado

Arquivos principais:
- `src/app/(dashboard)/perfil/page.tsx`
- `src/app/api/perfil/route.ts`
- `src/app/api/perfil/upload/route.ts`
- `supabase/migrations/027_advogados.sql`

Responsabilidades:
- dados do advogado logado
- OAB
- dados do escritorio
- foto, logo e assinatura
- fonte de dados para documentos juridicos

### 7. Financeiro Basico

Arquivos principais:
- `src/app/(dashboard)/financeiro/page.tsx`
- `src/components/contrato-lead.tsx`
- `src/app/api/financeiro/contratos/route.ts`
- `src/app/api/financeiro/contratos/[id]/route.ts`
- `src/app/api/financeiro/parcelas/[id]/route.ts`
- `src/app/api/financeiro/resumo/route.ts`
- `src/lib/financeiro.ts`
- `supabase/migrations/029_financeiro.sql`

Responsabilidades:
- contratos de honorarios por lead
- geracao automatica de parcelas
- marcacao de pagamentos
- sinalizacao de atraso
- dashboard financeiro com KPIs

## Integracoes Externas

### Supabase

Usado para:
- autenticacao
- base principal do tenant
- storage de arquivos

Arquivos principais:
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/middleware.ts`

### Anthropic

Usado para:
- gerar documentos juridicos

Variavel principal:
- `ANTHROPIC_API_KEY`

### Twilio

Usado para:
- webhook de mensagens inbound
- fluxos de atendimento e campanhas

Arquivo principal:
- `src/app/api/webhooks/twilio/route.ts`

### Google Calendar

Usado para:
- conexao e verificacao de agenda
- integracao com agendamentos

Arquivos principais:
- `src/lib/google-calendar.ts`
- `src/app/api/google/auth/route.ts`
- `src/app/api/google/callback/route.ts`
- `src/app/api/google/status/route.ts`

## Estrutura de Pastas

```text
src/
  app/
    (auth)/
    (dashboard)/
    admin/
    api/
    portal/
  components/
  hooks/
  lib/
scripts/
supabase/
  migrations/
docs/
```

## Variaveis de Ambiente

Baseadas no arquivo `.env.example`:

### Supabase do tenant
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Supabase central
- `CENTRAL_SUPABASE_URL`
- `CENTRAL_SUPABASE_ANON_KEY`
- `CENTRAL_SUPABASE_SERVICE_ROLE_KEY`

### App
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

### Twilio
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

### Anthropic
- `ANTHROPIC_API_KEY`

### Google
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Como Rodar Localmente

1. Instale dependencias:

```bash
npm install
```

2. Configure o `.env.local` com base no `.env.example`

3. Rode o app:

```bash
npm run dev
```

4. Para validar build de producao:

```bash
npm run build
```

## Banco e Migrations

As migrations ficam em:
- `supabase/migrations`

Pontos importantes:
- o projeto ja passou por varias fases de evolucao de schema
- a Fase 21 adiciona `contratos` e `parcelas`
- antes de usar o financeiro em ambiente real, aplique a migration `029_financeiro.sql`

## Deploy

O projeto esta vinculado a Vercel localmente via `.vercel/project.json`.

Fluxo recomendado:

### Preview

```bash
vercel deploy -y
```

### Producao

```bash
vercel deploy --prod -y
```

Observacoes:
- neste ambiente do Codex, o deploy pode depender de fallback de rede/autorizacao
- nao faca deploy de producao sem garantir que a migration mais recente do Supabase foi aplicada

## Convencoes Atuais do Projeto

- o app usa bastante componente client-side para telas de dashboard
- varias telas usam estilos inline como padrao visual atual
- autenticacao de API costuma validar `supabase.auth.getUser()`
- a base atual trabalha em contexto single-tenant no app operacional
- a documentacao de trabalho em andamento fica em `docs/CODEX_HANDOFF.md`

## Validacao Atual

Estado confirmado nesta sessao:
- branch local alinhado ao commit `2f79771`
- build local passando
- financeiro basico implementado no codigo
- handoff local criado para repasse posterior

## Proximos Passos Sugeridos

- aplicar a migration `029_financeiro.sql` no Supabase do projeto
- testar o fluxo de criar contrato em um lead real
- testar marcacao de parcelas pagas e pendentes
- revisar deploy de preview na Vercel
- seguir atualizando `docs/CODEX_HANDOFF.md` a cada bloco de trabalho
