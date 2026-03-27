# PrevLegal — LEARNINGS.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Erros encontrados, causas e correções aplicadas.
> Atualizado a cada sessão.

---

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]

## Sessões Relacionadas

- [[Sessoes/2026-03-18-prevlegal-admin-roi-obsidian]]
- [[Sessoes/2026-03-18-sessoes-17-18-marco-prevlegal-completo]]

## Padrões TypeScript/Next.js 16

### 1. `createClient` admin no nível de módulo
**Erro:** `supabaseUrl is required`
**Causa:** `createClient` chamado fora de função — env vars não disponíveis no build
**Correção:** Sempre instanciar `createClient` DENTRO de cada função handler (GET, POST, etc.)
**Arquivos afetados:** `src/app/api/admin/tenants/route.ts`, `src/app/api/admin/tenants/[id]/route.ts`

### 2. `params` em dynamic routes
**Erro:** TypeScript error no build
**Causa:** Next.js 16 exige `params` como `Promise`
**Padrão correto:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // sempre await
}
```

### 3. `useRef` sem valor inicial
**Erro:** TypeScript strict mode
**Padrão correto:** `useRef<Tipo | undefined>(undefined)`

### 4. `cookies()` assíncrono
**Padrão correto:** `const cookieStore = await cookies()` antes de `.getAll()`

### 5. `middleware.ts` → `proxy.ts`
**Causa:** Next.js 16 reserva o nome `middleware`
**Correção:** Renomear arquivo e trocar export de `middleware` para `proxy`

---

## Supabase

### 6. Coluna `tenant_id` não existe em `usuarios`
**Erro:** `column tenant_id does not exist`
**Causa:** A tabela `usuarios` é single-tenant — não tem `tenant_id`
**Correção:** Remover `tenant_id` do select em `src/lib/auth-role.ts`

### 7. Coluna `updated_at` não existe em `conversas`
**Erro:** Query falha na busca global
**Causa:** Tabela `conversas` usa `ultima_mensagem_em` em vez de `updated_at`
**Correção:** Atualizar query em `/api/busca/route.ts`

### 8. Migrations devem ser aplicadas antes do deploy
**Causa:** Tabelas `contratos` e `parcelas` criadas localmente mas não no Supabase
**Correção:** Sempre aplicar via Supabase MCP antes de fazer push

---

## LP / Frontend

### 9. Posicionamento incorreto do produto
**Erro:** LP dizia 'para advogados autônomos'
**Causa:** Briefing inicial incompleto
**Correção:** Produto é para OPERAÇÕES DE CAPTAÇÃO, não advogados diretos

### 10. Agente se identificando com escritório parceiro
**Erro:** Mockup mostrava 'Sou assistente do escritório Alexandrini Advogados'
**Causa:** Viola o modelo legal — empresa de captação não pode se vincular ao escritório
**Correção:** Agente se apresenta como '(nome) — Consultor(a) Previdenciário(a)'
**Regra permanente:** NUNCA vincular empresa de captação ao escritório parceiro na comunicação inicial

### 11. NB do beneficiário no mockup da LP
**Erro:** Mockup mostrava 'NB 1234567' na mensagem do agente
**Causa:** Viola compliance definido pela Jéssica
**Correção:** Remover NB da abordagem inicial — só mencionar 'direito reconhecido pelo STF'

---

## Honorários previdenciários — aprendizado de negócio

### 12. Dois tipos de honorários por caso
**Aprendizado:** Uma ação previdenciária bem-sucedida gera DOIS honorários:
- **Contratual:** definido no contrato de êxito com o cliente (20-30% do benefício)
- **Sucumbência:** definido pelo juiz na sentença, pago pelo INSS (~10% do valor da causa)
**Impacto:** Sistema financeiro precisa registrar e trackear os dois separadamente
**Implementado:** Migration 030 + campos na tabela contratos + KPIs no financeiro

### 13. LP CTA deve apontar para /login não para a raiz
**Erro:** Botão "Acessar plataforma" redirecionava para o dashboard da Alexandrini
**Causa:** URL apontava para prevlegal.vercel.app sem path — usuário já logado ia direto pro dashboard
**Correção:** Todos os CTAs da LP apontam para /login

### 14. Env vars admin hardcoded no código
**Erro:** Token admin era string literal no código — inseguro
**Causa:** Variáveis não configuradas no Vercel
**Correção:** 3 env vars adicionadas no Vercel — EMAIL, SENHA e TOKEN gerado com openssl rand -hex 24

### 15. Agente NUNCA pode se identificar com o escritório parceiro
**Regra permanente de negócio e compliance OAB**
**Errado:** "Sou assistente do escritório Alexandrini Advogados"
**Correto:** "(nome) — Consultor(a) Previdenciário(a)"
**Motivo:** Empresa de captação não pode ter vínculo público com o escritório — viola o Provimento 205/2021 OAB

### 16. Obsidian MCP — vault precisa estar aberto
**Erro:** mcp-obsidian retornava 404 mesmo com plugin ativo
**Causa:** Obsidian aberto mas sem vault carregado
**Correção:** Sempre abrir a pasta ~/Documents/Fluxrow como cofre antes de usar o MCP
**Porta:** HTTPS 27124, requer NODE_TLS_REJECT_UNAUTHORIZED=0

### 17. Dois tipos de honorários em ações previdenciárias
**Aprendizado de negócio crítico — definido pela Jéssica Alexandrini**
- Contratual: definido no contrato de êxito com o cliente (20-30% do benefício)
- Sucumbência: definido pelo juiz na sentença, pago pelo INSS (~10% do valor da causa)
**Impacto no sistema:** tabela contratos tem campos separados — honorario_contratual e honorario_sucumbencia
**ROI real de cada caso = contratual + sucumbência**

### 18. PrevLegal não é para advogados autônomos
**Posicionamento correto:** SaaS para OPERAÇÕES DE CAPTAÇÃO PREVIDENCIÁRIA
**Modelo:** Empresa de captação (não-OAB) + Escritório parceiro (OAB)
**A empresa de captação usa o PrevLegal — o escritório recebe os leads qualificados**
**Base legal:** Provimento 205/2021 OAB + Art. 34 IV Estatuto da Advocacia

### 19. LP precisa de responsividade específica para 768px e 480px
**Erro:** Layout da LP quebrava em telas móveis estreitas, especialmente em 390px
**Causa:** O bloco responsivo antigo era genérico demais e não tratava nav, hero, mockup, pricing, ROI e footer com granularidade suficiente
**Correção:** Padronizar um bloco mobile completo com breakpoints em `768px` e `480px`
**Regra prática:** Em landing pages ricas, revisar sempre nav, hero CTA, mockup, métricas, pricing, ROI e footer separadamente no mobile

### 20. Chat do portal precisa de polling + Realtime no painel interno
**Erro:** As mensagens novas do cliente e do escritório só apareciam após recarregar a tela do lead
**Causa:** `portal-lead.tsx` fazia fetch único no mount e não mantinha a conversa sincronizada
**Correção:** Adicionar polling de 5 segundos + canal Supabase Realtime por `lead_id`
**Regra prática:** Em chat bidirecional do PrevLegal, usar Realtime para inserções e polling leve como fallback de consistência

### 21. Botões de mensagem rápida no Kanban dependem do telefone no select dos leads
**Erro:** O modal do card não consegue localizar a conversa WhatsApp se o kanban não carregar `telefone`
**Causa:** A página de leads buscava apenas campos visuais do board e omitia o identificador usado pela conversa
**Correção:** Incluir `telefone` no `select` da página de leads e normalizar o número para casar com `conversas.telefone`
**Regra prática:** Sempre que um card abrir ações de comunicação, carregar no dataset ao menos `id`, `nome` e `telefone`

### 22. Security Advisor do Supabase: zerar ERRORs primeiro, interpretar WARNINGs no contexto do produto
**Cenário:** O relatório do Security Advisor apontou erros críticos em `prevlegal-alexandrini` e `prevlegal-central`
**Correções aplicadas:** RLS ativado nas tabelas expostas, views trocadas para `security_invoker`, convites protegidos, tabela de teste removida e funções corrigidas com `search_path`
**Resultado:** Todos os `ERRORs` foram eliminados; restaram apenas `WARNINGs`
**Leitura correta dos WARNINGs atuais:**
- `rls_policy_always_true` é aceitável no modelo `single-tenant` atual, porque todos os usuários autenticados pertencem ao mesmo tenant operacional
- `pg_trgm` no schema `public` é um aviso técnico de baixo risco no contexto atual
- `Leaked password protection disabled` deve ser ativado no Dashboard do Supabase em `Authentication -> Password Settings`
**Regra prática:** Em auditoria de segurança, diferenciar achado crítico de aviso contextual. Quando o produto migrar para multi-tenant real, revisar todas as policies `USING (true)` para filtrar por `tenant_id`

### 23. Demos embedados na LP precisam ser autossuficientes
**Erro:** O demo novo ainda dependia de Google Fonts externas e inicialização direta no fim do script
**Risco:** Assets externos e boot frágil aumentam chance de falha visual dentro de `iframe` e prejudicam previsibilidade em produção
**Correção:** Trocar para stacks locais de fonte e inicializar a animação com `window.load` + guard idempotente
**Regra prática:** Todo `public/demo.html` do PrevLegal deve funcionar sozinho, sem dependência crítica de terceiros para tipografia ou start das cenas

### 24. Transição de cenas no demo precisa adicionar `visible` depois de `active`
**Erro:** A cena inicial podia entrar como `active` sem ganhar `visible`, quebrando a transição visual
**Causa:** O boot e a navegação trocavam a cena ativa sem garantir um frame de separação antes da classe final
**Correção:** Usar `requestAnimationFrame` duplo após `classList.add('active')` tanto no init quanto em `goTo`
**Regra prática:** Em animações de cena dentro de `iframe`, separar classes de estado em dois frames para evitar race condition de renderização

### 25. Drawer de lead precisa oferecer atalho para a página completa
**Problema:** O drawer resolve consulta rápida, mas tarefas de edição, documentos e contratos exigem navegação adicional manual
**Correção:** Adicionar CTA "Ver completo" no header do drawer apontando para `/leads/[id]`
**Regra prática:** Componentes de preview lateral devem sempre oferecer um caminho explícito para a tela completa quando houver ações avançadas fora do escopo do drawer

### 26. Twilio multi-tenant precisa de fallback global e helper único
**Problema:** Envio do agente, resposta manual e campanhas estavam com fetch Twilio duplicado e acoplado às env vars globais
**Correção:** Centralizar em `src/lib/twilio.ts`, buscar credenciais por tenant quando existirem e usar env vars globais como fallback silencioso
**Regra prática:** Todo envio WhatsApp no PrevLegal deve passar por helper compartilhado para unificar autenticação, número de origem, tratamento de erro e futura expansão multi-tenant

### 27. Mensagem do portal precisa notificar fora do detalhe do lead
**Problema:** O cliente podia mandar mensagem pelo portal sem gerar visibilidade imediata no sino ou na Caixa de Entrada
**Correção:** Criar notificação do tipo `portal` no backend e expor contagem agregada de não lidas via endpoint próprio
**Regra prática:** Toda entrada assíncrona relevante do cliente deve alimentar dois níveis de atenção: notificação global e badge agregado da área operacional

### 28. Inbox operacional unificada precisa separar canal e pendência real
**Problema:** Badge global sem fila operacional gera alerta, mas não resolve ação humana
**Correção:** A `Caixa de Entrada` passou a distinguir WhatsApp (`todas`, `agente`, `humano`) e `portal` como aba própria, enquanto a sidebar usa endpoint agregado de pendências reais
**Regra prática:** Badge só faz sentido quando aponta para uma fila acionável; sempre modelar junto contagem agregada + lista operacional + painel de resposta

### 29. Inputs perdem foco quando subcomponentes de formulário são declarados dentro do componente principal
**Problema:** Ao digitar uma letra, o cursor sai do campo e o usuário precisa clicar novamente para continuar
**Causa:** Helpers como `Section`, `Field`, `Grid` e similares foram declarados dentro de componentes client-side; a cada mudança de estado, React recria esse tipo de componente e pode remontar o trecho da árvore
**Correção:** Mover subcomponentes reutilizados de formulário para o escopo do módulo, fora do componente principal
**Regra prática:** Em formulários do PrevLegal, nunca declarar componentes React auxiliares dentro do componente que mantém o estado de digitação

### 30. Detalhe do tenant no admin precisa deixar explícito quando a métrica ainda vem do projeto piloto único
**Problema:** A página de detalhe do tenant pode sugerir isolamento real por cliente mesmo quando o backend ainda lê de uma única base operacional
**Causa:** O modelo multi-tenant administrativo evoluiu antes do isolamento físico dos dados por tenant
**Correção:** Implementar a tela já com endpoint dedicado, mas documentar que as métricas ainda usam o projeto único do piloto até a camada de credenciais/base por tenant ficar pronta
**Regra prática:** Sempre sinalizar quando uma feature admin é `tenant-aware` na interface, mas ainda não `tenant-isolated` na infraestrutura

### 31. Vale encapsular contexto recorrente do PrevLegal em uma skill local
**Problema:** Muitas sessões repetem o mesmo contexto de produto, compliance OAB, prioridades e rituais de build/docs
**Causa:** O projeto ficou mais complexo e o conhecimento ficou espalhado entre código, `MASTER`, `ROADMAP`, `LEARNINGS` e memória da sessão
**Correção:** Criar uma skill local `prevlegal-product-ops` com gatilho para tarefas de produto, arquitetura e implementação no PrevLegal
**Regra prática:** Quando um projeto acumula regras próprias, fluxos repetitivos e linguagem de negócio específica, vale transformar isso em skill para reduzir retrabalho e manter consistência

### 32. Domínio principal merece separação entre site e app
**Cenário:** O domínio `prevlegal.com.br` foi adquirido
**Decisão recomendada:** usar `prevlegal.com.br` para site/LP e `app.prevlegal.com.br` para a plataforma
**Motivo:** melhora organização, escalabilidade, clareza comercial e reduz acoplamento entre marketing, autenticação e links do produto
**Regra prática:** Quando o produto sair do estágio de subdomínio temporário, migrar com ordem explícita: arquitetura -> Vercel -> DNS -> URLs canônicas -> links automáticos -> validação final

### 33. Migração de domínio precisa começar pelo inventário de URLs absolutas e fallbacks

### 34. Cadastro de escritório no admin não pode falhar em silêncio
**Problema:** Depois do reset operacional, o modal de novo escritório podia falhar sem salvar e sem mostrar motivo ao admin
**Causa:** O frontend ignorava respostas não-`ok` do `POST /api/admin/tenants`, e o backend aceitava `slug` vazio/sem normalização
**Correção:** Normalizar payload no backend, gerar `slug` automaticamente a partir do nome quando vazio, evitar colisões de slug no update e exibir a mensagem real de erro no modal do admin
**Regra prática:** Fluxos de bootstrap do tenant nunca podem depender de campo técnico manual sem fallback automático, e todo erro de persistência no admin precisa aparecer na UI

### 35. APIs do admin não podem passar pelo gate de login do app
**Problema:** `POST /api/admin/tenants` falhava mesmo com `admin_token` válido
**Causa:** O middleware tratava `/api/admin/*` como API comum do app e redirecionava para `/login` quando não havia sessão Supabase do produto
**Correção:** Tratar `/api/admin/*` como superfície administrativa no middleware, respeitando `admin_token` e retornando `401` JSON quando a autenticação do admin estiver ausente
**Regra prática:** Toda rota `/api/admin/*` do PrevLegal deve ser autenticada pelo contexto do admin, não pelo contexto do app

### 36. `/api/admin/reauth` precisa continuar pública para o próprio fluxo de reautenticação funcionar
**Problema:** A tela de reautenticação do admin parecia rejeitar a senha correta
**Causa:** O middleware protegia `/api/admin/reauth` como se fosse rota privada do app, então a chamada era redirecionada para `/login` antes de validar as credenciais
**Correção:** Incluir `/api/admin/reauth` entre as rotas públicas do middleware
**Regra prática:** Endpoints que estabelecem autenticação ou reautenticação não podem depender da sessão que eles próprios estão tentando renovar

### 37. Contenção do tenant não pode travar o próprio primeiro tenant depois do bootstrap inicial
**Problema:** Depois de criar o primeiro escritório e o primeiro usuário operacional, `Enviar acesso do responsável` e `Copiar link manual` voltaram a responder que o rollout estava pausado
**Causa:** A contenção temporária liberava apenas `usuarios = 0`; assim que o primeiro usuário surgia, o único tenant operacional também ficava bloqueado
**Correção:** Permitir as rotas de onboarding do único tenant existente quando todos os usuários atuais pertencem a esse mesmo tenant
**Regra prática:** Em contenção multi-tenant, o bloqueio precisa impedir expansão para um segundo tenant, não quebrar o bootstrap do primeiro tenant real

### 38. Tela de redefinição precisa aceitar os formatos reais de link enviados pelo Supabase Auth
**Problema:** O email de acesso/redefinição podia abrir a página de nova senha e ainda assim cair como "link inválido ou expirou"
**Causa:** A tela dependia quase só de uma sessão já estabelecida; ela não tratava explicitamente `token_hash` ou `code` na URL
**Correção:** A página `/auth/redefinir-senha` agora processa `token_hash`, `type` e `code`, além do fluxo de sessão existente
**Regra prática:** Páginas de auth do PrevLegal devem suportar os diferentes formatos de callback que o Supabase pode emitir em ambientes reais

### 39. `Enviar acesso do responsável` não deve depender do email chegar para o onboarding continuar
**Problema:** A API de provisionamento respondia sucesso, mas o email podia não chegar imediatamente e o operador ficava sem certeza do que fazer
**Causa:** O fluxo separava demais "enviar email" e "copiar link manual", mesmo quando o email é a parte mais instável do processo
**Correção:** Após sucesso em `Enviar acesso do responsável`, o admin agora já gera e copia automaticamente o link manual de contingência
**Regra prática:** Em onboarding crítico, sempre devolver um caminho manual utilizável no mesmo passo em que o sistema dispara um email externo

### 40. Reset de senha do responsável deve ter a mesma contingência do onboarding
**Problema:** O email de reset podia chegar, mas o clique ainda falhar com erro do Supabase/session JWT
**Causa:** O fluxo de reset ainda dependia exclusivamente do link enviado por email
**Correção:** Após sucesso em `Enviar reset de senha`, o admin agora também gera e copia automaticamente o link manual de contingência
**Regra prática:** Sempre que um email de auth for opcionalmente instável, o operador deve sair da ação já com um link manual funcional em mãos

### 41. Reset manual robusto é melhor do que depender da sessão recovery do Supabase
**Problema:** Mesmo com link manual, o reset podia falhar com `User from sub claim in JWT does not exist`
**Causa:** O fluxo ainda acabava dependendo da sessão recovery/JWT emitida pelo Supabase Auth
**Correção:** Criar `reset-manual` via token próprio salvo em `convites` e aplicar a nova senha com `auth.admin.updateUserById`
**Regra prática:** Para fluxos administrativos críticos do PrevLegal, preferir tokens próprios no backend quando a UX de recovery do provedor externo se mostrar inconsistente

### 34. Contenção por allowlist sozinha não basta quando o tenant piloto ainda tem múltiplos usuários
**Cenário:** Mesmo após bloquear novos escritórios no app, algumas superfícies continuavam amplas demais para o modelo legado compartilhado
**Causa:** O banco operacional ainda não tem `tenant_id`, então várias rotas liam dados globais ou dependiam de permissões abertas herdadas do modelo `um banco por tenant`
**Correção temporária:** Criar `src/lib/tenant-context.ts` e endurecer páginas/rotas principais para usar o usuário autenticado como âncora de escopo
**Regra prática:** Em incidente multi-tenant sem migração aplicada, a ordem segura é:
- 1. conter acesso por allowlist
- 2. endurecer auth e ownership por usuário nas superfícies mais críticas
- 3. só depois avançar para `tenant_id` + backfill + RLS

### 35. Build limpo é obrigatório antes de chamar uma contenção temporária de "publicável"
**Cenário:** A camada temporária de isolamento tocou muitas superfícies ao mesmo tempo (`dashboard`, `leads`, `conversas`, `portal`, `financeiro`, `relatorios`, `configuracoes`)
**Risco:** Mudanças amplas de escopo podem parecer corretas em leitura, mas quebrar em tipos, joins Supabase ou páginas server-side
**Correção:** Sempre fechar `npm run build` completo antes de publicar uma onda de contenção desse tipo
**Regra prática:** Em PrevLegal, contenção P0 também precisa passar pelo mesmo ritual de qualidade: build, docs, handoff, Obsidian e só então push/deploy

### 36. Quando o legado e descartável, reset limpo é melhor que backfill “forçado”
**Cenário:** O banco operacional tinha dados piloto/contextuais (`Alexandrini/Jessica`) usados só para prototipagem do produto
**Risco:** Backfillar esse legado para um tenant “real” carrega sujeira e ambiguidade para dentro do modelo multi-tenant final
**Correção:** Se o dado piloto puder ser descartado, preferir:
- aplicar a migration estrutural
- resetar o operacional
- bootstrapar o primeiro escritorio real do zero
**Regra prática:** Em transição de single-tenant piloto para multi-tenant real, só fazer backfill quando o legado for de fato produção que precisa ser preservada

### 37. Reset limpo no banco so resolve metade do problema; o bootstrap precisa nascer tenant-aware
**Cenário:** Depois da `031` e do reset operacional, o banco ficou limpo, mas as rotas de onboarding e criação ainda poderiam voltar a gravar dados sem `tenant_id`
**Risco:** Recriar o primeiro escritório real em cima de fluxos antigos recoloca dados “soltos” logo após o reset
**Correção:** Ajustar imediatamente o bootstrap:
- responsável do tenant gravando `usuarios.tenant_id`
- convites internos gravando `convites.tenant_id`
- aceite de convite gravando `usuarios.tenant_id`
- importação de listas e criação manual de leads gravando `tenant_id`
**Regra prática:** Toda vez que houver reset estrutural para bootstrap limpo, revisar antes os fluxos de criação para garantir que o novo dado já nasce no modelo final
### 34. Estrutura duplicada na raiz pode fazer a Vercel/Next publicar o app errado
**Problema:** O deploy público passou a responder só `lp.html` e `404` nas rotas do app, mesmo com aliases corretos na Vercel
**Causa:** Havia uma árvore `app/` vazia na raiz e um `next.config.js` residual competindo com a aplicação real em `src/app` e com `next.config.ts`
**Correção:** Remover a árvore `app/` vazia, apagar `next.config.js`, centralizar a config em `next.config.ts` e fixar `turbopack.root` com `process.cwd()`
**Regra prática:** No PrevLegal, manter apenas uma raiz de App Router e um único arquivo de configuração do Next; qualquer resíduo estrutural pode mascarar erros no build e gerar deploy aparentemente "pronto" mas servindo o artefato errado

### 35. `createBrowserClient` não deve rodar no corpo de componentes que podem prerenderizar
**Problema:** O build quebrava no `/login` com `Your project's URL and API key are required to create a Supabase client`
**Causa:** `createClient()` do browser era chamado no corpo do componente durante o prerender
**Correção:** Instanciar o client apenas dentro de handlers/eventos do cliente, como submit de login e logout
**Regra prática:** Em componentes client-side do PrevLegal, `createBrowserClient` só deve nascer em interação do usuário, `useEffect` ou import dinâmico controlado

### 36. `useSearchParams` em páginas client do App Router precisa de `Suspense`
**Problema:** O build falhava em `/reauth` com `useSearchParams() should be wrapped in a suspense boundary`
**Causa:** Next 16 exige boundary explícita quando `useSearchParams` dispara bailout CSR em página
**Correção:** Criar um componente interno com `useSearchParams` e exportar a página com wrapper `<Suspense>`
**Regra prática:** Toda página client do PrevLegal que usar `useSearchParams` deve sair já envolvida em `Suspense`

### 37. Acoes sensiveis do admin devem ficar dentro do modal do tenant quando dependem do email do responsavel
**Cenario:** Reset de senha precisava ser executado sem sair da tela de edicao do escritorio
**Correcao:** Criar endpoint dedicado em `src/app/api/admin/tenants/[id]/reset-senha/route.ts` e acionar do proprio modal com feedback local
**Regra pratica:** Quando a acao depende do tenant carregado e exige reauth do admin, ela deve viver junto do modal/detalhe para evitar friccao operacional

### 38. Recriar acesso de usuario nao pode depender de inserir um novo `usuarios` com o mesmo email
**Problema:** O fluxo de convite quebraria ao recriar acesso de um usuario ja existente, porque `usuarios.email` e unico e o aceite tentava sempre fazer `insert`
**Correcao:** No aceite do convite, se o email ja existir em `usuarios`, o sistema atualiza `auth_id` e reativa o registro existente em vez de criar outro
**Regra pratica:** Em reonboarding ou recriacao de acesso no PrevLegal, preservar o registro funcional de `usuarios` e trocar apenas a vinculacao com `auth.users`
**Problema:** É fácil trocar o domínio visível da LP e esquecer convites, portal, webhooks, callbacks e links internos do admin
**Causa:** O projeto mistura CTAs estáticos, variáveis de ambiente e fallbacks hardcoded para `prevlegal.vercel.app`
**Correção:** Criar checklist técnico dedicado (`docs/DOMAIN_MIGRATION.md`) antes da migração, mapeando arquivos, envs e riscos
**Regra prática:** Toda migração de domínio deve começar por inventário de URLs absolutas reais no código, não por ajuste visual de superfície

### 34. Cadastro manual de lead ainda depende do modelo legado de listas
**Problema:** Criar lead manual pelo modal falhava com `null value in column "lista_id" of relation "leads" violates not-null constraint`
**Causa:** A tabela `leads` continua exigindo `lista_id`, mesmo para leads que não vieram de importação de lista
**Correção:** A API de criação manual passou a criar/reutilizar uma lista técnica `Cadastro manual` e vincular o lead a ela
**Regra prática:** Enquanto `leads.lista_id` existir como obrigatório, todo lead avulso precisa nascer com uma lista técnica associada para preservar compatibilidade com o restante do modelo

### 35. Domínio do site e domínio do app precisam de env vars separadas
**Problema:** Reaproveitar uma única URL base para LP, SEO, convites, portal e login mistura contextos e complica a migração para domínio próprio
**Correção:** manter `SITE_URL` e `APP_URL` separados em código, envs e callbacks
**Regra prática:** nenhum fluxo de auth, convite, portal ou integração externa deve inferir domínio a partir da LP

### 36. O schema operacional do PrevLegal nasceu para "um banco por tenant", não para multi-tenant lógico
**Problema:** O produto passou a operar mais de um escritório no mesmo banco operacional, mas o schema principal foi criado com a premissa de que cada cliente teria sua própria base
**Evidência:** `supabase/migrations/001_initial_schema.sql` traz explicitamente a regra `cada tenant tem seu proprio banco`
**Impacto:** tabelas principais e policies antigas não usam `tenant_id`, então qualquer expansão multi-escritório no mesmo banco causa vazamento sistêmico
**Regra prática:** enquanto não houver tenant isolation real, não tratar o ambiente compartilhado como multi-tenant seguro

### 37. Quando o CLI estiver linkado no projeto errado e o remoto nao tiver historico local confiavel, o caminho seguro e SQL direto no alvo correto
**Problema:** Em uma etapa critica de isolamento multi-tenant, o Supabase CLI estava apontando para o projeto central e `db push` sugeria um fluxo enganoso para o banco operacional
**Causa:** O projeto remoto nao estava alinhado a um historico normal de migrations locais, entao confiar em link do CLI + `db push` aumentava o risco de executar no lugar errado
**Correcao:** Para o reset limpo do operacional, executar diretamente o arquivo `supabase/reset/combined_apply_031_and_reset.sql` no host do projeto correto (`lrqvvxmgimjlghpwavdb`) e validar as contagens finais no mesmo banco
**Regra pratica:** Em operacoes destrutivas do PrevLegal, sempre travar 3 confirmacoes antes de rodar:
- `project ref` alvo
- metodo de execucao real
- query final de validacao no mesmo banco
**Regra complementar:** Nunca usar `db push` como atalho quando houver duvida de link do CLI ou quando o remoto nao refletir o historico local de migrations

### 37. `src/lib/types.ts` já assume `tenant_id`, mas o banco ainda não
**Problema:** Tipos TypeScript de `Usuario`, `Lead`, `Lista`, `Campanha`, `Agendamento` e outros já carregam `tenant_id`, mas as tabelas equivalentes do banco operacional não
**Impacto:** gera falsa sensação de multi-tenant pronto no código, enquanto a persistência e as APIs continuam globais
**Regra prática:** considerar drift entre tipagem e schema como sinal de arquitetura incompleta; nunca usar os types como prova de isolamento real

### 38. `configuracoes` singleton e token Google global quebram multi-tenant
**Problema:** `src/app/api/configuracoes/route.ts` lê e escreve `configuracoes` com `limit(1)`, e `src/app/api/google/status/route.ts` usa `google_calendar_token` nessa configuração única
**Impacto:** branding, Twilio e Google Calendar podem ficar compartilhados entre escritorios
**Regra prática:** em multi-tenant real, `configuracoes` precisa ser "uma linha por tenant", não singleton global por banco

### 39. `service_role` sem escopo explícito de tenant vira bypass estrutural
**Problema:** APIs como listas, conversas e configurações usam `service_role` para ler/escrever dados globais
**Impacto:** mesmo com RLS futura, qualquer rota com `service_role` sem filtro explícito de `tenant_id` continua podendo vazar dados
**Regra prática:** `service_role` só é aceitável no PrevLegal quando a query já entra com escopo explícito de tenant e ownership

### 40. Em incidente multi-tenant P0, contenção também precisa atingir onboarding
**Problema:** Bloquear só o acesso ao app reduz exposição, mas ainda permite provisionar novos responsaveis e expandir um rollout inseguro
**Correção:** As rotas de onboarding do responsavel passaram a devolver `423` para emails fora da allowlist durante a contingência
**Regra prática:** Em incidente de isolamento, não basta bloquear navegação; também é preciso travar pontos que aumentem a superfície de exposição

### 41. Quando o banco real confirma que todo o dado operacional é legado de um único escritório, a allowlist do app deve voltar ao piloto
**Problema:** Manter emails de novos escritorios na allowlist do app faz esses usuarios entrarem numa base que ainda e legado do tenant piloto
**Correção:** A allowlist do app foi reduzida novamente para `jessica@alexandrini.adv.br`; novos escritorios permanecem só no admin até a Fase 26 fechar
**Regra prática:** Em incidente LGPD, priorizar bloqueio duro do acesso operacional em vez de conveniência de teste
**Causa:** Antes do cutover, o projeto tratava `prevlegal.vercel.app` como host único para marketing e plataforma
**Correção:** Padronizar `NEXT_PUBLIC_SITE_URL` para site/LP/metadata e `NEXT_PUBLIC_APP_URL` para plataforma, convites, portal e fluxos autenticados
**Regra prática:** Tudo que for canônico, indexável ou marketing usa `SITE_URL`; tudo que for login, convite, portal, webhook e app usa `APP_URL`

### 36. HTML estático público não consegue consumir env vars do Next em runtime
**Problema:** `public/lp.html` e `public/demo.html` não conseguem interpolar `process.env` como componentes do App Router
**Causa:** Arquivos em `public/` são servidos como estáticos puros, fora do pipeline de renderização do Next
**Correção:** Manter fallback literal temporário para `https://prevlegal.vercel.app/login` até a janela final de cutover, documentando a troca no runbook
**Regra prática:** Se a LP continuar em `public/*.html`, mudanças de domínio precisam ser feitas por substituição literal controlada, não por `process.env` no cliente

### 37. Segurança de sessão precisa equilibrar proteção real e fricção de uso
**Problema:** Exigir login constante irrita o usuário; deixar sessão aberta indefinidamente em máquina compartilhada expõe dados sensíveis
**Causa:** Produtos B2B com dados operacionais sensíveis precisam de política de sessão por inatividade, não só login inicial
**Correção recomendada:** usar expiração por inatividade na plataforma (`45 min`), política mais rígida no admin (`15 min`) e reautenticação apenas para ações críticas
**Regra prática:** No PrevLegal, UX normal do dia a dia pode continuar fluida, mas abandono de máquina e áreas sensíveis devem ser protegidos por timeout e reauth seletiva

### 38. GoDaddy WebsiteBuilder no apex pode bloquear toda a emissão de SSL na Vercel
**Problema:** `prevlegal.com.br` aparentava estar configurado, mas o apex ainda respondia pelo WebsiteBuilder da GoDaddy, enquanto `www`, `app` e `admin` ficavam presos em `Invalid Configuration` ou aguardando certificado
**Causa:** O domínio raiz estava misturando IP da GoDaddy com IPs da Vercel. Enquanto o apex não validava corretamente, a cadeia de SSL e de configuração dos subdomínios ficava inconsistente
**Correção:** Remover o apontamento do apex para a GoDaddy, deixar o `@` somente na configuração pedida pela Vercel e aguardar a emissão em cascata dos certificados
**Sinal prático:** Se `https://prevlegal.com.br` responder com `Server: DPS/2.0.0-beta`, ainda está servindo GoDaddy e não Vercel
**Regra prática:** Em migração de domínio para a Vercel, nunca considerar DNS "ok" só porque `www/app/admin` já apontam por CNAME. O primeiro checkpoint real é o apex deixar de responder GoDaddy e começar a mostrar `Generating SSL Certificate` no painel

### 39. Reautenticação seletiva funciona melhor do que expirar tudo a cada ação sensível
**Problema:** Proteger financeiro e admin apenas com login inicial deixa áreas críticas expostas em máquinas compartilhadas; proteger tudo com login constante degrada demais a UX
**Causa:** O app mistura uso operacional frequente com áreas sensíveis que exigem um nível extra de confiança
**Correção:** Adotar dois mecanismos combinados:
- timeout por inatividade da sessão (`45 min` app, `15 min` admin)
- reautenticação recente apenas para financeiro e operações administrativas críticas
**Regra prática:** No PrevLegal, sessão expira por abandono da máquina; ações e telas sensíveis exigem um carimbo recente de reauth, não um novo login completo em cada navegação

### 40. Middleware do app e auth do admin precisam ser tratados como trilhas diferentes
**Problema:** O app usa Supabase auth, enquanto o admin usa cookie próprio httpOnly; tratar ambos como se fossem a mesma sessão causa redirecionamentos errados
**Causa:** O proxy global protegia rotas com base em uma única lógica de autenticação
**Correção:** Separar a trilha do admin dentro do middleware/proxy:
- `/admin` valida `admin_token` e cookie de atividade do admin
- app normal valida usuário Supabase e cookie de atividade do app
**Regra prática:** Sempre que coexistirem auths diferentes no mesmo domínio, o middleware deve reconhecer explicitamente cada área antes de aplicar redirecionamentos

### 41. Cookie ausente de reautenticação deve falhar fechado, não passar silenciosamente
**Problema:** As APIs sensíveis do admin respondiam normalmente mesmo sem cookie recente de reautenticação
**Causa:** O helper considerava timestamp ausente como "não expirado", o que abre uma brecha lógica
**Correção:** `hasRecentReauth` e `verificarAdminReauthRecente` agora exigem timestamp válido antes de aceitar a sessão
**Regra prática:** Em qualquer verificação de reauth no PrevLegal, ausência do cookie deve ser tratada como falha de segurança, nunca como sessão válida

### 42. Sandbox do WhatsApp precisa usar o mesmo número em Twilio, env e UI
**Problema:** O painel da Twilio mostrava o sandbox `whatsapp:+14155238886`, mas o ambiente local estava configurado com outro número de origem
**Causa:** O projeto evoluiu com defaults corretos na UI, mas o `.env.local` ficou divergente
**Correção:** Alinhar `TWILIO_WHATSAPP_NUMBER` com o sender real do sandbox e manter os webhooks apontando para a mesma `APP_URL`
**Regra prática:** Em teste com Twilio WhatsApp Sandbox, sempre conferir este trio antes de depurar o app:
- número `From` no painel Twilio
- `TWILIO_WHATSAPP_NUMBER`
- URLs `/api/webhooks/twilio` e `/api/webhooks/twilio/status`

### 43. Cadastro manual de lead precisa gerar NB técnico quando o banco ainda exige `nb NOT NULL`
**Problema:** O modal de novo lead voltava a quebrar com `null value in column "nb" of relation "leads" violates not-null constraint`
**Causa:** O modelo legado continua tratando `nb` como obrigatório e único, mesmo para leads avulsos criados sem número de benefício
**Correção:** A API de criação manual passou a gerar um `nb` técnico no formato `MANUAL-<telefone|cpf|timestamp>` quando o campo vier vazio
**Regra prática:** Enquanto o schema legado exigir `nb` obrigatório, todo cadastro manual deve receber um identificador técnico estável em vez de enviar `null`

### 44. Reset de senha do responsavel precisa mandar email real e ter pagina de conclusao
**Problema:** `generateLink({ type: 'recovery' })` nao fechava o fluxo real de senha do responsavel no produto
**Correcao:** O PrevLegal passou a usar `auth.resetPasswordForEmail()` com redirect para `auth/redefinir-senha`, e essa pagina conclui a troca com `auth.updateUser({ password })`
**Regra pratica:** Sempre que o sistema disser que enviou email de redefinicao, o produto precisa ter a pagina final de nova senha pronta e publicada

### 45. Provisionamento do responsavel nao pode depender de `tenant_id` em `usuarios`
**Problema:** Recriar acesso do responsavel e aceitar convite quebravam com `column usuarios.tenant_id does not exist`
**Causa:** Parte do fluxo novo assumiu multi-tenant fisico na tabela `usuarios`, mas o schema operacional atual continua sem essa coluna
**Correcao:** Remover `tenant_id` dos selects e payloads em `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` e `src/app/api/usuarios/aceitar-convite/route.ts`
**Regra pratica:** Enquanto `usuarios` nao tiver isolamento real por tenant, sincronizar provisao e convites usando `email`, `auth_id`, `role` e estado do convite, nunca `tenant_id`

### 46. Trigger de `auth.users` exige provisionamento temporario quando o registro logico do usuario ja existe
**Problema:** `auth.admin.createUser()` retornava `Database error creating new user` ao reprovisionar responsaveis ou aceitar convite de email que ja existia em `public.usuarios`
**Causa:** O trigger `public.handle_new_user()` insere automaticamente em `public.usuarios`; se a linha logica do usuario ja existe, o insert automatico colide com o `UNIQUE(email)` antes do fluxo customizado conseguir sincronizar
**Correcao:** Criar o usuario Auth com email tecnico temporario, remover a linha automatica criada pelo trigger e depois atualizar `auth.users` + reaproveitar a linha original de `public.usuarios`
**Regra pratica:** Em reonboarding no PrevLegal, preservar o `id` funcional de `usuarios` e tratar o trigger de `auth.users` como etapa automatica que precisa ser neutralizada quando o usuario ja existe na base operacional

### 47. Responsavel provisionado nao deve continuar aceitando link antigo de convite
**Problema:** O usuario podia clicar num email antigo de `/auth/aceitar-convite` e cair de novo no fluxo legado, mesmo depois de o responsavel ja ter sido provisionado pelo admin
**Causa:** O endpoint de validacao do convite aceitava qualquer token ainda valido sem checar se aquele email ja tinha `auth_id` ativo em `usuarios`
**Correcao:** `src/app/api/usuarios/convite/route.ts` agora rejeita convites obsoletos para emails ja provisionados, e `src/app/auth/aceitar-convite/page.tsx` mostra mensagem clara para usar o email mais recente de definicao de senha ou fazer login
**Regra pratica:** Para responsavel de escritorio, o fluxo oficial e `Gerar acesso do responsavel` + email de definicao de senha; convite antigo nao deve mais competir com esse caminho

### 48. Dominio do site do escritorio nao garante dominio valido para email
**Problema:** O tenant estava com `jessica@alexandrini.com.br`, mas o envio de acesso/reset falhava com email invalido
**Causa:** `alexandrini.com.br` nao recebe email (`MX 0 .`), enquanto o dominio real de caixa postal e `alexandrini.adv.br`
**Correcao:** Atualizar o responsavel para `jessica@alexandrini.adv.br` e reprovisionar o acesso do responsavel
**Regra pratica:** Antes de concluir que o erro e do fluxo de auth, validar se o dominio do email do escritorio realmente possui MX funcional; dominio de site e dominio de email podem ser diferentes

### 49. Quando site e app compartilham o mesmo projeto Vercel, o host publico pode acabar herdando redirects errados
**Problema:** `www.prevlegal.com.br` chegou a cair no `/login`, porque estava apontando para o mesmo projeto do app, cuja raiz redireciona para autenticacao
**Causa:** Marketing/site e plataforma estavam disputando o mesmo deploy e o mesmo comportamento de rota raiz
**Correcao:** Separar a LP em um projeto Vercel dedicado (`prevlegal-site`, `Root Directory = site`) e deixar o projeto principal apenas com `app.prevlegal.com.br` e `admin.prevlegal.com.br`
**Regra pratica:** No PrevLegal, `www` deve servir o site em projeto proprio; `app` e `admin` ficam no projeto da plataforma. Nao reutilizar o mesmo host/projeto para LP e produto autenticado

### 50. Vercel CLI pode exigir branch especifica para env de Preview
**Problema:** Ao tentar alinhar `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SITE_URL` no ambiente `Preview`, a CLI retornou `git_branch_required`
**Causa:** Neste projeto/time, a Vercel esta tratando `Preview` como env branch-specific no fluxo da CLI atual
**Correcao:** Fechar o cutover em `Production` e `Development`, registrar a limitacao no handoff e tratar `Preview` explicitamente por branch quando necessario
**Regra pratica:** Ao atualizar envs de dominio na Vercel via CLI, nao assumir que `Preview` aceita valor global; validar o comportamento do projeto antes de marcar a migracao como totalmente alinhada em todos os ambientes

### 51. Supabase Auth pode ignorar `redirectTo` e cair em `localhost` quando a URL de Auth do projeto esta desatualizada
**Problema:** O email de primeiro acesso chegou, mas ao clicar abriu `http://localhost:3000/#error=access_denied...`
**Causa confirmada:** A geracao real de link no Supabase retornou `redirect_to=http://localhost:3000`, mesmo quando o app pediu `https://app.prevlegal.com.br/auth/redefinir-senha`
**Correcao aplicada no produto:** criar um caminho de contingencia com link manual em `app.prevlegal.com.br/auth/confirm`, gerado no admin por `src/app/api/admin/tenants/[id]/link-acesso/route.ts`
**Correcao externa ainda necessaria:** ajustar no painel do Supabase Auth a URL base/allowlist para o dominio `app.prevlegal.com.br`
**Regra pratica:** Se o email de recovery/primeiro acesso abrir `localhost`, o problema esta no Auth URL Configuration do Supabase, nao no `redirectTo` do codigo

### 52. O produto ainda nao tem isolamento real por escritorio no banco operacional
**Problema:** Um novo escritorio logado passou a enxergar leads, conversas, listas, financeiro, configuracoes e outros dados da Jessica
**Causa confirmada:** O banco operacional e as APIs principais continuam sem `tenant_id` funcional nas tabelas de negocio e sem filtros de isolamento por escritorio; o modelo atual se comporta como single-tenant
**Impacto:** Risco critico de LGPD, quebra de sigilo operacional e violacao etica entre escritorios
**Contencao recomendada:** Nao onboardar mais de um escritorio real no mesmo banco/app sem isolamento; tratar como incidente P0
**Regra pratica:** Multiusuario com roles nao significa multi-tenant. Antes de cadastrar um segundo escritorio em producao, todas as superficies de negocio precisam filtrar por tenant/escritorio

### 53. Google OAuth em mudanca de dominio precisa ser ajustado no Google Cloud Console, nao so no codigo
**Problema:** Ao tentar conectar Google Calendar, a tela exibiu `Erro 400: invalid_request` com bloqueio de autorizacao
**Causa mais provavel no contexto atual:** O dominio/callback mudou para `app.prevlegal.com.br`, mas o OAuth Client do Google nao foi alinhado no Console com os novos redirect URIs/origins e possivelmente com a tela de consentimento
**Correcao operacional:** Revisar o OAuth Client no Google Cloud Console usando navegador autenticado e garantir os redirect URIs do dominio `app`
**Regra pratica:** Sempre que APP_URL muda, revisar imediatamente Google OAuth Client e tela de consentimento; so mudar env no app nao conclui a integracao

### 54. Em incidente P0 de multi-tenant, uma allowlist temporaria no middleware e melhor do que deixar o ambiente “meio aberto”
**Problema:** Sem isolamento real, um segundo escritorio autenticado conseguia navegar por dados de outro escritorio
**Causa:** O app ainda opera como single-tenant em partes relevantes; esperar a modelagem completa sem contencao deixaria o vazamento ativo
**Correcao aplicada:** Adotar contencao temporaria no middleware, permitindo acesso apenas a uma allowlist minima de emails enquanto a Fase 26 nao termina
**Regra pratica:** Quando houver risco LGPD imediato, primeiro conter o acesso, depois modelar a arquitetura definitiva

### 55. Importacao de lista nao pode “parecer sucesso” quando o batch de leads falha
**Problema:** A lista era criada e aparecia na UI, mas os leads nao entravam no banco; ainda assim o fluxo terminava sem erro util
**Causa:** A rota `/api/import` criava a lista primeiro e depois engolia o erro do `upsert` em batch, apenas deixando `inseridos = 0`
**Correcao aplicada:** Fazer fallback row-by-row quando um batch falha, expor o primeiro erro real ao usuario e remover a lista criada se nenhum lead for inserido
**Regra pratica:** Em importacao em lote, nunca concluir o fluxo como sucesso se a entidade-pai foi criada mas os registros-filho falharam silenciosamente

### 56. UI e API precisam falar os mesmos nomes de campo para os totais da lista
**Problema:** A pagina `/listas` mostrava contadores zerados ou vazios mesmo quando a lista possuia dados agregados
**Causa:** O banco grava `total_com_whatsapp`, `total_sem_whatsapp` e `total_nao_verificado`, mas a UI esperava `com_whatsapp`, `sem_whatsapp` e `nao_verificado`
**Correcao aplicada:** Mapear os nomes reais na API `/api/listas` antes de responder para a UI
**Regra pratica:** Quando a interface usar nomes derivados mais amigaveis do que o schema, a adaptacao deve acontecer na API e nao ficar implícita

### 57. Duplicidade de lista precisa ser bloqueada no tenant antes de persistir a importacao
**Problema:** A mesma planilha foi importada duas vezes no mesmo escritorio, criando conflito operacional e duplicidade de base
**Causa:** Nao havia validacao previa por `tenant_id` + `nome`/`arquivo_original`
**Correcao aplicada:** Bloquear a importacao se ja existir lista com o mesmo nome ou arquivo original no mesmo tenant
**Regra pratica:** Em fluxos de importacao manual, sempre validar duplicidade de lote antes de criar a lista/pai

### 58. Google OAuth pode quebrar por `redirect_uri` com whitespace invisivel
**Problema:** O Google Calendar retornou `Erro 400: invalid_request` apontando para `redirect_uri=https://app.prevlegal.com.br/api/google/callback`
**Causa:** Alem da necessidade de cadastrar a URI no Google Cloud Console, a env `GOOGLE_REDIRECT_URI` estava com quebra de linha no fim, o que pode gerar mismatch dificil de enxergar
**Correcao aplicada:** Normalizar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` com `trim()` antes de criar o `OAuth2 client`
**Regra pratica:** Em integrações OAuth, sempre sanitizar envs usadas em `redirect_uri`; um whitespace invisivel basta para o provedor devolver `invalid_request`

### 62. Se a conexao Google nasce na aba de agendamentos, o callback deve voltar para agendamentos
**Problema:** O usuario iniciava `Conectar Google` em `/agendamentos`, mas ao concluir o consentimento era redirecionado para `/configuracoes`, enquanto o feedback visual de sucesso/erro estava implementado apenas na aba de agendamentos
**Causa:** O callback do OAuth salvava o token corretamente, mas devolvia para uma tela diferente da que consumia `?google=conectado|erro`
**Correcao aplicada:** Redirecionar o callback para `/agendamentos` e alinhar `src/lib/google-calendar.ts` ao mesmo `trim()` das envs usado nas rotas de auth/callback
**Regra pratica:** Em integrações OAuth do PrevLegal, a tela que inicia a conexão deve ser a mesma que recebe o retorno e confirma o estado conectado para o usuário

### 63. Google OAuth em producao pede paginas publicas reais de privacidade e termos no dominio do site
**Problema:** Para sair de `Testing` no Google Auth Platform e publicar o consent screen, o app precisava de links publicos de homepage, privacidade e termos
**Causa:** A LP tinha links legais no footer ainda apontando para `#`, o que nao resolve exigencias de consentimento/verificacao
**Correcao aplicada:** Criar paginas publicas em `https://www.prevlegal.com.br/privacidade` e `https://www.prevlegal.com.br/termos`, ligar esses links no footer da LP e incluir ambas no sitemap do site
**Regra pratica:** Sempre que o PrevLegal precisar publicar OAuth externo em producao, o dominio publico deve oferecer homepage, politica de privacidade e termos acessiveis e indexaveis

### 64. Google Calendar pode “conectar e desconectar” quando o callback redireciona sucesso sem persistir o token
**Problema:** O usuario concluia o OAuth, voltava para `/agendamentos` com toast de sucesso, mas a UI em seguida mostrava Google desconectado
**Causa confirmada:** A rota `src/app/api/google/callback/route.ts` podia cair no branch de insert da tabela `configuracoes` logo apos o reset operacional; esse insert nao enviava `nome_escritorio`, ignorava erro e redirecionava como sucesso mesmo sem gravar `google_calendar_token`. Alem disso, leitura e escrita de `configuracoes` ainda estavam sem filtro por `tenant_id`
**Correcao aplicada:** Criar helper de configuracoes por tenant em `src/lib/configuracoes.ts`, garantir a existencia de uma linha valida com `nome_escritorio` default antes de salvar o token e ancorar `callback`, `status`, `google-calendar`, `/api/configuracoes` e `/api/agente/config` no `tenant_id` atual
**Regra pratica:** No PrevLegal pos-reset multi-tenant, qualquer fluxo que leia ou escreva `configuracoes` precisa ser tenant-aware e nunca pode sinalizar sucesso ao usuario sem conferir o resultado real da persistencia

### 65. Atalho de contato so gera velocidade real quando cai direto na thread certa ou abre o WhatsApp sem friccao
**Problema:** Em varios pontos do produto o operador via o lead, mas precisava navegar manualmente ate a `Caixa de Entrada` ou sair procurando o numero para iniciar contato
**Causa:** Havia leitura de conversa e historico, mas faltavam CTAs operacionais consistentes entre lead, drawer, agendamentos e busca global
**Correcao aplicada:** Criar helper compartilhado de atalhos em `src/lib/contact-shortcuts.ts`, adicionar links para `Caixa de Entrada` e `WhatsApp` em `lead drawer`, detalhe do lead, modal de mensagens e agendamentos, e fazer a inbox aceitar deep-link por `conversaId`/`telefone`
**Regra pratica:** No PrevLegal, superficies operacionais que exibem um lead precisam oferecer pelo menos um atalho de contato imediato; ver dado sem conseguir agir gera friccao e reduz conversao operacional

### 66. Runtime de campanhas WhatsApp nao pode depender de tabelas legado fora do schema operacional atual
**Problema:** O disparo de campanhas ainda buscava leads em `lista_leads`, tentava reservar numero em `numeros_whatsapp` e usava status que nao existem mais no enum atual
**Causa:** O fluxo de campanhas preservou fragmentos de um modelo antigo, anterior ao schema consolidado em `leads.lista_id`, credenciais por tenant e enum `campanha_status` com `encerrada`
**Correcao aplicada:** Reancorar `src/app/api/campanhas/route.ts` e `src/app/api/campanhas/[id]/disparar/route.ts` no schema operacional vigente: validar `lista_id` dentro do tenant, contar/envia leads a partir de `leads`, resolver Twilio por `tenant_id` e finalizar campanhas com `encerrada`
**Regra pratica:** Quando houver reset operacional ou transicao de modelo, o runtime de campanhas precisa refletir exatamente o schema ativo do banco; manter referencia a tabela legado e uma fonte comum de bug silencioso

### 67. Webhook e automacao Twilio precisam rotear por tenant a partir do numero WhatsApp de destino
**Problema:** Mesmo com credenciais Twilio por tenant, inbound webhook, resposta manual e automacao do agente ainda podiam ler `configuracoes` globais ou validar assinatura com token incorreto
**Causa:** O envio multi-tenant foi centralizado antes do recebimento e da automacao; faltava usar o numero WhatsApp do tenant como ancora de roteamento para webhook, conversa, notificacao e prompt do agente
**Correcao aplicada:** Expandir `src/lib/twilio.ts` com routing por numero WhatsApp, gravar `tenant_id` em `mensagens_inbound` e `notificacoes`, filtrar/upsert `conversas` por tenant e fazer `src/app/api/agente/responder/route.ts` e `src/app/api/webhooks/twilio*/route.ts` lerem `configuracoes`/auth no contexto do tenant certo
**Regra pratica:** No PrevLegal multi-tenant, o numero Twilio do escritorio e a chave de roteamento do inbound; qualquer webhook ou automacao que ignore isso corre risco de quebrar assinatura, notificar o lugar errado ou vazar contexto entre escritorios

### 68. O lead precisa permitir abordagem ativa sem depender de conversa previa
**Problema:** O detalhe do lead ja ajudava a abrir uma thread existente, mas nao permitia ao advogado iniciar um contato manual quando ainda nao havia conversa aberta
**Causa:** O fluxo operacional estava centrado na `Caixa de Entrada` como lugar de resposta, nao como ponto unico de criacao da conversa
**Correcao aplicada:** Adicionar um fluxo de `Iniciar conversa` no detalhe do lead e no drawer, com modal de primeira mensagem e backend dedicado em `src/app/api/leads/[id]/iniciar-conversa/route.ts` para criar/assumir a thread humana, enviar a mensagem inicial e redirecionar para a inbox na thread correta
**Regra pratica:** No PrevLegal, o lead detail nao deve ser apenas leitura; se o operador decidiu agir sobre um lead especifico, ele precisa conseguir iniciar a conversa dali mesmo, sem friccao e sem depender de thread preexistente

### 59. A lista tecnica de cadastro manual nao deve disputar espaco com listas importadas
**Problema:** O agrupador tecnico `Cadastro manual` aparecia na aba de listas como se fosse uma importacao operacional, poluindo a leitura do escritorio
**Causa:** A API de listas retornava indiscriminadamente todas as `listas`, inclusive a lista interna criada para suportar leads avulsos
**Correcao aplicada:** Excluir a lista tecnica da listagem padrao e orientar na UI que cadastros manuais ficam agrupados no Kanban de Leads
**Regra pratica:** Estruturas tecnicas de apoio nao devem aparecer na mesma camada visual das entidades operacionais do usuario final

### 60. Exclusao de lista precisa existir na plataforma para corrigir importacao ruim sem SQL manual
**Problema:** Quando uma lista foi importada de forma errada, nao havia como removê-la pela plataforma
**Causa:** Faltava endpoint de exclusao e acao na UI
**Correcao aplicada:** Criar `DELETE /api/listas/[id]` para excluir a lista importada e os leads vinculados, com escopo por tenant e bloqueio da lista tecnica manual
**Regra pratica:** Fluxos de importacao precisam ter um caminho de reversao operacional dentro do produto, sem depender de acesso ao banco

### 61. Tema claro/escuro funciona melhor quando nasce das variaveis globais, nao de ajustes isolados por tela
**Problema:** O dashboard inteiro operava apenas em modo escuro
**Causa:** As telas dependiam de variaveis CSS globais, mas so existia uma paleta
**Correcao aplicada:** Criar paletas `dark` e `light` em `globals.css`, inicializacao no `RootLayout` via `data-theme` e um toggle persistido em `localStorage`
**Regra pratica:** Quando a UI ja usa CSS vars de tema, a forma menos invasiva de adicionar modo claro/escuro e trocar as variaveis globais, nao reescrever componente por componente
