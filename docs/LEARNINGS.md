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

### 36. Documento IA não pode contornar o contrato do módulo de documentos
**Problema:** Ao gerar `Petição Inicial`, `Procuração` ou `Requerimento INSS`, o backend falhava com `null value in column "arquivo_url" of relation "lead_documentos" violates not-null constraint`
**Causa:** A geração por IA salvava apenas `conteudo_texto` em `lead_documentos`, mas a tabela foi desenhada para sempre ter arquivo persistido e `arquivo_url`
**Correção:** Fazer a geração IA subir um `.txt` real no bucket `lead-documentos`, gerar URL assinada e só então inserir o registro completo com metadados de arquivo, `tenant_id` e `created_by`
**Regra pratica:** No PrevLegal, features beta não devem criar um “subtipo informal” de documento fora do contrato principal de `lead_documentos`; se entra na mesma tabela, precisa obedecer o mesmo padrão de storage/metadados

### 37. Template de automação precisa nascer editável e explicável
**Problema:** O seed dos gatilhos funcionava, mas a operação ficava sem botão de editar e com pouca clareza sobre o que cada template realmente faria
**Causa:** O foco inicial foi colocar a Fase E para rodar no banco e no orquestrador, deixando a superfície de ajuste ainda crua
**Correção:** Reaproveitar a mesma UI de gatilhos para permitir edição dos templates padrão e adicionar leitura humana do disparo, da ação e do motivo operacional de cada status
**Regra pratica:** Template no PrevLegal deve ser “atalho configurável”, não “preset travado”. Sempre expor:
- quando dispara
- o que executa
- e um resumo em linguagem operacional

### 38. Reativação por status `lost` não pode herdar a regra antiga de stop por `lost`
**Problema:** O template novo `lost -> follow-up/reativação` chegava a criar `followup_runs`, mas o worker ainda carregava a regra antiga que parava runs quando o lead estivesse `lost`
**Causa:** O motor de follow-up foi criado antes da Fase E de gatilhos por status. Na lógica antiga, `lost` significava encerrar tudo; na nova lógica, `lost` pode ser exatamente o gatilho para reativar
**Correção:** Remover `lost` das stop conditions automáticas do worker e manter stop automático apenas para `converted`
**Regra pratica:** Quando um status passa a virar gatilho de automação, ele não pode continuar tratado globalmente como motivo obrigatório de parada no worker

### 39. Teste de automação precisa ter confirmação visual no detalhe do lead
**Problema:** O operador pode mudar o status do lead e não perceber que o `followup_run` foi criado, concluindo erroneamente que a automação falhou
**Causa:** O componente `FollowupLead` buscava dados apenas no mount e não se atualizava após mudança de status na mesma tela
**Correção:** Adicionar atualização periódica, refresh ao voltar foco para a aba e botão explícito de atualizar
**Regra pratica:** Toda automação testável no PrevLegal deve ter algum feedback visível de curto prazo na própria tela operacional, sem depender de reload manual

### 40. Validação de follow-up não deve depender exclusivamente do cron
**Problema:** Mesmo com a run criada corretamente, a equipe ainda ficava bloqueada para validar o disparo do próximo passo se o cron não estivesse imediatamente acessível ou se a regra estivesse com delay longo
**Causa:** A engine tinha worker e cron, mas não havia uma ação operacional controlada para executar o passo atual sob demanda
**Correção:** Adicionar ação manual `executar_agora` na run do lead, reaproveitando a mesma engine de envio e registrando `step_disparado` ou `step_falhou` em `followup_events`
**Regra pratica:** Em fluxos automatizados críticos, além do cron, vale ter um caminho manual autenticado para validação e suporte operacional, desde que ele use a mesma lógica do runtime real

### 41. Evento de falha precisa mostrar o motivo, não só o tipo
**Problema:** A UI do follow-up mostrava apenas `Envio falhou`, o que ainda obrigava investigação técnica para descobrir se o problema era telefone ausente, canal desconectado ou erro externo
**Causa:** O backend já gravava `metadata.erro` em `followup_events`, mas o endpoint do lead não retornava esse campo e o componente não o renderizava
**Correção:** Expor `metadata` no `GET /api/leads/[id]/followup` e mostrar o motivo logo abaixo do evento no histórico
**Regra pratica:** Quando o sistema já conhece a causa da falha, a UI operacional deve exibi-la no próprio contexto da execução

### 42. Importador não pode ficar preso à ordem fixa das colunas quando a fonte já traz cabeçalhos
**Problema:** O import atual só funcionava bem para a planilha clássica lida por índice fixo, o que quebraria com fornecedores diferentes, CSVs em outra ordem e planilhas geradas por outras ferramentas
**Causa:** `src/app/api/import/route.ts` estava acoplado ao layout `NOMES_RJ_BNG.xlsx`, assumindo posição fixa para cada campo
**Correção:** Criar uma camada `src/lib/import-schema.ts` para detectar cabeçalhos reconhecíveis e mapear campos canônicos automaticamente, mantendo fallback para o layout legado
**Regra pratica:** Em importação operacional, a ordem externa das colunas deve ser flexível sempre que os cabeçalhos forem bons; o sistema deve padronizar o modelo interno, não exigir a mesma planilha externa

### 43. Fontes sem `NB` são uma nova fase de produto, não um detalhe do import atual
**Problema:** Fontes como Google Maps / Places e listas comerciais B2B podem não trazer `NB`, mesmo contendo bons dados de prospecção
**Causa:** O core atual de `leads` e da importação ainda é orientado ao modelo previdenciário clássico, com `NB` como âncora importante de deduplicação/identidade
**Correção:** Formalizar em `docs/IMPORTADOR_INTELIGENTE_PLAN.md` que o importador atual resolve variedade de layout, mas a entrada de fontes sem `NB` exige uma Fase 2 com staging, templates de importação e confirmação de mapeamento
**Regra pratica:** Quando a nova fonte muda o modelo de identidade do lead, isso deve virar evolução explícita de arquitetura, não gambiarra no parser existente

### 44. Agendamento precisa separar criador, responsável e dono do calendário
**Problema:** Em operação real de escritório, uma secretária pode criar um agendamento para outro advogado, mas o evento não deve necessariamente nascer no Google do admin/secretária
**Causa:** A integração inicial com Google Calendar era singleton por tenant em `configuracoes.google_calendar_token`, o que misturava quem agenda com quem realmente atende
**Correção:** Evoluir a integração para conexão por usuário com fallback do escritório e registrar no agendamento quem foi o `calendar_owner`
**Regra pratica:** No PrevLegal, `quem criou`, `quem é o responsável` e `em qual calendário o evento foi salvo` são conceitos diferentes e devem ser modelados separadamente

### 33. Expansao de produto precisa entrar por arquitetura de portfólio, nao por mistura de narrativas
**Problema:** Novas oportunidades reais, como `PrevGlobal`, CNIS com IA e modulos tecnicos premium, podem comecar a competir com o core operacional do PrevLegal se entrarem sem separacao clara
**Causa:** O produto cresceu alem da ideia inicial e abriu adjacencias fortes, mas isso aumenta o risco de descaracterizar a oferta principal
**Correção:** Formalizar uma arquitetura de portfólio com tres camadas:
- `PrevLegal Core`
- adjacencias operacionais
- modulos premium
**Regra pratica:** Novas frentes devem se conectar ao core, nao reescrever sua identidade. Sempre classificar a iniciativa como `core`, `adjacencia` ou `modulo premium` antes de executar

### 34. Portal mobile precisa sair de leitura passiva para ação útil do cliente
**Problema:** Um portal que só mostra status e mensagens ainda força o cliente a voltar para WhatsApp ou canais paralelos quando precisa mandar documentos
**Causa:** O mobile-first do portal estava evoluindo a leitura do caso, mas ainda sem uma ação operacional central para o cliente/familiar
**Correção:** Permitir upload de documento direto na aba `Documentos` do portal, com reflexo em pendências, timeline e notificações internas
**Regra pratica:** Toda fase do mobile do cliente deve adicionar pelo menos uma ação útil do usuário final, e não apenas mais visualização

### 35. Remarcação pelo portal deve sinalizar intenção, não mudar a agenda automaticamente
**Problema:** O cliente precisa pedir remarcação pelo app, mas alterar o horário sem mediação humana pode bagunçar a operação do escritório
**Causa:** O portal é uma superfície de cliente/familiar, enquanto a agenda operacional continua sendo responsabilidade da equipe
**Correção:** Criar um fluxo de `pedido de remarcação` que registra motivo e sugestão, alimenta timeline/notificação e mantém o time humano no controle da agenda
**Regra pratica:** No mobile do cliente, ações com impacto operacional forte devem entrar primeiro como `pedido` ou `sinalização`, e só depois como automação total

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

### 33. Identidade persistente do portal pode nascer como ponte segura antes de virar auth completa
**Problema:** O portal do cliente funcionava só com `portal_token`, o que bastava para o piloto, mas não distinguia cliente, familiar e cuidador nem registrava quem acessou o caso
**Correção:** Criar `portal_users` + `portal_access_links` e tratar o primeiro link persistente como ponte controlada para o portal atual
**Padrão aplicado:** o link individual registra uso, atualiza `ultimo_acesso_em` e redireciona para `/portal/[portal_token]`
**Regra prática:** Antes de abrir uma auth completa de cliente, vale criar uma camada de identidade observável e tenant-aware para aprender quem acessa o portal sem duplicar cedo demais a superfície de login

### 34. O portal do cliente pode ganhar sessão real sem herdar a auth do backoffice
**Problema:** O link persistente resolvia identidade, mas o app ainda não mantinha sessão do cliente/familiar dentro do portal
**Correção:** Criar `portal_sessions` e fazer `/portal/acesso/[token]` gerar um cookie httpOnly próprio do portal
**Padrão aplicado:** sessão separada do app interno, ligada a `portal_user`, `lead` e `tenant`, com logout próprio e fallback seguro se a foundation ainda não existir
**Regra prática:** No PrevLegal, auth do portal do cliente deve ser uma trilha própria e mais leve, sem misturar sessão de cliente/familiar com sessão do operador interno
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

### 37. Camada de provider WhatsApp precisa nascer com fallback para o legado
**Problema:** O produto precisa suportar Z-API e multiplos numeros por escritorio, mas o runtime atual ainda depende do modelo Twilio unico por tenant/env
**Risco:** Se a aplicacao passar a depender de tabela nova antes da migration/base estarem prontas, o envio quebra em producao
**Correcao:** Criar `src/lib/whatsapp-provider.ts` com resolucao em duas camadas:
- primeiro tenta `whatsapp_numbers`
- se a tabela nao existir ou nao houver numero ativo, faz fallback para `getTwilioCredentialsByTenantId`
**Regra pratica:** Em transicoes de arquitetura no PrevLegal, a camada nova precisa conviver com o legado ate a base operacional estar populada

### 38. Suporte a multiplos numeros deve entrar antes de acoplar Z-API direto nos fluxos
**Problema:** Z-API e campanhas sugerem encaixar mais um provider rapidamente, mas o produto ja aponta para o cenario de um escritorio operar mais de um numero de prospeccao
**Risco:** Integrar Z-API direto nas rotas atuais geraria retrabalho quando entrasse o segundo numero do mesmo tenant
**Correcao:** Modelar `whatsapp_numbers` por tenant com `provider`, credenciais e `is_default`, e deixar campanhas/conversas prontas para futuramente apontar para `whatsapp_number_id`
**Regra pratica:** Quando um integrador novo chega junto com necessidade de roteamento por origem, modelar primeiro o canal, depois o provider

### 39. Sender global errado pode mascarar bug como falha de produto
**Problema:** O fluxo de `Iniciar conversa` saiu do erro de numero invalido e passou para `Twilio could not find a Channel with the specified From address`
**Causa:** O `Account SID` e o `Auth Token` eram os mesmos entre local e producao, mas o `TWILIO_WHATSAPP_NUMBER` em producao apontava para um sender diferente do sandbox valido
**Correcao:** Aplicar a migration `032`, registrar o primeiro canal em `whatsapp_numbers` e sincronizar o tenant `Fluxrow` com `whatsapp:+14155238886` como origem default
**Regra pratica:** Quando o erro do provider aponta para `From address`, validar primeiro o sender configurado antes de concluir que o fluxo do produto quebrou

### 40. O “app do cliente” precisa de manifesto proprio por portal, nao do manifest global da plataforma
**Problema:** O projeto ja tinha `public/manifest.json`, mas ele foi desenhado para o app interno e apontava para `/dashboard`
**Causa:** A frente mobile do cliente nasceu depois da plataforma interna e exige `start_url` contextualizado por token/caso
**Correcao:** Criar manifesto dinamico em `GET /api/portal/manifest/[token]` e ligá-lo ao layout de `/portal/[token]`
**Regra pratica:** Quando a experiencia PWA nasce de uma superficie contextualizada por token, o manifesto precisa apontar para essa superficie, nao para um dashboard generico

### 41. Installability pode entrar antes da estrategia de cache offline completa
**Problema:** O portal precisava ficar instalavel no celular sem abrir agora uma frente grande de offline/cache
**Causa:** Esperar uma estrategia completa de cache atrasaria a validacao de uso real do “app” com clientes
**Correcao:** Registrar um `service worker` leve em `public/sw.js` e mostrar o CTA `Instalar app` no proprio portal
**Regra pratica:** Em MVPs mobile do PrevLegal, primeiro habilitar installability e validar uso; cache/offline avancado entra depois

### 87. O backlog mobile precisa nascer do portal real, nao de uma ideia abstrata de app
**Problema:** Planejar “app mobile” sem olhar o portal atual levaria a duplicar superficie e ignorar debitos reais do produto
**Causa:** O PrevLegal ja possui uma base funcional em `src/app/portal/[token]/page.tsx` e `src/app/api/portal/[token]/route.ts`, mas com limitacoes concretas como branding hardcoded e acesso apenas por token
**Correcao:** Formalizar a direcao `portal mobile-first -> PWA -> identidade persistente -> nativo se justificar` e transformar isso em backlog tecnico canônico em `docs/MOBILE_CLIENT_APP_BACKLOG.md`
**Regra pratica:** Em novas frentes de produto no PrevLegal, o primeiro backlog deve partir do estado real do codigo e dos debitos atuais, nao de uma superficie idealizada

### 88. O portal atual ainda nao e uma base multi-tenant pronta para virar app do cliente
**Problema:** O portal parecia reutilizavel como app do cliente, mas a leitura do codigo mostrou dependencias fixas de escritorio e payload restrito
**Causa:** `src/app/portal/[token]/page.tsx` ainda exibe `Alexandrini Advogados`, telefone fixo e dominio fixo, enquanto `GET /api/portal/[token]` ainda retorna so lead basico, documentos compartilhados e mensagens
**Correcao:** Registrar como debito de Fase 1:
- remover branding hardcoded
- ampliar o payload do portal
- expor agenda/Meet e pendencias de documento
**Regra pratica:** Antes de chamar uma superficie de “base do app”, validar se branding, auth e payload ja estao prontos para tenant-awareness e uso recorrente

### 89. A primeira evolucao do app do cliente deve trocar branding fixo por branding dinamico antes de qualquer “novo app”
**Problema:** Mesmo com a estrategia certa de `portal mobile-first`, o cliente ainda via `Alexandrini Advogados` hardcoded no header, nas mensagens e no footer
**Causa:** `src/app/portal/[token]/page.tsx` estava acoplada ao piloto inicial e `GET /api/portal/[token]` nao devolvia dados de tenant/configuracao para o front
**Correcao:** Expandir `GET /api/portal/[token]` para devolver `branding`, `proximo_agendamento` e `resumo`, e fazer a pagina do portal consumir `configuracoes` + `tenants` em vez de texto fixo
**Regra pratica:** Em superficies cliente-facing do PrevLegal, o primeiro passo para virar produto e remover hardcode de escritorio e passar a ler branding/contato do tenant correto

### 40. Funil executivo so fecha o ciclo quando a tela de leads tambem aceita filtro por URL
**Problema:** O pipeline em `/relatorios` e os cards do dashboard ja apontavam para filas reais de inbox, agenda e financeiro, mas o kanban de leads continuava abrindo sempre sem recorte
**Causa:** `/leads` era renderizada sem ler `searchParams`, entao o produto perdia contexto ao sair dos cards-resumo e voltar para o funil comercial
**Correcao:** Fazer `/leads` aceitar `?status=` no servidor, aplicar o filtro direto na query e expor faixa de filtro ativo + chips de status na UI
**Regra pratica:** Quando uma métrica ou card executivo representa uma etapa do funil, a tela de destino precisa abrir ja no recorte operacional correspondente

### 41. Sidebar retraida so funciona bem quando respeita a capacidade real de hover do dispositivo
**Problema:** Recolher a navegação lateral pode abrir muito espaço útil, mas em touch isso vira fricção e pode esconder o produto
**Causa:** O comportamento de hover não existe do mesmo jeito em touchscreens, então colapsar a sidebar indiscriminadamente pioraria a navegação
**Correcao:** Ativar auto-retracao apenas quando `matchMedia('(hover: hover) and (pointer: fine)')` for verdadeiro, mantendo a sidebar expandida em dispositivos sem hover fino
**Regra pratica:** Otimizacoes de densidade visual que dependem de hover precisam degradar com segurança em telas touch

### 42. App mobile do cliente deve nascer como evolucao do portal, nao como produto paralelo
**Problema:** Começar direto com app nativo parece atraente, mas abre uma segunda frente técnica antes de validar o modelo de uso do cliente/familiar
**Causa:** O PrevLegal já possui portal, mensagens, documentos e agenda; criar um app separado cedo demais duplicaria superfície e regras de negócio
**Correcao:** Definir a direção oficial como `portal mobile-first -> PWA -> identidade persistente -> nativo só se justificar`
**Regra pratica:** Quando a base web já entrega o fluxo principal do cliente, a primeira versão mobile deve reaproveitar essa superfície antes de abrir uma stack nativa própria

### 40. Saúde do tenant no admin só serve para decisão quando as métricas são recortadas pelo tenant certo
**Problema:** O detalhe do tenant no admin podia exibir leituras operacionais convincentes, mas parte das contagens ainda não filtrava por `tenant_id`
**Risco:** A tela parecia executiva, mas podia induzir leitura errada de adoção, volume e risco de um escritório específico
**Correção:** Reescrever `GET /api/admin/tenants/[id]/metricas` para filtrar por `tenant_id`, adicionar sinais de saúde recentes (`usuariosAtivos7d`, `conversas7d`, `agendamentosPendentes`, `ultimoAcessoEquipe`) e resumir o risco operacional na própria UI
**Regra prática:** No PrevLegal, qualquer métrica administrativa só deve virar badge, resumo ou diagnóstico quando estiver claramente `tenant-aware` e operacionalmente acionável

### 41. Financeiro previsível exige recorte tenant-aware antes de qualquer “inteligência”
**Problema:** Contratos e parcelas já alimentavam um dashboard útil, mas updates sensíveis ainda não confirmavam pertença ao tenant atual e a leitura financeira era quase toda retrovisora
**Risco:** O módulo podia parecer maduro na superfície enquanto ainda deixava espaço para leitura cruzada e pouca orientação de curto prazo
**Correção:** Endurecer `GET/POST/PATCH/DELETE` do bloco financeiro com validação de vínculo ao lead do tenant atual e adicionar sinais simples de previsão (`previsto7d`, `previsto30d`, `recebivelAberto`, `ticketMedioContrato`, `riscoFinanceiro`, `proximasParcelas`) no resumo
**Regra prática:** No PrevLegal, previsibilidade financeira só vale quando nasce do mesmo recorte tenant-aware que protege a operação; primeiro segurança do dado, depois “inteligência”

### 42. Pipeline financeiro fica muito mais acionável quando expõe origem comercial, não só recebimento
**Problema:** Mesmo com previsão de caixa, o financeiro ainda dizia “quanto” sem dizer “de onde veio” a carteira que está sustentando esse caixa
**Risco:** Fica difícil decidir se a operação está saudável por campanha, por lista ou por ação manual, e o time perde a ponte entre comercial e receita
**Correção:** Cruzar contratos com `leads.campanha_id`, `leads.lista_id` e presença de `agendamentos`, expondo no dashboard a origem comercial da carteira e os contratos que já passaram por agendamento
**Regra prática:** No PrevLegal, toda leitura de receita que influencia operação deve apontar para a origem comercial que a gerou

### 40. Inbox WhatsApp nao pode ecoar outbound como se fosse resposta real
**Problema:** Ao enviar uma mensagem manual pelo lead/inbox, a thread mostrava a mesma mensagem dos dois lados mesmo sem o lead responder
**Causa:** O registro outbound estava sendo lido da tabela `mensagens_inbound`, e a UI da inbox sempre renderizava a bolha da esquerda antes de renderizar `resposta_agente`
**Correcao:** Tratar como outbound os registros cujo `telefone_destinatario` bate com o telefone da conversa e renderizar apenas a bolha da direita nesses casos
**Regra pratica:** Enquanto o historico WhatsApp ainda misturar eventos inbound e outbound na mesma origem, a UI precisa distinguir direcao pelo par `telefone_remetente`/`telefone_destinatario`, nao so pelos flags de resposta

### 41. Send box da inbox precisa mostrar erro real do provider
**Problema:** O operador podia clicar em enviar, ver a thread atualizada e concluir que a mensagem saiu mesmo quando o provider falhava depois
**Causa:** O front da inbox limpava o texto e recarregava a conversa sem verificar `res.ok`
**Correcao:** O composer da inbox agora preserva o texto em falha e mostra a mensagem de erro retornada pela API
**Regra pratica:** Em fluxos operacionais do PrevLegal, nunca tratar tentativa de envio como sucesso sem validar explicitamente a resposta HTTP

### 42. Cadastro de canais WhatsApp por tenant precisa sincronizar com o legado durante a transicao
**Problema:** A nova camada `whatsapp_numbers` convive com partes do runtime que ainda consultam `tenants.twilio_*`
**Risco:** Cadastrar ou trocar o canal padrao no admin e deixar os campos legado desatualizados criaria comportamento incoerente entre envio, webhook e fallback
**Correcao:** O admin agora gerencia canais em `/api/admin/tenants/[id]/whatsapp-numbers*` e, sempre que um canal `Twilio` ativo/padrao muda, sincroniza `twilio_account_sid`, `twilio_auth_token` e `twilio_whatsapp_number` no `tenant`
**Regra pratica:** Em migracoes de integracao, a UI nova deve atualizar a fonte canônica nova e manter a fonte legada coerente ate o corte definitivo
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

### 69. Runtime de WhatsApp precisa normalizar telefone visual antes de enviar ao provider
**Problema:** O fluxo `Iniciar conversa` falhou com `The 'To' number whatsapp:(41) 99236-1868 is not a valid phone number`
**Causa:** O lead guardava telefone em formato humano e o runtime repassava esse valor cru ao provider
**Correcao aplicada:** Centralizar no `sendWhatsApp` a normalizacao do destinatario para E.164 brasileiro, aceitando formatos como `(41) 99236-1868`, `41992361868` e `+5541992361868`
**Regra pratica:** No PrevLegal, todo envio WhatsApp deve normalizar o numero no backend; nao confiar que o cadastro do lead ja esta no formato tecnico correto

### 70. Numero novo em provider nao-oficial precisa de warm-up enforce no backend, nao apenas “boa vontade” operacional
**Problema:** O produto ja tinha delays, lotes e limite diario, mas os defaults (`500/dia`, lote `50`, pausa `30s`, delay `1.5s-3.5s`) ainda permitiam blast agressivo demais para um numero novo de `Z-API`
**Causa:** Os freios existentes foram pensados para um sender mais estabelecido e nao havia politica de warm-up por canal
**Correcao aplicada:** Criar `src/lib/whatsapp-warmup.ts`, ler `metadata.warmup_*` do canal em `whatsapp_numbers`, clampando campanhas na criacao e no disparo com caps conservadores (`15/dia`, lote `5`, pausa `600s`, delay `60s-180s`)
**Regra pratica:** Se o canal estiver em warm-up, o backend deve impor caps conservadores automaticamente; isso nao pode depender de o operador lembrar de baixar os numeros manualmente

### 71. Canais WhatsApp precisam aceitar estado de rascunho antes de ficarem ativos
**Problema:** O schema de `whatsapp_numbers` exigia credenciais completas mesmo para canais ainda nao plugados, o que impedia registrar hoje um numero de amanha sem usar placeholder feio
**Causa:** As constraints iniciais de `032` validavam credenciais por provider sem considerar se o canal estava `ativo`
**Correcao aplicada:** A migration `033_whatsapp_warmup_and_drafts.sql` relaxa as constraints para exigir credenciais apenas quando o canal esta ativo, e as rotas admin passaram a aceitar `Twilio`/`Z-API` pausados como rascunho
**Regra pratica:** No PrevLegal, um canal WhatsApp pode existir em modo rascunho/inativo antes das credenciais finais; ativacao e que deve exigir completude tecnica

### 72. O lead detail nao pode ser so consulta; ele precisa permitir enriquecimento operacional do cadastro
**Problema:** O advogado conseguia ver o lead e conversar com ele, mas nao conseguia corrigir ou complementar os dados quando o cliente trazia novas informacoes no meio do atendimento
**Causa:** O detalhe do lead e o drawer tinham apenas leitura, e a API do lead expunha `GET` sem rota de atualizacao
**Correcao aplicada:** Criar `PATCH /api/leads/[id]` com whitelist de campos editaveis e adicionar o CTA `Editar dados` no detalhe e no drawer usando um modal compartilhado
**Regra pratica:** No PrevLegal, qualquer superficie operacional que concentra contexto do lead tambem deve permitir editar o cadastro basico; obrigar nova importacao ou SQL para complementar dados mata autonomia do operador

### 73. Inbox humana vira operacao de verdade quando conversa tem estado, ownership e reabertura automatica
**Problema:** A `Caixa de Entrada` ja permitia assumir uma conversa, mas ainda tratava quase tudo como binario entre `agente` e `humano`, sem fila operacional real
**Causa:** A UI ignorava parte do potencial da modelagem (`assumido_por`, `assumido_em`) e o webhook inbound nao sabia reabrir threads que estavam aguardando cliente ou resolvidas
**Correcao aplicada:** Expandir a inbox com estados `aguardando_cliente` e `resolvido`, usar `assumido_em` na leitura operacional, sanitizar `PATCH /api/conversas/[id]` com acoes explicitas (`assume`, `awaiting_customer`, `resolve`, `reopen`, `return_to_agent`, `mark_read`) e fazer o webhook Twilio reabrir para `humano` quando o cliente responde nessas filas
**Regra pratica:** No PrevLegal, fila humana nao pode ser apenas um badge; conversa assumida precisa ter ownership explicito, estados operacionais claros e reabertura automatica quando o cliente volta a falar

### 74. Agendamentos operacionais precisam ser fila de trabalho, nao apenas agenda cronologica
**Problema:** A tela de `Agendamentos` mostrava os eventos em ordem temporal, mas faltava leitura de operacao: o que ainda precisa confirmar, o que ja esta validado e quem e o responsavel atual
**Causa:** A UI tratava quase tudo como `agendado`/`realizado`/`cancelado`, e a API de update ainda nao reforcava tenant/access nem usava o enum completo (`confirmado`, `remarcado`)
**Correcao aplicada:** Transformar a tela em fila operacional com secoes (`Fila que precisa confirmacao`, `Confirmados`, `Historico recente`), quick actions de `confirmar`, `remarcar`, `realizado` e `cancelar`, reatribuicao de responsavel para admin e endurecimento de `PATCH/DELETE /api/agendamentos/[id]` com `tenant_id`, validacao de acesso e sincronizacao do status do lead
**Regra pratica:** No PrevLegal, agendamento gerado pelo agente precisa virar tarefa operacional com dono e proxima acao explicita; mostrar apenas a data da reuniao nao basta para a equipe executar bem

### 75. Saude do tenant no admin so serve para tomada de decisao quando as metricas estao filtradas pelo tenant certo
**Problema:** O detalhe do tenant no admin exibia sinais de uso, mas a rota de metricas ainda fazia varias contagens sem ancora explicita em `tenant_id`, o que fragilizava a leitura executiva
**Causa:** O painel cresceu primeiro como visao de produto e so depois virou ferramenta operacional de CS/comercial; faltava endurecer o recorte por tenant e adicionar sinais mais proximos de adocao real
**Correcao aplicada:** Reancorar `src/app/api/admin/tenants/[id]/metricas/route.ts` em `tenant_id` para leads, conversas, campanhas, contratos, portal, agendamentos e usuarios; adicionar `ultimoAcessoEquipe`, `usuariosAtivos7d`, `conversas7d`, `agendamentosPendentes`, `riscoOperacional` e `resumoSaude`; e expor isso em `src/app/admin/[id]/page.tsx`
**Regra pratica:** No PrevLegal, dashboard executivo sem filtro tenant-aware vira uma falsa sensação de controle; metrica de saúde precisa refletir uso real do escritório e não ruído global da base

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

### 76. Agendamento manual pode falhar como descoberta de produto mesmo quando a API ja existe
**Problema:** O sistema parecia so permitir agendamento criado pelo agente, porque a interface nao oferecia CTA humano para marcar consulta manualmente
**Causa:** `POST /api/agendamentos` ja existia, mas a tela de agendamentos e o contexto do lead nao expunham esse fluxo
**Correcao aplicada:** Criar um modal unico de `Novo agendamento` e plugar o CTA em:
- `/agendamentos`
- detalhe do lead
- `lead drawer`
**Regra pratica:** Se a operacao humana precisa executar uma acao obvia depois da qualificacao, a capacidade nao pode ficar escondida so na API ou em automacao do agente

### 77. Agendamentos precisam nascer tenant-aware, nao apenas serem editados tenant-aware
**Problema:** A manutencao de agendamentos ja validava `tenant_id`, mas a criacao e a listagem ainda deixavam margem para leitura/insercao menos canonica
**Causa:** A rota `POST /api/agendamentos` foi criada antes do endurecimento multi-tenant mais recente
**Correcao aplicada:** `GET /api/agendamentos` passou a filtrar explicitamente por `tenant_id`, e `POST /api/agendamentos` agora:
- valida o lead dentro do tenant atual
- valida o usuario responsavel dentro do tenant atual
- insere `tenant_id` no novo agendamento
**Regra pratica:** Em transicoes para multi-tenant real, nao basta endurecer update/delete; a criacao e a listagem inicial tambem precisam carregar o escopo canonico

### 78. Busca operacional nao pode esconder lead valido por filtro booleano estrito demais
**Problema:** No modal de agendamento manual, o operador digitava nome ou telefone corretamente e nao encontrava o lead
**Causa:** A busca curta filtrava com `lgpd_optout = false`, entao leads com valor nulo nesse campo sumiam da lista mesmo sendo operacionalmente validos
**Correcao aplicada:** Trocar o filtro para `lgpd_optout != true` e reforcar a UX do modal com busca reativa + botao explicito `Buscar lead`
**Regra pratica:** Em fluxos de busca operacional do PrevLegal, filtros booleanos devem tratar `null` como estado legivel quando esse valor ainda e comum na base

### 79. Convite de reuniao precisa aceitar email operacional do momento, nao so o email historico do lead
**Problema:** O lead pode avancar na conversa usando um email diferente do cadastro original, e o operador ficava preso ao email antigo na hora de marcar a consulta
**Causa:** O agendamento reutilizava apenas `lead.email` para o Google Calendar
**Correcao aplicada:** O modal manual ganhou o campo `E-mail da reunião`, e `POST /api/agendamentos` agora aceita `email_reuniao` para sobrescrever o `emailLead` enviado ao Google Calendar
**Regra pratica:** No PrevLegal, dados de contato usados para operacionalizar a proxima acao precisam aceitar override humano quando a conversa trouxer informacao mais atual do que a base

### 80. Agendamento vira muito mais legivel quando combina fila operacional com calendario visual
**Problema:** Mesmo com a fila de confirmacao/remarcacao melhorada, a tela de agendamentos ainda exigia leitura linear demais para quem pensa em agenda como bloco visual de tempo
**Causa:** A UI tinha uma boa camada operacional, mas faltava a representacao espacial do mes que usuarios acostumados ao Google Calendar esperam
**Correcao aplicada:** Adicionar uma visao mensal na propria tela `/agendamentos`, com cores por status e clique no evento para abrir um painel/modal com as mesmas acoes operacionais da fila
**Regra pratica:** No PrevLegal, agenda nao deve ser so lista de tarefas nem so calendario bonito; a melhor UX combina leitura temporal visual com acoes diretas de operacao

### 81. Busca operacional de lead fica mais confiavel quando a normalizacao sai do PostgREST e vai para o servidor
**Problema:** Mesmo digitando nome ou telefone corretamente, o modal de agendamento ainda podia nao encontrar o lead
**Causa:** A busca curta dependia de `or(...)` com `ilike` no PostgREST, o que fica frágil com telefone formatado, acentos e combinacoes com `null`
**Correcao aplicada:** Buscar um conjunto curto tenant-aware no banco e filtrar no servidor com normalizacao de texto e digitos de telefone antes de devolver os resultados
**Regra pratica:** Em buscas operacionais pequenas do PrevLegal, confiabilidade vale mais do que “query esperta”; quando o matching ficar frágil demais no SQL, normalize no servidor e devolva um resultado mais previsível

### 82. Picker de lead para agendamento nao deve depender nem de email nem do dono atual do lead
**Problema:** No modal de agendamento manual, o operador podia digitar o nome certo e ainda assim nao ver o lead para selecionar
**Causa:** O problema nao era falta de email; o gargalo estava na combinacao de duas coisas: a busca curta continuava sensivel ao escopo do usuario e o picker ainda dependia demais de um fluxo de selecao mais fragil
**Correcao aplicada:** Tornar `GET /api/leads` explicitamente tenant-aware com `scope=scheduling`, remover a restricao por `responsavel_id` nesse escopo, endurecer `/api/busca` com `tenant_id` explicito e trocar o select nativo do modal por uma lista clicavel que mescla resultados das duas rotas
**Regra pratica:** Em fluxo operacional de agenda, o usuario precisa encontrar rapidamente qualquer lead relevante do tenant; email pode ajudar no convite, mas nunca pode ser precondicao invisivel para o lead aparecer no picker

### 83. Busca digitada nao pode depender de coluna que ainda nao existe no schema operacional
**Problema:** No modal global de `Novo agendamento`, clicar no campo mostrava alguns leads, mas digitar o nome fazia a busca falhar
**Causa:** `GET /api/leads` ainda montava o filtro `email.ilike...` quando havia texto digitado, mas `leads.email` ainda nao existe no schema operacional atual
**Correcao aplicada:** Remover `email.ilike` da busca curta e alinhar o recorte tenant-aware de superfícies relacionadas (`tenant-context`, tela de leads, relatórios e portal threads)
**Regra pratica:** Antes de enriquecer uma busca operacional com novos campos, confirmar que o schema remoto realmente contem essas colunas; se o schema ainda nao estiver alinhado, a busca deve degradar de forma segura em vez de quebrar so quando o usuario digita

### 84. Status do lead sozinho nao conta o pipeline real da operacao
**Problema:** O produto ja tinha lead, conversa, inbox humana, agendamento e contrato, mas a leitura executiva ainda ficava fragmentada e dependente demais do `status` do lead
**Causa:** Cada modulo cresceu bem isoladamente, mas faltava uma camada que unificasse o funil operacional completo
**Correcao aplicada:** Adicionar em `/api/relatorios` um `pipelineOperacional` que cruza conversas, fila humana, agendamentos e contratos por `lead_id`, e expor isso na aba `Funil` de `/relatorios`
**Regra pratica:** Quando o PrevLegal evoluir um caso por mais de um modulo, os relatórios precisam mostrar a travessia inteira, nao apenas o último status gravado no lead

### 85. Dashboard precisa filtrar por tenant explicitamente mesmo quando o restante do app ja endureceu
**Problema:** A leitura rápida da home podia continuar vendo leads fora do tenant atual mesmo com outras áreas já tenant-aware
**Causa:** O `Dashboard` ainda consultava `leads` só por `responsavel_id` / `lgpd_optout`, sem `tenant_id` explícito
**Correcao aplicada:** Adicionar filtro por `tenant_id` nas queries de leads e stats do dashboard
**Regra pratica:** Em transições de hardening multi-tenant, telas “resumo” costumam sobrar para trás; revisar sempre dashboard, relatórios e buscas globais depois de endurecer as rotas principais

### 86. Funil executivo fica muito mais útil quando cada etapa cai numa fila real
**Problema:** O pipeline em `/relatorios` mostrava bem o estágio da operação, mas ainda parava em insight e obrigava o usuário a navegar manualmente até a fila certa
**Causa:** As telas operacionais já existiam, mas não liam parâmetros simples de URL para abrir o recorte desejado
**Correcao aplicada:** Tornar os cards do pipeline clicáveis e ensinar:
- `Caixa de Entrada` a respeitar `tab`
- `Agendamentos` a respeitar `status`
- `Financeiro` a respeitar `filtro`
**Regra pratica:** Sempre que um dashboard do PrevLegal mostrar uma quantidade operacional relevante, o próximo clique precisa levar para uma fila acionável, não para uma navegação em branco

### 87. O PrevLegal nao deve competir como “mais um software de calculo previdenciario”
**Problema:** A comparacao com ferramentas como `Prévius` e `Tramitação Inteligente` pode empurrar o produto para uma corrida de checklist de calculo puro
**Causa:** O mercado ja tem polos bem definidos:
- profundidade tecnica de calculo
- conveniencia operacional de escritorio
**Correcao aplicada:** Registrar como tese de produto que o PrevLegal deve unir:
- CRM
- IA
- operacao comercial
- atendimento
- agenda
- contrato
- calculo integrado ao lead
**Regra pratica:** Toda nova frente previdenciaria deve ser avaliada pelo quanto ela fortalece o fluxo completo do lead, e nao apenas pela sofisticacao isolada do motor de calculo

### 88. Modulos premium previdenciarios fazem mais sentido do que inflar o core com tudo de uma vez
**Problema:** Blocos como pecas com IA, acompanhamento processual e totalizacao internacional tem alto valor, mas aumentam demais a superficie do produto base
**Causa:** Exigem curadoria juridica, regras especializadas e ticket diferente do fluxo operacional central do PrevLegal
**Correcao aplicada:** Separar a estrategia em:
- core:
  - analise de CNIS com IA
  - score de viabilidade
  - calculo preliminar integrado ao lead
- premium:
  - geracao de pecas com IA
  - acompanhamento processual inteligente
  - totalizacao internacional (`PrevGlobal`)
**Regra pratica:** Quando uma frente previdenciaria exigir alta especializacao e gerar valor percebido proprio, tratar como modulo premium antes de tentar encaixar tudo no core

### 89. Totalizacao internacional tem cara de nicho premium com UX baseada em comparacao de cenarios
**Problema:** Casos de contribuicao em mais de um pais nao se resolvem apenas “somando tempos”; as regras variam e nem sempre totalizar e vantajoso
**Causa:** O valor juridico real esta em comparar:
- sem totalizacao
- com totalizacao
e destacar quando o acordo ajuda ou atrapalha o caso
**Correcao aplicada:** Registrar a tese `PrevGlobal` com:
- toggle por pais
- adaptacao por acordo internacional
- comparativo automatico de cenarios
- foco inicial em poucos corredores de maior demanda
**Regra pratica:** Em modulos previdenciarios internacionais, priorizar primeiro os paises de maior fluxo e uma UX comparativa, nao um cadastro enciclopedico de todos os acordos logo de inicio

### 90. O portal mobile-first precisa evoluir com fallback seguro quando a fundacao de dados ainda nao estiver aplicada no operacional
**Problema:** O portal precisava passar a mostrar pendencias de documento e uma timeline mais rica, mas as entidades novas (`portal_document_requests` e `portal_timeline_events`) ainda nao existiam garantidamente no banco operacional
**Causa:** A frente mobile esta andando antes da fundacao completa de schema e antes da superficie interna de abastecimento desses dados
**Correcao aplicada:** Expandir `GET /api/portal/[token]` com leitura segura:
- se as tabelas novas existirem, usar os dados reais
- se nao existirem, fazer fallback para timeline derivada de:
  - abertura do caso
  - mensagens do portal
  - documentos compartilhados
  - agendamentos
**Regra pratica:** Em evolucoes do portal do cliente no PrevLegal, a UX pode avancar antes da modelagem ficar 100% abastecida, desde que a API degrade com seguranca e nunca quebre o portal em producao

### 91. Timeline do cliente e mais útil quando combina etapa macro com acontecimentos concretos
**Problema:** So mostrar o `status` do lead e as etapas macro do atendimento nao dava uma leitura viva do andamento do caso no portal
**Causa:** O cliente precisava de sinais concretos de movimento, nao apenas de uma trilha abstrata de progresso
**Correcao aplicada:** Manter as `Etapas do atendimento` como macro-estados e adicionar uma `Linha do tempo do caso` com eventos reais/derivados
**Regra pratica:** No app/portal do cliente, combinar sempre:
- camada macro: etapa do caso
- camada concreta: acontecimentos recentes
Isso gera mais confianca e reduz sensacao de “portal vazio”

### 92. O mesmo lugar onde o escritorio acompanha o lead deve abastecer o portal do cliente
**Problema:** Depois de enriquecer a home mobile-first com pendencias e timeline, ainda faltava um lugar simples para a equipe alimentar esses dados sem abrir um modulo separado
**Causa:** Criar uma area nova cedo demais aumentaria friccao e reduziria adoção interna
**Correcao aplicada:** A secao `Portal do Cliente` dentro do detalhe do lead passou a ser a superficie minima para:
- criar pendencias de documento
- criar eventos manuais de timeline
- controlar visibilidade para o cliente
**Regra pratica:** No PrevLegal, quando uma funcionalidade do cliente depender de input do escritorio, a primeira superficie deve nascer no contexto do lead, nao em um modulo paralelo

### 93. Foundation pendente no banco deve aparecer como aviso funcional, nao como erro opaco de produto
**Problema:** O front do portal e a nova superficie interna dependem de tabelas novas (`portal_document_requests` e `portal_timeline_events`) que ainda podem nao existir no operacional em alguns momentos
**Causa:** A frente mobile esta sendo construida antes da rodada final de aplicacao de schema
**Correcao aplicada:** As rotas internas e do portal agora distinguem:
- tabela ausente = aviso/fallback seguro
- erro real = falha explicita
**Regra pratica:** Em evolucao incremental de schema no PrevLegal, a UI deve informar quando a foundation ainda nao foi aplicada, em vez de parecer que a feature quebrou por motivo desconhecido

### 94. Confirmacao de presenca e uma boa automacao leve para o app do cliente
**Problema:** O cliente ja via a proxima consulta no portal, mas ainda faltava uma acao simples para reduzir no-show e dar previsibilidade ao escritorio
**Causa:** O sistema interno ja trabalhava com status `confirmado`, mas o mobile do cliente ainda nao acionava esse passo
**Correcao aplicada:** Criar `POST /api/portal/[token]/confirmacao`, permitindo ao cliente/familiar confirmar presenca na proxima consulta, atualizar o agendamento e alimentar timeline/notificacao
**Regra pratica:** No mobile do cliente, automacoes de baixo risco operacional devem entrar cedo quando ajudam a equipe e nao tiram o controle humano de decisoes sensiveis

### 95. Novidades do portal precisam usar o ultimo acesso inicial da sessao, nao um corte que anda a cada refetch
**Problema:** Ao tentar mostrar "novidades desde o ultimo acesso", o portal podia recalcular esse marco depois de a propria pagina disparar um novo fetch, fazendo algumas novidades desaparecerem cedo demais na mesma sessao
**Causa:** `ultimo_acesso_em` e atualizado no backend a cada resolucao de sessao; se o front usar sempre o valor mais recente retornado pela API, o comparativo deixa de representar o retorno original do cliente ao portal
**Correcao aplicada:** Fixar no front o baseline do `ultimo_acesso_em` recebido na entrada da sessao e usar esse ponto como referencia para resumir timeline, mensagens e pendencias
**Regra pratica:** Em experiencias de "desde seu ultimo acesso", capture o marco de comparacao uma vez por sessao e nao deixe refetch interno reescrever essa memoria

### 96. Resumo mobile so vira valor real quando aponta para a proxima acao
**Problema:** Mesmo com novidades e pendencias visiveis na home do portal, o cliente ainda precisava descobrir sozinho onde agir depois de entender o aviso
**Causa:** A interface mostrava o contexto, mas nem sempre o proximo clique natural
**Correcao aplicada:** Transformar a home em fila acionavel com:
- bloco `O que precisa da sua atencao agora`
- atalhos para `Mensagens` e `Documentos`
- CTA `Enviar agora` nas pendencias
**Regra pratica:** No portal mobile do PrevLegal, qualquer badge, resumo ou alerta so deve existir se levar para uma acao concreta dentro da propria jornada

### 97. Home mobile madura precisa destacar urgencia sem parecer alarmista
**Problema:** Depois de transformar a home do portal em fila acionavel, ainda faltava deixar claro o que era mais urgente e tambem quando nao havia nada para fazer
**Causa:** Sem hierarquia visual, varias acoes competem entre si; sem estado positivo, a ausencia de pendencias pode parecer falta de dados
**Correcao aplicada:** Dar destaque principal ao primeiro item da fila, adicionar selos curtos de prioridade, badges nas abas e um estado `Tudo em dia por aqui`
**Regra pratica:** Em home mobile do PrevLegal, a interface deve responder duas perguntas em poucos segundos:
- o que eu preciso fazer agora
- esta tudo em ordem ou existe algo pendente

### 98. Badge operacional nao pode depender de campo fantasma nem ignorar o tenant atual
**Problema:** O sidebar dependia de `/api/pendencias`, mas a rota misturava contagens nao tenant-aware e filtros de agendamento baseados em campos que nao estavam fechados no codigo/schema local
**Causa:** A intencao de produto ("agendamentos novos do agente ainda nao visualizados") ficou registrada antes de a modelagem dessa origem/visualizacao existir de ponta a ponta
**Correcao aplicada:** Reescrever `/api/pendencias` para usar `getTenantContext` + `getAccessibleLeadIds` e contar apenas filas reais:
- portal nao lido
- conversas humanas com nao lidas
- agendamentos em `agendado` ou `remarcado`
**Regra pratica:** No PrevLegal, badge operacional so deve nascer de estado real do produto e sempre com ancora canonica de tenant/escopo; se a modelagem futura ainda nao existe, a contagem precisa degradar para a fila concreta mais proxima

### 99. Notificacao global sem tenant-aware e vazamento silencioso esperando acontecer
**Problema:** A API `/api/notificacoes` lia e atualizava registros com service role sem autenticar o usuario do app e sem filtrar por `tenant_id`
**Causa:** A tabela `notificacoes` ganhou `tenant_id` na foundation multi-tenant, mas a rota antiga ficou presa a um modelo global anterior
**Correcao aplicada:** Exigir `getTenantContext`, usar o `tenantId` canonico e limitar tanto leitura quanto update ao tenant atual
**Regra pratica:** Em superfícies transversais como notificacoes, usar service role sem resolver antes o tenant do usuario e equivalente a abrir uma porta para leitura cruzada de contexto

### 100. Resumo e detalhe analitico precisam compartilhar exatamente o mesmo recorte tenant-aware
**Problema:** `/api/relatorios` e `/api/relatorios/roi` mostravam metricas de campanhas sem aplicar `tenant_id`, o que podia misturar performance de escritorios diferentes em uma UI aparentemente correta
**Causa:** A camada de relatorios ficou parcialmente migrada: leads e pipeline ja usavam contexto tenant-aware, mas as consultas de `campanhas` ainda herdavam um modelo mais antigo
**Correcao aplicada:** Reancorar ambas as rotas no contexto canonico do tenant, aplicar filtro por `tenant_id` nas campanhas e preservar o recorte por `responsavel_id` para usuario nao-admin
**Regra pratica:** No PrevLegal, quando existir resumo executivo e aba detalhada da mesma entidade, os dois precisam ler o mesmo universo tenant-aware; se um deles escapar desse contrato, o produto passa confianca falsa em vez de insight real

### 101. Em rota operacional por `leadId`, autenticacao nao substitui guarda canonica de acesso ao lead
**Problema:** Rotas de link do portal, compartilhamento e documentos do lead ainda aceitavam usuario autenticado e operavam diretamente por `leadId` ou `documento_id`
**Causa:** Parte dessa superficie nasceu antes da consolidacao de `getTenantContext` + `canAccessLeadId`, entao ficou presa a uma confianca implícita em RLS ou no simples fato de haver sessao
**Correcao aplicada:** Reancorar essas rotas na guarda canonica, validar o `lead_id` do documento antes de compartilhar e contar `portal_mensagens` apenas sobre `accessibleLeadIds`
**Regra pratica:** No PrevLegal, qualquer rota que toque um lead por ID deve provar acesso com `canAccessLeadId`; “usuario autenticado” por si so nao autoriza ler, gerar, compartilhar ou contabilizar dados daquele lead

### 102. Corrigir auth legado nao e so trocar middleware; e alinhar o identificador canonico que a rota grava
**Problema:** A rota de anotacoes do lead ainda buscava `usuarios` por `auth_user_id`, enquanto o contexto canonico do produto trabalha com `auth_id` e ja resolve `usuarioId`
**Causa:** A rota vinha de uma fase anterior da modelagem e permaneceu funcional por compatibilidade acidental, nao por contrato claro
**Correcao aplicada:** Passar `anotacoes` e `calculadora` para `getTenantContext` + `canAccessLeadId` e gravar anotacoes direto com `context.usuarioId`
**Regra pratica:** Quando uma rota legada migrar para o contexto canonico, nao basta trocar a autenticacao; vale remover tambem buscas antigas de usuario e gravar logo com o identificador que o produto reconhece como fonte da verdade

### 103. Quando a tabela ainda nao tem `tenant_id`, o minimo aceitavel e recortar pelo vinculo canonico mais proximo
**Problema:** `agent_documents` nao tinha `tenant_id`, mas a API usava service role para listar e deletar tudo como se a base de conhecimento do agente fosse global
**Causa:** A tabela nasceu antes da consolidacao do isolamento real e ficou esquecida fora do contrato tenant-aware que o resto do produto passou a seguir
**Correcao aplicada:** Reancorar `/api/agente/documentos` em `getTenantContext`, resolver os `usuarios.id` do tenant atual e limitar leitura/remoção a esse conjunto, gravando novos documentos com `context.usuarioId`
**Regra pratica:** No PrevLegal, quando uma tabela legada ainda nao tem `tenant_id`, a rota nao pode continuar global por comodidade; ela deve ao menos herdar o escopo do tenant pelo relacionamento canonico mais proximo e documentar claramente que ainda e `tenant-aware`, nao `tenant-isolated`

### 104. Quando o helper canonico ja existe, auth manual vira divida tecnica mesmo sem bug visivel
**Problema:** `POST /api/leads` e `POST /api/import` ainda resolviam usuario, role e tenant por consultas manuais, apesar de o produto ja ter `getTenantContext`
**Causa:** Essas rotas continuaram funcionais por inercia e acabaram ficando fora do padrão que o resto da base adotou durante a migracao multi-tenant
**Correcao aplicada:** Trocar a resolucao manual por `getTenantContext` e passar a usar `context.usuarioId`, `context.tenantId` e `context.isAdmin`
**Regra pratica:** No PrevLegal, quando a regra de escopo ja estiver consolidada num helper canonico, manter rotas novas ou antigas em `auth.getUser()` + query manual so aumenta a chance de divergencia futura; alinhar cedo evita drift mesmo antes de aparecer um bug

### 105. Chat interno solto vale menos que colaboracao operacional contextual
**Problema:** A ideia de comunicacao interna pode parecer forte, mas um "mini Slack" embutido tende a criar ruido, perder contexto e competir com a execucao do caso
**Causa:** Ferramentas internas genericas de conversa ajudam pouco quando o valor do produto esta em registrar decisao, dono, handoff e proxima acao no lugar exato do trabalho
**Correcao aplicada:** Formalizar a proxima frente do core como combinacao de `agentes + cadencias + colaboracao interna contextual`, deixando claro que a colaboracao deve nascer em torno de lead, conversa, agendamento e contrato, e nao como chat solto
**Regra pratica:** No PrevLegal, conversa interna so vira vantagem competitiva quando nasce presa ao fluxo operacional; se for livre demais, vira ferramenta paralela e nao camada de execucao

### 106. Quando ja existe foundation de handoff, a nova fase deve expandir o eixo certo em vez de reiniciar do zero
**Problema:** Seria facil desenhar a colaboracao interna como um modulo novo demais, ignorando que a inbox ja possui seme de dono, fila humana e handoff
**Causa:** Em fases de arquitetura, a tentacao e redesenhar tudo como se o produto ainda nao tivesse estrutura operacional previa
**Correcao aplicada:** Especificar a Fase A de colaboracao interna aproveitando `conversas.status`, `assumido_por` e `assumido_em`, fazendo a thread interna nascer no lead e se refletir depois na inbox
**Regra pratica:** No PrevLegal, quando uma fase nova amplia uma capacidade operacional ja existente, a implementacao deve crescer a partir da foundation real do produto e nao abrir uma segunda trilha concorrente

### 107. Colaboracao interna so e segura quando valida o usuario de destino dentro do tenant atual
**Problema:** A primeira versao de handoff e task interna aceitava `to_usuario_id` e `assigned_to` sem provar que aquele usuario pertencia ao escritorio atual
**Causa:** Em rotas novas de coordenacao interna, e facil focar no fluxo do lead e esquecer que o identificador do usuario tambem precisa de guarda tenant-aware
**Correcao aplicada:** Criar validacao explicita do usuario de destino em `internal-collaboration.ts` e bloquear handoff/task quando o responsavel nao pertencer ao tenant ou nao estiver ativo
**Regra pratica:** No PrevLegal, toda acao interna que direciona responsabilidade para uma pessoa deve validar o destino no tenant atual; `UUID` conhecido nao pode virar atalho para atravessar escritorios

### 108. Fase nova so fica realmente pronta para uso quando schema e runtime andam juntos
**Problema:** A foundation da colaboracao interna pode passar em build e ainda assim nao funcionar no operacional se a migration correspondente nao tiver sido aplicada no banco
**Causa:** O produto esta evoluindo em camadas, e nem toda sessao consegue fechar codigo + schema remoto no mesmo momento
**Correcao aplicada:** Registrar a fundacao da Fase A com honestidade operacional: rotas, UI e helper estao prontos, mas a feature depende da migration `038_internal_collaboration_phase_one.sql`
**Regra pratica:** No PrevLegal, quando uma entrega nova depender de schema ainda nao aplicado, documentar isso como dependencia explicita de rollout; build verde sozinho nao significa prontidao operacional completa

### 109. Painel lateral contextual vale mais que nova aba na inbox
**Problema:** A primeira opcao para expor coordenacao interna na inbox seria abrir uma aba nova (ao lado de Portal), mas isso fragmenta o foco do operador e esconde o contexto do caso
**Causa:** A inbox e uma ferramenta de execucao e nao de navegacao; adicionar aba coloca a coordenacao em competicao com a conversa principal
**Correcao aplicada:** Implementar strip-toggle abaixo do header que abre painel lateral (272px) sem sair da thread — dono, tasks e notas ficam visiveis enquanto o operador continua lendo a conversa
**Regra pratica:** No PrevLegal, quando um recurso novo precisa coexistir com o fluxo principal da inbox, painel lateral recolhivel preserva contexto melhor do que nova aba; nova aba so se o recurso precisar de espaco vertical propio

### 110. Quick note na inbox so e util se persistir e refletir imediatamente sem recarregar pagina
**Problema:** Um campo de nota que requer navegar para o detalhe do lead para confirmar se foi salva quebra o fluxo operacional da inbox
**Causa:** O operador esta na conversa — qualquer salto de pagina para confirmar uma acao interna tem custo cognitivo alto
**Correcao aplicada:** Apos `POST /api/leads/[id]/interno/mensagens`, o painel chama `fetchInternoData` no mesmo componente e atualiza a lista de notas sem reload — confirmacao visual imediata dentro do painel
**Regra pratica:** No PrevLegal, acoes rapidas de coordenacao interna (nota, check-off de task) precisam ter feedback imediato no proprio componente onde foram acionadas; redirecionamento ou reload quebra o contexto operacional

### 111. Unique index parcial é a forma certa de garantir 1 run ativa por lead
**Problema:** Sem restrição no banco, seria possível ativar dois follow-ups simultâneos no mesmo lead, criando conflito de mensagens e histórico inconsistente
**Causa:** Controle só em código (checar antes de inserir) tem race condition — dois requests simultâneos passariam na verificação antes de qualquer um inserir
**Correcao aplicada:** `create unique index idx_followup_runs_lead_ativo on followup_runs(lead_id) where status = 'ativo'` — o banco rejeita o segundo insert com conflito 409 antes de qualquer duplicidade
**Regra pratica:** No PrevLegal, quando a regra de negócio é "no máximo 1 registro ativo por entidade pai", usar unique index parcial no banco é mais seguro do que validação em código

### 112. Worker de disparo é dependência explícita — não esconder isso no produto
**Problema:** O follow-up engine ficaria silencioso sem o worker: runs ficam com `proximo_envio_at` calculado mas nada dispara, criando expectativa falsa para o operador
**Causa:** Implementar schema + API sem o worker é correto (fundação antes do motor), mas a UI precisa refletir esse estado
**Correcao aplicada:** Card do lead mostra `proximo_envio_at` apenas quando `status = 'ativo'`, deixando claro que há um próximo passo agendado; documentado como dependência explícita no handoff
**Regra pratica:** No PrevLegal, quando uma feature depende de um worker ainda não implementado, a UI deve mostrar o estado pendente com clareza e o handoff deve registrar a dependência antes de fechar a fase

### 113. Vercel Cron é a forma mais simples de worker no mesmo codebase Next.js
**Problema:** Edge Function separada no Supabase exige deploy independente, variáveis duplicadas e pipeline separado para um worker que usa as mesmas libs do app
**Causa:** A tentação de usar Supabase Edge Functions é alta por já estar no ecossistema, mas o worker precisa de `whatsapp-provider`, `twilio` e outras libs do app
**Correcao aplicada:** Criar `GET /api/followup/worker` protegido por `CRON_SECRET` e declarar o schedule em `vercel.json` — mesmo deploy, mesmas libs, zero infraestrutura extra
**Regra pratica:** No PrevLegal, workers leves que dependem de libs do app devem nascer como rotas API + Vercel Cron; Edge Functions do Supabase ficam reservadas para lógica de banco que não depende do codebase Next.js

### 114. Stop conditions no banco evitam mensagens indevidas mesmo se o worker rodar com atraso
**Problema:** Se o cron rodar 5min depois do lead ser marcado como convertido, sem stop condition no worker ele ainda dispararia a mensagem de follow-up
**Causa:** Crons têm delay inherente — nunca são exatos; qualquer lógica de parada que dependa só de "não ativar runs novas" ainda pode disparar steps já agendados
**Correcao aplicada:** No início de cada run processada, o worker lê o `status` atual do lead e aplica stop automático antes de tentar enviar qualquer mensagem
**Regra pratica:** No PrevLegal, stop conditions de follow-up precisam ser verificadas no momento do disparo, não só na ativação; o estado do lead pode mudar entre a ativação e o próximo ciclo do cron

### 115. Stop conditions devem ser implementadas em todos os pontos de entrada, não só no worker
**Problema:** Implementar stop só no worker deixa janela: se o lead responde ou humano assume ANTES do próximo ciclo, o worker ainda poderia disparar na próxima rodada porque a run ainda está com status `ativo`
**Causa:** O cron tem delay de até 5min — eventos de negócio (lead respondeu, humano assumiu) são imediatos e precisam parar a run imediatamente
**Correcao aplicada:** Stop conditions implementadas em 3 pontos:
  - worker (verificação no início de cada run processada)
  - webhook Twilio inbound (lead responde → stop imediato)
  - conversas PATCH (humano assume → stop imediato)
**Regra pratica:** No PrevLegal, stop conditions de follow-up precisam existir em TODOS os pontos onde o estado relevante muda, não só no worker; o worker é última linha de defesa, não a única

### 116. Fallback transparente é a estratégia correta ao migrar de config global para por-entidade
**Problema:** Ao introduzir agentes por tenant, os clientes que não criaram nenhum agente ainda perderiam o funcionamento do responder se ele exigisse agente configurado
**Causa:** Migrações de modelo de dados devem ser zero-disruption — o comportamento antigo precisa continuar enquanto o novo não está configurado
**Correcao aplicada:** O responder busca agente `is_default=true` do tenant; se não existir, cai transparentemente para `configuracoes` global — nenhum cliente precisa reconfigurar nada
**Regra pratica:** No PrevLegal, ao adicionar uma nova entidade de configuração mais granular (por agente, por campanha), sempre manter o fallback para o nível anterior; o novo nível é opt-in, não obrigatório

### 117. Seed de automação bom precisa ser idempotente e respeitar a configuração real do tenant
**Problema:** Um botão de `Templates Seed` pode criar duplicidade, competição entre gatilhos e sobrescrita indireta da operação do escritório se inserir padrões cegamente
**Causa:** É fácil tratar seed como massa fixa sem verificar se aquele status já tem gatilho configurado ou se o tenant realmente possui a régua/agente necessário
**Correcao aplicada:** O seed de `event_triggers` passou a:
- usar apenas regras e agentes ativos realmente disponíveis
- preservar slots já configurados
- inserir só o que está faltando
- devolver resumo explícito de `inseridos`, `já existentes` e `indisponíveis`
**Regra pratica:** No PrevLegal, qualquer seed operacional por tenant deve ser repetível sem efeito colateral e nunca assumir que todos os recursos de apoio já estão configurados

### 118. Variável de tema inválida em botão crítico vira bug funcional, não só detalhe visual
**Problema:** O botão `Novo Gatilho` apareceu como um bloco preto sem texto visível na tela de automações
**Causa:** O componente usava `var(--bg-default)`, mas essa variável não existe no tema atual; o navegador caía para cores inválidas e o CTA perdia contraste
**Correcao aplicada:** Trocar a dependência por cores explícitas e variáveis reais do design system (`var(--accent)` + `#fff`) e revisar outros pontos da mesma tela que ainda usavam `--bg-default`
**Regra pratica:** No PrevLegal, CTA operacional importante não deve depender de variável de tema inexistente ou ambígua; em ações primárias, prefira contraste explícito e previsível

### 119. Seed operacional precisa dizer com clareza quando o problema é falta de prerequisito, nao erro de sistema
**Problema:** A UI de automações parecia “quebrada” quando o seed retornava `Nenhum template novo foi inserido`, mesmo com o backend funcionando corretamente
**Causa:** O tenant real ainda nao tinha agentes ativos nem regua ativa, mas a tela devolvia um feedback visual que soava como sucesso generico ou falha ambigua
**Correcao aplicada:** O feedback do seed passou a diferenciar `warning` de `success`, o modal bloqueia selecoes sem recurso disponivel e a UI explica exatamente o que falta no tenant para criar gatilhos
**Regra pratica:** No PrevLegal, quando uma automacao depende de configuracao previa do escritorio, a interface deve expor o prerequisito faltante e orientar o proximo passo; nao deixar o operador adivinhar se houve bug ou apenas setup incompleto

### 120. Quando uma capability nova vira real, a superficie principal precisa migrar junto
**Problema:** O produto ja tinha multiagentes implementados, mas a navegação principal ainda levava para uma tela antiga de agente único, criando a impressão de que só existia um agente configurável
**Causa:** A Fase C/D cresceu em `/configuracoes?tab=agentes`, mas a antiga rota `/agente` continuou viva e virou uma camada de UX incoerente
**Correcao aplicada:** A página `/agente` foi transformada na superfície canônica de multiagentes e o seed de agentes passou a ficar visível na própria operação
**Regra pratica:** No PrevLegal, quando uma nova camada do produto substitui a lógica anterior, a navegação principal precisa apontar para a nova superfície; deixar a UI antiga como caminho principal distorce a leitura do que o sistema realmente suporta

### 121. Fechamento pode entrar antes de existir um estágio dedicado, desde que use um papel já compatível
**Problema:** A operação começou a exigir um agente de fechamento/proposta, mas abrir um novo `tipo` no banco sem validar enum/schema real aumenta risco de drift
**Causa:** O produto já tinha um papel suficientemente próximo (`followup_comercial`), então forçar uma categoria nova agora geraria complexidade antes da hora
**Correcao aplicada:** O agente de fechamento entrou nesta rodada modelado como `followup_comercial`, com naming e objetivo explícitos de proposta/fechamento
**Regra pratica:** No PrevLegal, quando uma nova função operacional cabe semanticamente em um papel já existente, prefira encaixar no tipo compatível e só abrir novo enum/estágio quando houver necessidade real de roteamento ou métrica separados

### 122. Gatilho por status precisa disparar em todos os caminhos de troca de status
**Problema:** A automação da Fase E podia parecer instável porque o gatilho rodava no update completo do lead, mas não no endpoint rápido de mudança de status
**Causa:** O produto ganhou mais de um caminho de edição de `lead.status`, e só um deles tinha sido ligado ao `processEventTriggers`
**Correcao aplicada:** `PATCH /api/leads/[id]/status` agora também lê o status anterior e dispara o orquestrador quando houver mudança real
**Regra pratica:** No PrevLegal, sempre que uma automação depender de um evento de domínio como “status mudou”, todos os endpoints que produzem esse evento precisam chamar a mesma orquestração; não confiar em apenas um caminho da UI
