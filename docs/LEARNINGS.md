# PrevLegal — LEARNINGS.md
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
