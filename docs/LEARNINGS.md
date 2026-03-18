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
