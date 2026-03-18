# PrevLegal — LEARNINGS.md
> Erros encontrados, causas e correções aplicadas.
> Atualizado a cada sessão.

---

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
