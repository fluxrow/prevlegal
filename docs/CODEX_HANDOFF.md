# PrevLegal - Handoff de Trabalho

Este documento registra o que foi analisado, alterado, validado e combinado durante a continuidade do desenvolvimento no Codex.

## Navegação

- [[INDEX]]
- [[SESSION_BRIEF]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_PROTOCOL]]

Objetivo:
- servir como memoria de trabalho local
- facilitar o repasse posterior para o Claude
- registrar decisoes, arquivos afetados, validacoes e proximos passos

## Estado Atual Confirmado

Data da ultima revisao: 2026-03-18

- Repositorio local em `main`
- `HEAD` commitado atual: `87122de0`
- Existe um conjunto local nao commitado da Fase 25 (`Session Security Hardening`)
- O projeto esta vinculado a Vercel pelo arquivo `.vercel/project.json`
- `npm run build` executado com sucesso apos o hardening de sessao
- `README.md` e docs de sessao continuam sendo a base de memoria do projeto

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

## Fase Atual em Trabalho

Fase 25 - Session Security Hardening

Escopo em implementacao local:
- timeout por inatividade na plataforma (`45 min`)
- timeout por inatividade no admin (`15 min`)
- reautenticacao para financeiro e admin
- paginas dedicadas de reautenticacao
- refresh de atividade por cookie httpOnly
- logout automatico no cliente por inatividade

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

2026-03-17 - Fase 22 onboarding expandido em andamento
- Objetivo: completar os tours guiados nas paginas Dashboard, Agendamentos, Listas, Campanhas, Relatorios e detalhe do lead
- Padrao seguido a partir de:
  - `src/hooks/useOnboarding.ts`
  - `src/components/onboarding-tooltip.tsx`
  - `src/components/leads-onboarding-tour.tsx`
- Novos componentes criados:
  - `src/components/dashboard-onboarding-tour.tsx`
  - `src/components/agendamentos-onboarding-tour.tsx`
  - `src/components/listas-onboarding-tour.tsx`
  - `src/components/campanhas-onboarding-tour.tsx`
  - `src/components/relatorios-onboarding-tour.tsx`
  - `src/components/lead-detalhe-onboarding-tour.tsx`
- Integracoes aplicadas:
  - Dashboard: anchors em KPIs, pipeline e leads recentes
  - Agendamentos: anchors em lista, bloco Google Calendar e legenda de status
  - Listas: anchors em lista, botao importar e bloco explicativo de status
  - Campanhas: anchors em lista principal, botao nova campanha e dois cards explicativos para metricas e fluxo com agente IA
  - Relatorios: anchors em abas, grid de KPIs e botao/aba de funil
  - Detalhe do lead: anchors em dados do perfil, calculadora, geracao de documentos IA e portal do cliente
- Reset de onboarding ampliado em `src/components/onboarding-reset-section.tsx` para listar as 9 paginas com tour
- Motivo de alguns blocos explicativos extras:
  - garantir alvos estaveis para o tour mesmo quando a pagina ainda nao tiver dados carregados
  - evitar steps quebrando por falta de elemento alvo no primeiro acesso
- Validacao concluida:
- `npm run build` executado com sucesso apos integrar os novos tours

2026-03-18 - Dominio proprio / DNS / SSL
- Foi identificado conflito entre o apex `prevlegal.com.br` e o WebsiteBuilder da GoDaddy
- Sintoma observado: apex respondendo headers da GoDaddy enquanto subdominios da Vercel ficavam pendentes
- Regra registrada:
  - apex nao pode misturar GoDaddy com Vercel
  - `www/app/admin` podem demorar alguns minutos apos o apex entrar em `Generating SSL Certificate`
  - so considerar a migracao saudavel quando o apex parar de responder GoDaddy e o SSL propagar para os hosts restantes
- Esse incidente foi registrado em `docs/LEARNINGS.md` e reforcado em `docs/DOMAIN_MIGRATION.md`

2026-03-18 - Fase 25 implementada localmente
- Criado o helper `src/lib/session-security.ts`
- Criado o componente `src/components/session-activity-tracker.tsx`
- Criadas as rotas:
  - `src/app/api/session/touch/route.ts`
  - `src/app/api/session/logout/route.ts`
  - `src/app/api/session/reauth/route.ts`
  - `src/app/api/admin/session/touch/route.ts`
  - `src/app/api/admin/reauth/route.ts`
- Criadas as paginas:
  - `src/app/reauth/page.tsx`
  - `src/app/admin/reauth/page.tsx`
- App protegido por timeout e refresh de atividade em:
  - `src/lib/supabase/middleware.ts`
  - `src/app/page.tsx`
  - `src/app/(dashboard)/layout.tsx`
- Financeiro passou a exigir reautenticacao recente em:
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/contratos/[id]/route.ts`
  - `src/app/api/financeiro/parcelas/[id]/route.ts`
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/(dashboard)/financeiro/page.tsx`
  - `src/components/contrato-lead.tsx`
- Admin passou a exigir reautenticacao recente em:
  - `src/lib/admin-auth.ts`
  - `src/app/api/admin/auth/route.ts`
  - `src/app/api/admin/tenants/route.ts`
  - `src/app/api/admin/tenants/[id]/route.ts`
  - `src/app/api/admin/tenants/[id]/metricas/route.ts`
  - `src/app/admin/page.tsx`
  - `src/app/admin/[id]/page.tsx`
- `npm run build` executado com sucesso apos as alteracoes

2026-03-18 - Fix de reautenticacao da Fase 25
- Validacao manual no deploy revelou que a API admin aceitava acesso sem cookie recente de reauth quando o cookie estava ausente
- Causa: helper tratava timestamp ausente como "nao expirado"
- Correcao aplicada em:
  - `src/lib/session-security.ts`
  - `src/lib/admin-auth.ts`
- Regra final: cookie ausente de reauth agora invalida o acesso sensivel, como esperado
- `npm run build` executado novamente com sucesso apos o fix

2026-03-18 - Alinhamento Twilio Sandbox
- O codigo ja possui fluxo completo para receber mensagens inbound do WhatsApp e exibi-las no app
- Rotas principais confirmadas:
  - `src/app/api/webhooks/twilio/route.ts`
  - `src/app/api/webhooks/twilio/status/route.ts`
  - `src/app/api/conversas/route.ts`
  - `src/app/api/conversas/[id]/route.ts`
  - `src/components/modal-msg-lead.tsx`
- Foi identificado desalinhamento entre o sender do sandbox no painel Twilio e o `.env.local`
- Ajuste aplicado:
  - `.env.local` agora usa `TWILIO_WHATSAPP_NUMBER=\"whatsapp:+14155238886\"`
- Proximo checklist operacional:
  - confirmar no Twilio Sandbox o webhook `When a message comes in`
  - confirmar o `Status callback`
  - garantir que o numero de teste enviou o `join <codigo>` para o sandbox

2026-03-18 - Fix no cadastro manual de lead
- Erro reproduzido novamente no modal `Novo lead`
- Causa confirmada: a tabela `leads` ainda exige `nb` obrigatorio e unico
- Correcao aplicada em `src/app/api/leads/route.ts`
- Novo comportamento:
  - se `nb` vier preenchido, usa o valor informado
  - se `nb` vier vazio, gera `MANUAL-<telefone|cpf|timestamp>`
- Objetivo: permitir lead de teste/manual sem quebrar o modelo legado

2026-03-18 - Estabilizacao do build/deploy Next na Vercel
- Problema observado apos deploy em producao:
  - hosts publicos com alias correto, mas rotas do app retornando `404`
  - `lp.html` respondendo `200`, sugerindo artefato parcial/errado
- Causas encontradas e corrigidas:
  - existia uma arvore `app/` vazia na raiz competindo com `src/app`
  - existia um `next.config.js` residual competindo com `next.config.ts`
  - modulos com client Supabase admin criados no escopo de arquivo quebravam o build em `Collecting page data`
  - `/reauth` e `/admin/reauth` usavam `useSearchParams` sem `Suspense`
  - `/login` e `Sidebar` criavam `createBrowserClient` no corpo do componente
- Correcoes aplicadas:
  - remocao da arvore `app/` vazia na raiz
  - remocao de `next.config.js`
  - criacao de `src/lib/session-config.ts` para separar constantes compartilhadas da parte server-only
  - lazy init dos clients Supabase em handlers/requests
  - wrappers `Suspense` nas paginas de reauth
  - `next.config.ts` agora fixa `turbopack.root` com `process.cwd()`
- Validacao final:
  - `npm run build` voltou a passar com manifesto completo de rotas do app

2026-03-19 - Reset de senha do tenant direto no admin
- Criada a rota `src/app/api/admin/tenants/[id]/reset-senha/route.ts`
- Fluxo protegido por `verificarAdminAuth()` e `verificarAdminReauthRecente()`
- A rota busca o email do responsavel no tenant e chama `auth.admin.generateLink({ type: 'recovery' })`
- O modal de edicao em `src/app/admin/page.tsx` agora exibe uma secao dedicada para enviar o reset quando `editId` estiver presente
- Feedback visual de sucesso/erro incluido no proprio modal

2026-03-19 - Fluxo de recriacao de acesso do responsavel
- Criada a rota `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts`
- O fluxo remove usuarios auth antigos associados ao email do responsavel, limpa convites pendentes e gera um novo link de aceite
- `src/app/api/usuarios/aceitar-convite/route.ts` agora reaproveita o registro existente em `usuarios` quando o email ja existir, atualizando `auth_id` em vez de falhar por conflito
- O modal de edicao do tenant ganhou a acao `Gerar acesso do responsavel` com link copiavel
- Objetivo: permitir recriar o acesso sem perder o historico do usuario na tabela `usuarios`

2026-03-19 - Operacao aplicada em producao para Alexandrini
- Tenant `Alexandrini Advogados` (`ad01e4ec-509b-4bf0-976e-c17bc2e53373`) estava com `responsavel_email = fbcfarias@icloud.com`
- Com base no `MASTER.md` e nos scripts legados, o email correto da Jessica foi ajustado para `jessica@alexandrini.com.br`
- Depois do deploy do commit `9630154f`, a rota de `recriar-acesso` foi executada em producao para esse tenant
- Resultado:
  - `responsavel_email` atualizado para `jessica@alexandrini.com.br`
  - novo convite gerado para a Jessica
  - URL emitida: `https://prevlegal.vercel.app/auth/aceitar-convite?token=d87e828911ca82a53551aedfdb173bd82b3bbcb8395d2f02cbcecec5cc7539a5`
  - expiracao do convite: `2026-03-26T11:43:12.919293+00:00`

2026-03-19 - Fluxo final de senha do responsavel
- `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` agora provisiona a conta do responsavel em `auth.users`, sincroniza `public.usuarios` e dispara email real de definicao de senha
- `src/app/api/admin/tenants/[id]/reset-senha/route.ts` passou a usar `resetPasswordForEmail` em vez de `generateLink`
- Criada a tela `src/app/auth/redefinir-senha/page.tsx` para concluir a troca de senha dentro do produto
- Objetivo: permitir primeiro acesso e redefinicao sem depender do convite customizado para o responsavel principal

2026-03-19 - Correcao do bloqueio Jessica / `tenant_id`
- O fluxo de reprovisionamento da Jessica falhou em producao porque `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` ainda selecionava `usuarios.tenant_id`
- `src/app/api/usuarios/aceitar-convite/route.ts` tambem ainda carregava e persistia `tenant_id`, embora a tabela `usuarios` atual nao tenha essa coluna
- Correcao aplicada: ambos os fluxos agora sincronizam apenas por `email`, `auth_id`, `role`, `ativo` e metadados de convite
- Objetivo imediato desta sessao: publicar essa correcao, reprovisionar `jessica@alexandrini.com.br` e validar o envio real do email de definicao de senha

2026-03-19 - Trigger do Supabase no reprovisionamento
- O erro `Database error creating new user` veio do trigger `public.handle_new_user()`, que insere automaticamente em `public.usuarios` quando nasce um registro em `auth.users`
- Se o usuario logico ja existe em `public.usuarios`, criar direto com o email final colide no `UNIQUE(email)` antes da sincronizacao customizada
- Correcao aplicada em `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` e `src/app/api/usuarios/aceitar-convite/route.ts`:
  - cria com email tecnico temporario
  - remove a linha automatica criada pelo trigger
  - atualiza o usuario Auth para o email real
  - reaproveita a linha existente de `public.usuarios`

2026-03-19 - Operacao real Jessica concluida
- Commit publicado: `7e741e46` (`fix: reuse existing usuarios rows during reprovisioning`)
- Deploy de producao publicado em `https://prevlegal-cxf4a3kyt-fluxrow.vercel.app` e alias em `https://app.prevlegal.com.br`
- Fluxo administrativo executado com sucesso em producao:
  - tenant `Alexandrini Advogados`
  - `responsavel_email`: `jessica@alexandrini.com.br`
  - resposta do endpoint `POST /api/admin/tenants/ad01e4ec-509b-4bf0-976e-c17bc2e53373/recriar-acesso`:
    - `{"ok":true,"email":"jessica@alexandrini.com.br","mensagem":"Conta provisionada e email de definicao de senha enviado para jessica@alexandrini.com.br"}`
- Leitura operacional confirmada: para primeiro acesso do responsavel, usar `Gerar acesso do responsavel`; o botao `Resetar senha` fica como etapa posterior, apos a conta ja existir/estar ativada no fluxo do produto

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
- `src/lib/session-security.ts`
- `src/components/session-activity-tracker.tsx`
- `src/app/api/session/touch/route.ts`
- `src/app/api/session/logout/route.ts`
- `src/app/api/session/reauth/route.ts`
- `src/app/api/admin/session/touch/route.ts`
- `src/app/api/admin/reauth/route.ts`
- `src/app/reauth/page.tsx`
- `src/app/admin/reauth/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/page.tsx`
- `src/lib/supabase/middleware.ts`
- `src/lib/admin-auth.ts`
- `src/app/api/admin/auth/route.ts`
- `src/app/api/admin/tenants/route.ts`
- `src/app/api/admin/tenants/[id]/route.ts`
- `src/app/api/admin/tenants/[id]/metricas/route.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/[id]/page.tsx`
- `src/components/dashboard-onboarding-tour.tsx`
- `src/components/agendamentos-onboarding-tour.tsx`
- `src/components/listas-onboarding-tour.tsx`
- `src/components/campanhas-onboarding-tour.tsx`
- `src/components/relatorios-onboarding-tour.tsx`
- `src/components/lead-detalhe-onboarding-tour.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/agendamentos/page.tsx`
- `src/app/(dashboard)/listas/page.tsx`
- `src/app/(dashboard)/campanhas/page.tsx`
- `src/app/(dashboard)/relatorios/page.tsx`
- `src/components/onboarding-reset-section.tsx`

## Proximos Passos

- validar em runtime os fluxos:
  - timeout automatico da plataforma
  - timeout automatico do admin
  - reautenticacao do financeiro
  - reautenticacao do admin
- decidir se a Fase 25 sera commitada e publicada agora
- continuar acompanhamento do SSL final de `www`, `app` e `admin` na Vercel
- continuar atualizando este arquivo a cada bloco de trabalho concluido

## Regra Permanente de Continuidade

- toda sessao deve atualizar `docs/CODEX_HANDOFF.md`
- toda sessao deve atualizar `docs/ROADMAP.md` se mudar fase, prioridade ou status
- toda sessao deve atualizar `docs/LEARNINGS.md` se surgir regra tecnica, de produto ou compatibilidade
- toda sessao deve revisar `docs/SESSION_BRIEF.md` para manter o proximo passo claro
- toda sessao deve preservar links cruzados entre `INDEX`, `MASTER`, `ROADMAP`, `LEARNINGS`, `SESSION_BRIEF` e `CODEX_HANDOFF`
- ao final, deve rodar `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`
- no inicio da proxima sessao, deve rodar `scripts/resume-context.sh`
