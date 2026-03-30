# PrevLegal - Handoff de Trabalho

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

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

Data da ultima revisao: 2026-03-27

- Repositorio local em `main`
- Banco operacional alvo confirmado: `lrqvvxmgimjlghpwavdb`
- Projeto central preservado: `zjelgobexwhhfoisuilm`
- Existe um conjunto local de fechamento da migracao de dominio e alinhamento de URLs ainda a ser commitado nesta sessao
- O projeto esta vinculado a Vercel pelo arquivo `.vercel/project.json`
- `npm run build` executado com sucesso apos o fechamento da Fase 5 da migracao de dominio
- `README.md` e docs de sessao continuam sendo a base de memoria do projeto

Estado de producao hoje:
- `https://www.prevlegal.com.br` -> LP/site
- `https://prevlegal.com.br` -> redirect para `www`
- `https://app.prevlegal.com.br` -> plataforma
- `https://admin.prevlegal.com.br` -> admin
- `https://prevlegal.vercel.app` -> fallback tecnico

## Incidente Atual Prioritario

2026-03-19 - Fase 26 / isolamento entre escritorios

- Incidente P0 confirmado: usuarios de escritorios diferentes conseguiram ver dados uns dos outros
- Superficies reportadas com vazamento:
  - leads
  - listas
  - conversas / inbox / portal
  - financeiro
  - configuracoes
- Contencao temporaria publicada em producao:
- Contencao temporaria publicada em producao:
  - allowlist por email
  - usuarios fora da allowlist sao redirecionados para `/isolamento-em-andamento`
  - APIs autenticadas do app retornam `423`
- Contencao reforcada no admin:
  - rotas de onboarding do responsavel agora bloqueiam emails fora da allowlist com `423`
  - isso impede expandir o rollout multi-escritorio enquanto a Fase 26 nao fecha
- Contencao reforcada no app:
  - allowlist final reduzida ao tenant piloto da Jessica
  - `fbcfarias@icloud.com` e `fbcfarias@gmail.com` saem da allowlist do app
  - operacao do sistema admin continua no subdominio `admin`
- Arquivos da contencao:
  - `src/lib/tenant-containment.ts`
  - `src/lib/supabase/middleware.ts`
  - `src/app/isolamento-em-andamento/page.tsx`
  - `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts`
  - `src/app/api/admin/tenants/[id]/link-acesso/route.ts`
  - `src/app/api/admin/tenants/[id]/reset-senha/route.ts`
- Auditoria formal criada em:
  - `docs/TENANT_ISOLATION_AUDIT.md`
  - `docs/TENANT_ISOLATION_TASKS.md`
- Foundation migration criada:
  - `supabase/migrations/031_tenant_isolation_foundation.sql`
- Conclusao da auditoria ate aqui:
  - o schema operacional nasceu para `um banco por tenant`
  - o ambiente atual compartilha o banco entre escritorios
  - tabelas operacionais principais ainda nao tem `tenant_id`
  - varias APIs e policies continuam globais
  - a leitura real do banco mostrou que os dados operacionais existentes ainda pertencem ao legado Alexandrini
  - o tenant `Fluxrow` existe cadastrado, mas ainda nao tem isolamento operacional real
- Endurecimento temporario adicional aplicado no app:
  - helper `src/lib/tenant-context.ts`
  - rotas e paginas principais agora exigem auth e usam ownership por usuario como ancora temporaria
  - nao-admin fica limitado aos proprios leads e derivados em varias superficies do app
  - admins do tenant piloto continuam vendo a base legado atual
  - build validado com sucesso apos essa onda
  - isso reduz superficie de vazamento, mas nao substitui `tenant_id` + backfill + RLS

Proximo passo recomendado:
- decisao de execucao atual mais coerente:
  - descartar o legado piloto
  - aplicar a migration 031
  - executar reset operacional limpo
  - recadastrar o primeiro escritorio real do zero
- referencias criadas:
  - `docs/TENANT_RESET_PLAN.md`
  - `supabase/reset/operational_reset_after_031.sql`
  - `supabase/reset/combined_apply_031_and_reset.sql`
- execucao confirmada no banco operacional:
  - `031` aplicada
  - reset operacional concluido
  - tabelas centrais de operacao zeradas
- contagens confirmadas:
  - `tenants = 0`
  - `usuarios = 0`
  - `listas = 0`
  - `leads = 0`
  - `conversas = 0`
  - `mensagens_inbound = 0`
  - `portal_mensagens = 0`
  - `configuracoes = 0`
  - `contratos = 0`
  - `parcelas = 0`
- bootstrap tenant-aware iniciado no codigo:
  - `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` grava `usuarios.tenant_id`
  - `src/app/api/usuarios/convidar/route.ts` grava `convites.tenant_id`
  - `src/app/api/usuarios/aceitar-convite/route.ts` grava `usuarios.tenant_id`
  - `src/app/api/import/route.ts` grava `listas.tenant_id` e `leads.tenant_id`
  - `src/app/api/leads/route.ts` grava `tenant_id` e cria lista manual por tenant
  - contencao agora permite bootstrap do primeiro tenant fora da allowlist apenas enquanto `usuarios = 0`
- correcao aplicada no admin para cadastro do primeiro escritorio:
  - `src/app/api/admin/tenants/route.ts` agora normaliza payload e gera `slug` automaticamente quando vazio
  - `src/app/api/admin/tenants/[id]/route.ts` agora normaliza update e evita colisao silenciosa de `slug`
  - `src/app/admin/page.tsx` agora mostra erro real de salvamento no modal
  - `src/lib/supabase/middleware.ts` agora trata `/api/admin/*` como superficie admin autenticada por `admin_token`, sem desviar essas rotas para `/login` do app
  - `src/lib/supabase/middleware.ts` agora tambem deixa `/api/admin/reauth` publico, evitando que a reautenticacao do admin seja desviada para o `/login` do app
  - `src/lib/tenant-containment.ts` agora permite onboarding/controlos do unico tenant operacional existente, mesmo apos o primeiro usuario ter sido criado
  - `src/app/auth/redefinir-senha/page.tsx` agora aceita links de redefinicao com `token_hash` e `code`, alem de sessao ja estabelecida
  - `src/app/admin/page.tsx` agora gera/copía automaticamente o link manual de contingencia logo apos `Enviar acesso do responsavel` responder sucesso
  - `src/app/admin/page.tsx` agora tambem gera/copía automaticamente o link manual de contingencia logo apos `Enviar reset de senha`
  - `src/app/api/usuarios/reset-manual/route.ts` cria um caminho de reset manual via token proprio + `service_role`, sem depender da sessao recovery do Supabase
  - `src/app/auth/redefinir-senha/page.tsx` agora suporta esse token manual de reset, alem dos formatos nativos do Supabase
- validacao operacional concluida:
  - primeiro escritorio de teste foi criado com sucesso no admin apos o reset limpo
  - escritorio usado no teste: `Fluxrow`
  - email do responsavel usado no teste: `fbcfarias@icloud.com`
  - observacao de modelagem: para operacao real, e melhor manter conta `master admin` separada da conta de usuario do escritorio
- depois substituir o escopo temporario por usuario por `tenant_id` canonico
- revisar RLS com tenant isolation real

2026-03-19 - Reset limpo executado no banco operacional
- O caminho correto foi confirmado como SQL direto no operacional `lrqvvxmgimjlghpwavdb`
- O projeto central `zjelgobexwhhfoisuilm` nao foi tocado
- Motivo para NAO usar `supabase db push` nesta etapa:
  - o CLI estava linkado ao projeto central por engano
  - o banco remoto nao tem historico local de migrations confiavel para esse fluxo
- Arquivo executado:
  - `supabase/reset/combined_apply_031_and_reset.sql`
- O pacote aplicou:
  - foundation `031_tenant_isolation_foundation`
  - reset operacional limpo
- Validacao final confirmada no operacional:
  - `tenants = 0`
  - `usuarios = 0`
  - `listas = 0`
  - `leads = 0`
  - `conversas = 0`
  - `mensagens_inbound = 0`
  - `portal_mensagens = 0`
  - `configuracoes = 0`
  - `contratos = 0`
  - `parcelas = 0`
- Observacoes importantes:
  - legado piloto `Alexandrini/Jessica` foi tratado como descartavel, sem backfill
  - `auth.users` nao foi limpo nesta etapa
  - nao houve mudanca de dominio, Vercel ou Google nesta execucao
  - nenhuma alteracao de codigo de app foi feita nesta etapa; foco total em operacao + documentacao

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

2026-03-30 - Saude do tenant no admin com metricas tenant-aware

- Objetivo:
  - transformar o detalhe do tenant em leitura executiva real, sem misturar contagens globais do piloto
- Arquivos principais:
  - `src/app/api/admin/tenants/[id]/metricas/route.ts`
  - `src/app/admin/[id]/page.tsx`
- Correcoes aplicadas no backend:
  - contagens e consultas passaram a filtrar por `tenant_id`
  - foram adicionados sinais operacionais novos:
    - `ultimoAcessoEquipe`
    - `usuariosAtivos7d`
    - `conversas7d`
    - `agendamentosPendentes`
    - `riscoOperacional`
    - `resumoSaude`
- Correcoes aplicadas no frontend:
  - nova secao `Saúde do tenant`
  - badge de risco operacional
  - cards executivos com atividade recente, equipe ativa e carga pendente
  - `Resumo operacional` e `Saúde da conta` passaram a refletir os novos sinais
- Validacao:
  - `npm run build` passou
- Proximo passo recomendado:
  - levar essa mesma leitura tenant-aware para previsibilidade financeira e churn

2026-03-30 - Financeiro preditivo tenant-aware

- Objetivo:
  - transformar o financeiro de leitura historica para leitura operacional de curto prazo
  - endurecer as rotas sensiveis de contratos e parcelas com recorte tenant-aware
- Arquivos principais:
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/contratos/[id]/route.ts`
  - `src/app/api/financeiro/parcelas/[id]/route.ts`
  - `src/app/(dashboard)/financeiro/page.tsx`
- Correcoes de backend:
  - escopo de leitura financeira passou a nascer dos leads visiveis do tenant atual
  - resumo financeiro agora calcula:
    - `previsto7d`
    - `previsto30d`
    - `recebivelAberto`
    - `ticketMedioContrato`
    - `proximasParcelas`
    - `riscoFinanceiro`
    - `resumoCarteira`
  - update/delete de contrato e update de parcela agora validam se o recurso pertence a um lead do tenant atual
- Correcoes de frontend:
  - nova secao `Previsão de caixa`
  - cards de recebimento curto prazo e carteira
  - badge de risco financeiro
  - lista de proximos recebimentos no proprio dashboard
- Validacao:
  - `npm run build` passou
- Proximo passo recomendado:
  - ligar previsao financeira com origem comercial (campanha, inbox, agendamento) para leitura de pipeline ponta a ponta

2026-03-30 - Origem comercial da carteira no financeiro

- Objetivo:
  - mostrar de onde os contratos estao vindo e quanto da carteira ja passou por agendamento
- Arquivos principais:
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/(dashboard)/financeiro/page.tsx`
- Correcoes aplicadas:
  - o resumo financeiro agora agrega a carteira por origem comercial do lead:
    - `campanha`
    - `lista`
    - `manual`
  - tambem calcula sinais de pipeline dentro da carteira:
    - contratos via campanha
    - contratos sem campanha
    - contratos com agendamento
    - contratos com agendamento realizado
    - valor contratado vindo de campanha
    - valor contratado via operacao direta
  - o frontend ganhou a secao `Origem comercial da carteira`
- Validacao:
  - `npm run build` passou
- Proximo passo recomendado:
  - consolidar uma leitura unica de pipeline entre origem comercial, conversa humana, agendamento e contrato

2026-03-27 - Foundation de providers para WhatsApp

- Objetivo:
  - preparar o produto para `Twilio + Z-API + multiplos numeros por tenant`
  - sem quebrar o runtime atual que ainda depende do modelo Twilio unico por tenant/env
- Arquivos principais:
  - `src/lib/whatsapp-provider.ts`
  - `src/app/api/conversas/[id]/responder/route.ts`
  - `src/app/api/leads/[id]/iniciar-conversa/route.ts`
  - `src/app/api/agente/responder/route.ts`
  - `src/app/api/campanhas/[id]/disparar/route.ts`
  - `supabase/migrations/032_whatsapp_provider_foundation.sql`
- Decisao de arquitetura:
  - o envio outbound deixa de depender conceitualmente de um helper Twilio unico
  - `whatsapp-provider.ts` tenta resolver um numero ativo em `whatsapp_numbers`
  - se a tabela nao existir ou nao houver configuracao, o app faz fallback para `getTwilioCredentialsByTenantId`
- Cobertura ja conectada na camada nova:
  - resposta manual em conversa
  - `Iniciar conversa` no lead
  - resposta automatica do agente
  - disparo de campanhas
- Migration 032 preparada para:
  - criar `whatsapp_numbers`
  - registrar `provider = twilio | zapi`
  - suportar multiplos numeros por tenant
  - introduzir `whatsapp_number_id` opcional em conversas, mensagens inbound, notificacoes e campanhas
- Validacao:
  - `npm run build` passou apos a integracao
- Observacao operacional:
  - o erro atual visto no Twilio sandbox (`could not find a Channel with the specified From address`) e de configuracao do sender/canal, nao de fluxo da aplicacao
- Proximo passo recomendado:
  - migration `032` aplicada com sucesso no operacional `lrqvvxmgimjlghpwavdb`
  - tabela `whatsapp_numbers` criada no banco operacional
  - tenant `Fluxrow` sincronizado com credenciais Twilio atuais e canal default:
    - `provider = twilio`
    - `label = Twilio Sandbox`
    - `phone/twilio_whatsapp_number = whatsapp:+14155238886`
  - contagem atual no operacional:
    - `whatsapp_numbers = 1`
    - `twilio_channels = 1`
    - `zapi_channels = 0`
  - proximo passo recomendado:
    - retestar envio manual e `Iniciar conversa` no app publicado
    - validar inbound/status com o tenant `Fluxrow`
    - criar UI/admin para cadastro de numeros por tenant
    - conectar Z-API como primeiro provider alternativo para campanha e operacao humana

2026-03-27 - Admin de canais WhatsApp por tenant

- Superficie nova:
  - `src/app/admin/[id]/page.tsx` agora inclui a secao `Canais WhatsApp`
- Rotas novas:
  - `src/app/api/admin/tenants/[id]/whatsapp-numbers/route.ts`
  - `src/app/api/admin/tenants/[id]/whatsapp-numbers/[numberId]/route.ts`
- Capacidades entregues:
  - listar canais por tenant
  - cadastrar canal `Twilio`
  - cadastrar canal `Z-API`
  - editar credenciais
  - marcar canal padrao
  - ativar/pausar
  - excluir
- Decisao importante:
  - a UI administra `whatsapp_numbers`, mas o runtime legado ainda consulta `tenants.twilio_*` em alguns pontos
  - por isso, o backend do admin sincroniza automaticamente o canal `Twilio` padrao com os campos legado do tenant
- Validacao:
  - `npm run build` passou apos adicionar a UI e as rotas
- Proximo passo recomendado:
  - usar essa nova UI para cadastrar o primeiro canal `Z-API`
  - depois ligar a escolha de origem por campanha e por conversa humana

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

2026-03-19 - Fechamento da Fase 5 da migracao de dominio
- O projeto `prevlegal-site` passou a servir a LP publica em `https://www.prevlegal.com.br`
- O apex `https://prevlegal.com.br` passou a redirecionar para `https://www.prevlegal.com.br/`
- O projeto `prevlegal` ficou responsavel apenas por:
  - `https://app.prevlegal.com.br`
  - `https://admin.prevlegal.com.br`
  - `https://prevlegal.vercel.app`
- Ajustes de codigo aplicados para refletir os domínios canônicos:
  - `site/robots.txt`
  - `site/sitemap.xml`
  - `src/app/layout.tsx`
  - `src/app/robots.ts`
  - `src/app/sitemap.ts`
  - `src/app/admin/[id]/page.tsx`
  - `src/app/api/admin/tenants/[id]/reset-senha/route.ts`
  - `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts`
  - `src/app/api/portal/link/[leadId]/route.ts`
  - `src/app/api/usuarios/convidar/route.ts`
  - `src/app/api/google/callback/route.ts`
  - `public/demo.html`
  - `.env.example`
- Env alinhadas na Vercel:
  - `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br` (`Production` e `Development`)
  - `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br` (`Production` e `Development`)
  - `GOOGLE_REDIRECT_URI=https://app.prevlegal.com.br/api/google/callback` (`Production`)
- Observacao importante:
  - a CLI da Vercel exigiu branch especifica para `Preview`, entao o corte final de env foi fechado em `Production` e `Development`
- Validacoes HTTP confirmadas:
  - `https://www.prevlegal.com.br` -> `200`
  - `https://prevlegal.com.br` -> `307`
  - `https://app.prevlegal.com.br/login` -> `200`
  - `https://admin.prevlegal.com.br/admin/login` -> `200`

2026-03-19 - Contingencia para primeiro acesso do responsavel
- Incidente reproduzido: email de acesso chegou, mas o clique abriu `http://localhost:3000/#error=access_denied...`
- Causa comprovada via `auth.admin.generateLink({ type: 'recovery' })`:
  - `redirect_to` observado no Supabase = `http://localhost:3000`
  - ou seja, o problema esta na configuracao do Supabase Auth, nao na rota do app
- Contingencia segura implementada sem mexer no fluxo principal:
  - nova rota `src/app/api/admin/tenants/[id]/link-acesso/route.ts`
  - nova pagina `src/app/auth/confirm/page.tsx`
  - modal admin ganhou botao `Copiar link manual`
- Objetivo do fallback:
  - gerar um link direto em `https://app.prevlegal.com.br/auth/confirm?...`
  - permitir onboarding do responsavel mesmo se o email do Supabase continuar vindo com host errado
- Correcao externa ainda pendente:
  - alinhar `Site URL` / `Redirect URLs` do Supabase Auth para `app.prevlegal.com.br`

2026-03-19 - Incidente critico de isolamento de dados entre escritorios
- Depois de criar um novo escritorio e concluir o onboarding do responsavel, o usuario do novo escritorio conseguiu ver dados da Jessica
- Superficies reportadas como vazando dados:
  - leads
  - caixa de entrada / conversas do portal
  - listas
  - financeiro
  - configuracoes
- Superficie reportada como aparentemente correta:
  - perfil mostrou apenas os dados do proprio usuario
- Diagnostico tecnico atual:
  - o modelo de negocio do banco operacional ainda se comporta como single-tenant
  - tabelas principais nao tem `tenant_id` funcional nem filtros por escritorio
  - varias APIs usam `service_role` ou consultas sem escopo de tenant
- Severidade:
  - P0 / LGPD / sigilo entre escritorios
- Regra operacional imediata:
  - nao onboardar novos escritorios reais no mesmo ambiente operacional ate existir isolamento de dados
- Proximo trabalho necessario:
  - auditoria completa das superficies vazando dados
  - estrategia de tenant isolation
  - contencao imediata antes de qualquer rollout multi-escritorio

2026-03-19 - Google OAuth ainda pendente apos mudanca de dominio
- Ao conectar Google Calendar, a tela exibiu erro `400 invalid_request`
- Isso precisa ser corrigido no Google Cloud Console com navegador autenticado
- Alinhamento esperado:
  - origem e redirect URI do OAuth Client apontando para `app.prevlegal.com.br`
  - callback do app permanece em `src/app/api/google/callback/route.ts`

2026-03-26 - Ajuste de fluxo para validacao do Google Calendar em agendamentos
- O callback de `src/app/api/google/callback/route.ts` passou a redirecionar para `/agendamentos?google=conectado|erro`
- `src/lib/google-calendar.ts` passou a sanitizar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` com `trim()`
- `npm run build` validado com sucesso apos o ajuste
- O principal bloqueio restante para `redirect_uri_mismatch` continua sendo o Google Cloud Console:
  - `Authorized redirect URI` deve conter exatamente `https://app.prevlegal.com.br/api/google/callback`
  - `Authorized JavaScript origin` deve conter `https://app.prevlegal.com.br`

2026-03-26 - Paginas publicas de privacidade e termos criadas para o site
- Criadas as paginas estaticas do projeto `site/`:
  - `site/privacidade/index.html`
  - `site/termos/index.html`
- Criados espelhos tecnicos no projeto principal:
  - `public/privacidade/index.html`
  - `public/termos/index.html`
- O footer da LP foi atualizado para apontar para:
  - `/privacidade`
  - `/termos`
- O sitemap estatico do site agora inclui:
  - `https://www.prevlegal.com.br/privacidade`
  - `https://www.prevlegal.com.br/termos`
- Objetivo operacional:
  - destravar homepage/privacy/terms no Google Auth Platform para publicar o consent screen em producao

2026-03-19 - Estruturacao inicial da Fase 26
- Criado o quadro de tasks em `docs/TENANT_ISOLATION_TASKS.md`
- A fase foi dividida em:
  - contencao
  - auditoria de schema
  - auditoria de APIs/superficies
  - modelo de tenancy
  - implementacao
- A frente de Google OAuth foi explicitamente separada da correcao de isolamento LGPD

2026-03-19 - Contencao temporaria da Fase 26
- Contencao aplicada no middleware para impedir uso do app por escritorios fora da allowlist temporaria
- Arquivos principais:
  - `src/lib/tenant-containment.ts`
  - `src/lib/supabase/middleware.ts`
  - `src/app/isolamento-em-andamento/page.tsx`
- Env adicionada:
  - `TENANT_CONTAINMENT_ALLOWED_EMAILS`
- Valores alinhados em `Production` e `Development`:
  - `jessica@alexandrini.adv.br`
  - `fbcfarias@icloud.com`
  - `fbcfarias@gmail.com`
- Comportamento:
  - usuarios autenticados fora da allowlist sao redirecionados para `/isolamento-em-andamento`
  - APIs autenticadas do app retornam `423`
  - excecoes publicas preservadas para nao quebrar admin auth, convites, webhooks e portal publico
- `src/app/api/usuarios/aceitar-convite/route.ts` agora reaproveita o registro existente em `usuarios` quando o email ja existir, atualizando `auth_id` em vez de falhar por conflito
- O modal de edicao do tenant ganhou a acao `Gerar acesso do responsavel` com link copiavel
- Objetivo: permitir recriar o acesso sem perder o historico do usuario na tabela `usuarios`

2026-03-19 - Operacao aplicada em producao para Alexandrini
- Tenant `Alexandrini Advogados` (`ad01e4ec-509b-4bf0-976e-c17bc2e53373`) estava com `responsavel_email = fbcfarias@icloud.com`
- Com base no `MASTER.md` e nos scripts legados, o email da Jessica foi inicialmente ajustado para `jessica@alexandrini.com.br`
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
- Objetivo imediato desta sessao: publicar essa correcao, reprovisionar o responsavel e validar o envio real do email de definicao de senha

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

2026-03-19 - Blindagem contra convite antigo do responsavel
- `src/app/api/usuarios/convite/route.ts` agora invalida token de convite quando o email ja possui `auth_id` ativo em `usuarios`
- `src/app/auth/aceitar-convite/page.tsx` passou a exibir estado `obsoleto`, orientando o uso do email mais recente de definicao de senha
- `src/app/admin/page.tsx` removeu a exibicao/copia de URL para o fluxo do responsavel e reforcou a instrucao para ignorar convites antigos

2026-03-19 - Correcao do dominio de email da Jessica
- O email `jessica@alexandrini.com.br` estava errado para recebimento real de mensagens
- Verificacao de DNS mostrou `MX 0 .` em `alexandrini.com.br`, ou seja, esse dominio nao recebe email
- O dominio funcional de email do escritorio e `alexandrini.adv.br`
- O tenant `Alexandrini Advogados` foi atualizado em producao para `jessica@alexandrini.adv.br`
- O endpoint `POST /api/admin/tenants/ad01e4ec-509b-4bf0-976e-c17bc2e53373/recriar-acesso` foi executado novamente com sucesso:
  - `{"ok":true,"email":"jessica@alexandrini.adv.br","mensagem":"Conta provisionada e email de definicao de senha enviado para jessica@alexandrini.adv.br"}`

2026-03-19 - LP alinhada com dominio canonico
- `public/lp.html` passou a apontar todos os CTAs de acesso para `https://app.prevlegal.com.br/login`
- Nao havia links relativos para `/login` nem outras ocorrencias restantes de `https://prevlegal.vercel.app` nesse arquivo

2026-03-19 - Estrutura `site/` preparada para projeto separado da LP
- Criada a pasta `site/` para servir a LP publica em um projeto Vercel proprio
- `site/index.html` replica a LP atual
- `site/demo.html` replica o demo e ja exibe `app.prevlegal.com.br`
- `site/vercel.json` prepara deploy estatico limpo com raiz `/`
- `site/README.md` documenta o deploy recomendado do projeto `prevlegal-site`
- `docs/DOMAIN_MIGRATION.md` foi atualizado com a nova trilha de separacao em dois projetos Vercel

2026-03-19 - Estado atual dos dominios publicos
- `https://app.prevlegal.com.br/login` responde `200`
- `https://admin.prevlegal.com.br/admin/login` responde `200`
- `https://prevlegal.com.br` responde `404 DEPLOYMENT_NOT_FOUND`
- `https://www.prevlegal.com.br` responde `404 DEPLOYMENT_NOT_FOUND`
- Foi criada a checklist `docs/AUTH_BRANDING_TASKS.md` para executar o branding de emails auth depois que o site publico estiver estabilizado

## Arquivos Alterados Nesta Sessao

- `docs/MASTER.md`
- `docs/ROADMAP.md`
- `docs/SESSION_BRIEF.md`
- `docs/CODEX_HANDOFF.md`
- `docs/LEARNINGS.md`
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

- validar novamente a importacao de listas no tenant `Fluxrow` apos os fixes desta sessao
- confirmar que uma lista nao pode mais ser importada duas vezes no mesmo escritorio
- confirmar que os leads passam a ser criados e que a pagina `/listas` mostra os totais reais
- manter a contencao ativa ate o tenant isolation definitivo fechar
- seguir com filtros por `tenant_id`, revisao de `service_role` e RLS por tenant
- continuar atualizando este arquivo a cada bloco de trabalho concluido

## Atualizacao de 2026-03-19 — Importacao de listas

- investigacao confirmou que a lista estava sendo criada, mas os leads nao entravam
- o fluxo antigo aceitava a mesma lista duas vezes no mesmo tenant
- a API `/api/import` engolia erro de batch de insert e terminava “com sucesso” mesmo com `leads = 0`
- a API `/api/listas` retornava os campos crus do banco (`total_com_whatsapp`, `total_sem_whatsapp`, `total_nao_verificado`), enquanto a UI esperava `com_whatsapp`, `sem_whatsapp`, `nao_verificado`
- a rota `/api/whatsapp/verificar` ainda usava a tabela legado `lista_leads` e nomes de coluna antigos em `listas`

### Correcao aplicada

- `src/app/api/import/route.ts`
  - previne duplicidade por `nome` ou `arquivo_original` dentro do mesmo tenant
  - passa a usar `service_role` apenas para persistencia, mantendo auth do usuario para autorizar o fluxo
  - grava `responsavel_id` no lead importado
  - normaliza/trunca campos textuais antes do insert
  - faz fallback row-by-row quando um batch falha
  - expõe erro real quando nenhum lead e inserido e remove a lista vazia criada na tentativa
  - atualiza `total_leads` e `total_nao_verificado` ao final
- `src/app/api/listas/route.ts`
  - filtra por `tenant_id`
  - mapeia os campos reais do banco para os nomes esperados pela UI
- `src/app/api/whatsapp/verificar/route.ts`
  - deixa de depender de `lista_leads`
  - busca leads por `lista_id`
  - atualiza `total_com_whatsapp`, `total_sem_whatsapp` e `total_nao_verificado`
- `src/app/api/google/auth/route.ts`
  - sanitiza envs do OAuth com `trim()`
- `src/app/api/google/callback/route.ts`
  - sanitiza envs do OAuth com `trim()`
- `src/app/api/listas/route.ts`
  - deixa de expor a lista tecnica `Cadastro manual` na listagem padrao
- `src/app/api/listas/[id]/route.ts`
  - novo endpoint para excluir lista importada e seus leads vinculados
- `src/app/(dashboard)/listas/page.tsx`
  - adiciona acao de excluir lista
  - mostra aviso explicando que cadastros manuais ficam agrupados no Kanban de Leads
- `src/app/globals.css`
  - adiciona paletas `dark` e `light`
- `src/app/layout.tsx`
  - inicializa `data-theme` antes da hidratacao
- `src/components/theme-toggle.tsx`
  - novo toggle global de tema com persistencia em `localStorage`
- `src/app/(dashboard)/layout.tsx`
  - exibe o toggle no header do dashboard

### Validacao

- `npm run build` passou apos as correcoes
- em `2026-03-20`, as duas listas orfas de teste do tenant `Fluxrow` (`NOMES RJ BNG.xlsx`, `total_leads = 0`) foram removidas manualmente para liberar a reimportacao limpa
- apos o reteste, a lista `NOMES RJ BNG.xlsx` entrou no tenant `Fluxrow`, mas com diferenca entre `total_ativos = 78` e `total_leads = 55`
- a rota agora devolve `falhas_insercao` e a tela de importacao mostra os warnings/linhas rejeitadas para o proximo reteste, permitindo identificar a causa exata dessas 23 linhas perdidas
- o fluxo do Google Calendar foi endurecido para nao carregar `redirect_uri` com whitespace invisivel
- a tela `/listas` agora funciona como lista de importacoes operacionais, sem misturar o agrupador tecnico `Cadastro manual`
- o dashboard agora suporta modo claro e modo escuro de forma global

## Atualizacao de 2026-03-27 — Google Calendar pos-reset multi-tenant

- o sintoma em runtime era: usuario concluia o OAuth, via toast de sucesso em `/agendamentos` e segundos depois a UI voltava a exibir Google desconectado
- a causa confirmada estava na persistencia de `configuracoes`
  - `src/app/api/google/callback/route.ts` podia tentar criar a primeira linha de `configuracoes` sem `nome_escritorio`
  - o erro de insert nao era tratado antes do redirect de sucesso
  - leitura e escrita de `configuracoes` ainda estavam sem filtro por `tenant_id`
- correcao aplicada:
  - novo helper `src/lib/configuracoes.ts` para buscar/garantir a configuracao atual do tenant
  - `src/app/api/google/callback/route.ts` agora garante a linha de configuracao do tenant e so retorna sucesso se o update do token realmente passar
  - `src/app/api/google/status/route.ts` agora le a configuracao do tenant atual
  - `src/lib/google-calendar.ts` agora usa `tenant_id` para ler e atualizar o token
  - `src/app/api/configuracoes/route.ts` e `src/app/api/agente/config/route.ts` tambem deixaram de tratar `configuracoes` como singleton global
- validacao:
  - `npm run build` passou apos as correcoes
- proximo passo:
  - reconectar o Google em producao
  - confirmar persistencia do estado conectado apos refresh
  - criar um agendamento real e validar `google_event_id`/`meet_link`

## Atualizacao de 2026-03-27 — Atalhos operacionais de contato

- o usuario reportou falta de botoes/atalhos para acelerar contato com o lead em superficies operacionais
- leitura do codigo confirmou que:
  - existia historico/consulta de conversa
  - mas a maioria das telas ainda obrigava navegacao manual ate a `Caixa de Entrada`
  - a busca global de conversa caia apenas em `/caixa-de-entrada`, sem abrir a thread certa
- correcao aplicada:
  - novo helper `src/lib/contact-shortcuts.ts`
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
    - aceita deep-link por `conversaId` e `telefone`
  - `src/app/api/busca/route.ts`
    - conversas agora apontam para a thread correta da inbox
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - adiciona `Abrir conversa` e `Abrir no WhatsApp`
  - `src/components/lead-drawer.tsx`
    - adiciona os mesmos atalhos no drawer
  - `src/components/modal-msg-lead.tsx`
    - footer do WhatsApp vira CTA operacional real, nao apenas instrução
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - adiciona atalhos de contato por lead agendado
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser os novos atalhos
  - revisar se vale adicionar CTA semelhante em campanhas e relatorios de lead qualificado

## Atualizacao de 2026-03-27 — Runtime WhatsApp tenant-aware

- depois dos atalhos, a auditoria do bloco WhatsApp mostrou que o runtime de envio/recebimento ainda misturava schema legado e contexto global
- problemas confirmados:
  - `src/app/api/campanhas/route.ts` e `src/app/api/campanhas/[id]/disparar/route.ts` ainda dependiam de `lista_leads`, `numeros_whatsapp` e de status antigos (`concluida`/`cancelada`)
  - resposta manual e agente automatico ainda podiam resolver Twilio por contexto global ou incompleto
  - webhook inbound/status validava assinatura com token global e ainda gravava/lia entidades sem amarrar o `tenant_id` correto
- correcao aplicada:
  - `src/lib/twilio.ts`
    - novo helper de credenciais por `tenant_id`
    - novo routing por numero WhatsApp do tenant para webhook/status
  - `src/app/api/conversas/[id]/responder/route.ts`
    - resposta manual passa a filtrar conversa por `tenant_id` e grava `mensagens_inbound.tenant_id`
  - `src/app/api/agente/responder/route.ts`
    - configuracao do agente passa a ser lida via helper tenant-aware de `configuracoes`
    - resposta automatica usa credenciais Twilio do tenant do lead
  - `src/app/api/webhooks/twilio/route.ts`
    - resolve tenant a partir do numero `To`
    - grava `tenant_id` em `mensagens_inbound`
    - upsert de `conversas` respeita `tenant_id`
    - notificacoes/gatilhos de escalada passam a nascer no tenant correto
  - `src/app/api/webhooks/twilio/status/route.ts`
    - validacao da assinatura passa a usar o auth token do tenant do numero `From`
  - `src/app/api/campanhas/route.ts`
    - valida `lista_id` dentro do tenant
    - conta leads em `leads.lista_id`
    - grava campanha com `tenant_id`
  - `src/app/api/campanhas/[id]/disparar/route.ts`
    - disparo usa `leads.lista_id`
    - nao depende mais de `numeros_whatsapp`
    - resolve Twilio por `tenant_id`
    - finaliza com `encerrada`
  - `src/app/admin/[id]/page.tsx`
    - status visual do admin passa a tratar `encerrada` como campanha finalizada
- validacao:
  - `npm run build` passou apos o endurecimento
- proximo passo:
  - testar resposta manual em inbox
  - testar automacao do agente em inbound real
  - criar/disparar campanha e observar ciclo completo ate status webhook

## Atualizacao de 2026-03-27 — Iniciar conversa a partir do lead

- o usuario pediu um fluxo ativo no detalhe do lead: nao apenas abrir thread existente, mas permitir que o advogado inicie o contato dali mesmo
- correcao aplicada:
  - novo endpoint `src/app/api/leads/[id]/iniciar-conversa/route.ts`
    - valida acesso ao lead
    - garante/recupera uma `conversa`
    - assume a thread como `humano`
    - envia a primeira mensagem via WhatsApp
    - registra o envio e devolve `conversaId`
  - `src/app/api/leads/[id]/route.ts`
    - passa a devolver a conversa atual do lead quando existir
  - novo componente `src/components/iniciar-conversa-modal.tsx`
    - modal de primeira mensagem
    - apos envio, redireciona para a `Caixa de Entrada` na thread correta
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - adiciona CTA `Iniciar conversa`
    - mostra `Abrir conversa` apenas quando ja existe thread
  - `src/components/lead-drawer.tsx`
    - ganha o mesmo fluxo de `Iniciar conversa`
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar lead sem conversa previa
  - testar lead com conversa previa em modo `agente` para confirmar que o fluxo assume como `humano`

## Atualizacao de 2026-03-27 — Normalizacao de numero no envio WhatsApp

- durante o teste real do fluxo `Iniciar conversa`, o provider devolveu erro de numero invalido porque o lead estava salvo como `(41) 99236-1868`
- correcao aplicada:
  - `src/lib/twilio.ts`
    - `sendWhatsApp` agora normaliza o destinatario para formato E.164 brasileiro antes de chamar o provider
    - isso cobre resposta manual, campanhas e o fluxo novo de iniciar conversa
- validacao:
  - `npm run build` passou
- proximo passo:
  - retestar o envio para numero proprio no sandbox atual

## Atualizacao de 2026-03-29 — Warm-up automatico para numero novo e rascunho Z-API

- o usuario comprou um chip novo para testar `Z-API` e antes de plugar pediu endurecimento anti-block no produto
- leitura do codigo confirmou que o motor de campanhas ja possuia freios reais:
  - `lgpd_optout = false`
  - `apenas_verificados`
  - `limite_diario`
  - `tamanho_lote`
  - `pausa_entre_lotes_s`
  - delay randômico entre mensagens
- problema confirmado:
  - os defaults atuais (`500/dia`, lote `50`, pausa `30s`, delay `1.5s-3.5s`) sao agressivos demais para numero novo em `Z-API`
- correcao aplicada:
  - novo helper `src/lib/whatsapp-warmup.ts`
    - interpreta `metadata.warmup_*` do canal
    - reaplica caps conservadores em criacao e disparo de campanhas
  - `src/lib/whatsapp-provider.ts`
    - `resolveWhatsAppChannel` agora expõe `metadata`
  - `src/app/api/campanhas/route.ts`
    - salva `whatsapp_number_id` na campanha na hora da criacao
    - ja clampa os parametros usando a politica de warm-up do canal default
  - `src/app/api/campanhas/[id]/disparar/route.ts`
    - relê o canal da campanha
    - reaplica caps de warm-up no backend
    - grava `whatsapp_number_id` em `campanha_mensagens`
  - `src/app/(dashboard)/campanhas/page.tsx`
    - ganhou aviso explicando que o backend pode impor caps de warm-up automaticamente
  - `supabase/migrations/033_whatsapp_warmup_and_drafts.sql`
    - relaxa constraints de `whatsapp_numbers` para permitir canal `Twilio`/`Z-API` inativo sem credenciais completas
  - `src/app/api/admin/tenants/[id]/whatsapp-numbers*.ts`
    - passaram a aceitar canal rascunho quando `ativo = false`
  - `src/app/admin/[id]/page.tsx`
    - mostra badge `Warm-up`
    - documenta que canal pausado pode ficar em rascunho enquanto as credenciais nao foram plugadas
- politica conservadora embutida no metadata de warm-up:
  - `limite_diario = 15`
  - `tamanho_lote = 5`
  - `pausa_entre_lotes_s = 600`
  - `delay_min_ms = 60000`
  - `delay_max_ms = 180000`
- operacional:
  - migration `033` aplicada diretamente no operacional `lrqvvxmgimjlghpwavdb`
  - canal rascunho criado para o tenant `Fluxrow`:
    - `id = 95e644e6-5b1b-4add-982a-2e9172ee3798`
    - `label = Z-API Warm-up 41984233554`
    - `phone = +5541984233554`
    - `provider = zapi`
    - `ativo = false`
    - `is_default = false`
    - metadata de warm-up preenchida
- proximo passo:
  - amanha, preencher `instance_id` e `instance_token` no canal rascunho do admin
  - ativar o canal `Z-API`
  - testar envio humano primeiro
  - so depois disparar campanha curta com o warm-up ativo

## Atualizacao de 2026-03-30 — Edicao operacional do lead no detalhe e no drawer

- o usuario reportou uma lacuna operacional: era possivel ver o lead em detalhe e no drawer, mas nao editar os dados diretamente quando novas informacoes chegavam pela conversa
- leitura do codigo confirmou que:
  - `src/app/api/leads/[id]/route.ts` expunha apenas `GET`
  - o detalhe do lead e o drawer nao tinham qualquer CTA de edicao
- correcao aplicada:
  - `src/app/api/leads/[id]/route.ts`
    - ganhou `PATCH`
    - whitelist de campos editaveis
    - validacao basica de `nome` e `status`
    - persistencia direta no lead com `updated_at`
  - novo componente `src/components/editar-lead-modal.tsx`
    - modal compartilhado para editar:
      - contato/CRM
      - beneficio
      - perfil
      - pagamento
      - potencial
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - novo CTA `Editar dados`
    - atualiza a UI local com merge do retorno salvo
  - `src/components/lead-drawer.tsx`
    - novo CTA `Editar dados`
    - reutiliza o mesmo modal compartilhado
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar no browser a edicao pelo detalhe do lead
  - testar no browser a mesma edicao pelo drawer
  - confirmar se vale adicionar historico/audit trail campo-a-campo depois

## Atualizacao de 2026-03-30 — Prioridade de produto fora do bloco WhatsApp

- o usuario pediu uma leitura objetiva do que ainda falta fora do WhatsApp
- consolidacao de prioridade:
  - critico:
    - multi-tenant residual / definitivo
    - provider WhatsApp oficial/real bem governado
  - maior ganho de UX:
    - inbox humana avancada
    - agendamentos operacionais
  - maior ganho executivo:
    - saúde do tenant no admin
    - financeiro preditivo
- plano de 2 semanas registrado no `ROADMAP.md`:
  - semana 1:
    - multi-tenant residual
    - inbox humana avancada
    - fluxo lead <-> inbox
  - semana 2:
    - agendamentos operacionais
    - saúde do tenant
    - preparação de campanhas inteligentes
- leitura pratica:
  - se o WhatsApp estiver operacional, o bloco mais bonito de produto a seguir e a `Inbox Humana Avançada`

## Atualizacao de 2026-03-30 — Inbox humana com estados operacionais

- enquanto o chip da `Z-API` nao chegava, o usuario pediu para seguir com o restante do produto
- foi atacado o primeiro ganho grande fora do WhatsApp: transformar a `Caixa de Entrada` em fila humana mais real
- mudancas aplicadas:
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
    - filtros novos:
      - `Todas`
      - `Agente`
      - `Atendimento`
      - `Aguardando`
      - `Resolvidas`
      - `Portal`
    - badge/status agora reconhece:
      - `agente`
      - `humano`
      - `aguardando_cliente`
      - `resolvido`
      - `encerrado`
    - card da conversa mostra quando a thread esta em fila humana e desde quando
    - painel ganhou acoes:
      - `Assumir conversa`
      - `Aguardar cliente`
      - `Resolver`
      - `Retomar atendimento`
      - `Reabrir conversa`
      - `Devolver ao agente`
    - mensagem manual fica disponivel apenas em `humano`; `aguardando_cliente` e `resolvido` passam a ser estados operacionais de fila, nao apenas variacoes cosmeticas
    - ao abrir uma conversa com nao lidas, a inbox zera `nao_lidas` via `mark_read`
  - `src/app/api/conversas/[id]/route.ts`
    - `PATCH` deixou de aceitar `body` cru
    - agora sanitiza acoes explicitas e controla `assumido_por`, `assumido_em` e `nao_lidas`
  - `src/app/api/webhooks/twilio/route.ts`
    - se o cliente responder a uma thread em `aguardando_cliente` ou `resolvido`, a conversa volta automaticamente para `humano`
  - `src/app/api/admin/tenants/[id]/metricas/route.ts`
    - contagem de conversas humanas agora inclui `aguardando_cliente`
  - `src/app/admin/[id]/page.tsx`
    - resumo de ultimas conversas ganhou label correta para `aguardando_cliente` e `resolvido`
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar no browser o ciclo completo:
    - assumir
    - responder
    - marcar aguardando cliente
    - responder pelo WhatsApp
    - confirmar reabertura automatica para `humano`
  - depois retomar a ativacao real do canal `Z-API`

## Atualizacao de 2026-03-30 — Agendamentos operacionais como fila de trabalho

- enquanto o usuario validava a inbox humana, foi atacado o proximo bloco fora do WhatsApp: `Agendamentos`
- mudancas aplicadas:
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - status reconhecidos:
      - `agendado`
      - `confirmado`
      - `remarcado`
      - `realizado`
      - `cancelado`
    - a tela deixou de ser uma lista unica e passou a separar:
      - `Fila que precisa confirmacao`
      - `Confirmados`
      - `Histórico recente`
    - quick actions novas:
      - confirmar
      - remarcar com `datetime-local` inline
      - marcar como realizado
      - cancelar
    - para admin:
      - reatribuicao inline do responsável do agendamento via `/api/usuarios`
    - a card tambem destaca `Precisa atenção` para reunioes de hoje ou atrasadas que ainda nao foram concluidas/canceladas
  - `src/app/api/agendamentos/[id]/route.ts`
    - agora usa `getTenantContext`
    - aplica filtro por `tenant_id`
    - valida acesso ao lead para nao-admin
    - aceita `usuario_id` para reatribuicao por admin
    - se `data_hora` mudar sem status explicito, marca como `remarcado`
    - sincroniza status do lead:
      - `realizado` -> `converted`
      - `agendado` / `confirmado` / `remarcado` -> `scheduled`
      - `cancelado` -> `awaiting` quando o lead ainda estava `scheduled`
    - `DELETE` tambem ficou tenant-aware e reverte o lead para `awaiting`
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar no browser:
    - confirmar um agendamento
    - remarcar com data nova
    - reatribuir responsável (como admin)
    - cancelar e observar o reflexo no lead
  - depois seguir para ativacao real do canal `Z-API`

## Atualizacao de 2026-03-30 — Saúde do tenant no admin com recorte tenant-aware

- com a `Z-API` ainda sem conectar, o proximo bloco puxado foi a leitura executiva do tenant no admin
- correcao importante feita junto:
  - `src/app/api/admin/tenants/[id]/metricas/route.ts` agora ancora as metricas em `tenant_id`
  - antes disso, varias contagens estavam vulneraveis a ruído global por nao filtrar corretamente
- novas metricas expostas:
  - `ultimoAcessoEquipe`
  - `usuariosAtivos7d`
  - `conversas7d`
  - `agendamentosPendentes`
  - `riscoOperacional`
  - `resumoSaude`
- `src/app/admin/[id]/page.tsx` ganhou:
  - bloco `Saúde do tenant`
  - badge de risco operacional
  - cards de acesso/atividade recente
  - resumo operacional com pendencias e adocao da equipe
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser se o tenant `Fluxrow` aparece com leitura coerente de ultimo acesso, usuarios ativos e conversas recentes
  - depois retomar o trilho `Z-API`

## Regra Permanente de Continuidade

- toda sessao deve atualizar `docs/CODEX_HANDOFF.md`
- toda sessao deve atualizar `docs/ROADMAP.md` se mudar fase, prioridade ou status
- toda sessao deve atualizar `docs/LEARNINGS.md` se surgir regra tecnica, de produto ou compatibilidade
- toda sessao deve revisar `docs/SESSION_BRIEF.md` para manter o proximo passo claro
- toda sessao deve preservar links cruzados entre `INDEX`, `MASTER`, `ROADMAP`, `LEARNINGS`, `SESSION_BRIEF` e `CODEX_HANDOFF`
- ao final, deve rodar `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`
- no inicio da proxima sessao, deve rodar `scripts/resume-context.sh`

## Atualizacao de 2026-03-30 — Agendamento manual com entrada humana

- foi corrigida uma lacuna de produto importante: a API ja permitia criar agendamento manual, mas a interface ainda nao dava esse caminho para o operador
- mudancas aplicadas:
  - `src/components/novo-agendamento-modal.tsx`
    - modal unico de criacao manual com:
      - selecao de lead
      - data/hora
      - duracao
      - observacoes
      - honorario
      - responsavel
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - novo CTA `Novo agendamento`
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - novo CTA `Agendar consulta`
  - `src/components/lead-drawer.tsx`
    - novo CTA `Agendar`
  - `src/app/api/agendamentos/route.ts`
    - `GET` agora filtra explicitamente por `tenant_id`
    - `POST` agora valida lead e responsavel dentro do tenant atual
    - novos agendamentos passam a gravar `tenant_id`
  - `src/app/api/leads/route.ts`
    - `GET` novo tenant-aware para busca curta de leads no modal global
- impacto operacional:
  - o humano consegue marcar consulta assim que a conversa avancar, sem depender do agente
  - o fluxo lead -> agenda ficou direto dentro do sistema
- refinamento aplicado em seguida:
  - `src/components/novo-agendamento-modal.tsx`
    - busca de lead passou a reagir ao texto digitado e ganhou CTA explicito de busca
    - o select agora mostra tambem email quando disponivel
    - novo campo `E-mail da reunião` permite sobrescrever o email do lead so para o convite/Meet
  - `src/app/api/leads/route.ts`
    - a busca curta passou a aceitar tambem leads com `lgpd_optout` nulo (`neq true`)
    - payload leve agora retorna `email`
  - `src/app/api/agendamentos/route.ts`
    - `POST` passou a aceitar `email_reuniao` como override do `emailLead` enviado ao Google Calendar
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar se o produto deve apenas sinalizar ou bloquear mais de um agendamento futuro ativo por lead
  - validar no browser a busca por nome/telefone e o override de email do convite
