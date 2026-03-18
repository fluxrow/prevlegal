# PrevLegal — MASTER.md
> Documento vivo. Atualizado a cada sessão de desenvolvimento.
> Última atualização: 18/03/2026

---

## Navegação

- [[INDEX]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[DOMAIN_MIGRATION]]

## Produto

**Nome:** PrevLegal
**Categoria:** SaaS B2B para operações de captação previdenciária
**Repositório:** https://github.com/fluxrow/prevlegal
**Produção atual:** https://prevlegal.vercel.app
**LP atual:** https://prevlegal.vercel.app/lp.html
**Domínio próprio adquirido:** `prevlegal.com.br`

### Arquitetura de domínio aprovada
- `www.prevlegal.com.br` -> site / LP canônico
- `prevlegal.com.br` -> redirect para `www.prevlegal.com.br`
- `app.prevlegal.com.br` -> plataforma principal
- `admin.prevlegal.com.br` -> painel admin desde o início

### Variáveis públicas aprovadas para o cutover
- `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br`
- `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br`

### Ordem lógica de execução da migração de domínio
1. Definir a arquitetura final (`site` vs `app`)
2. Configurar domínio e subdomínios no Vercel
3. Ajustar DNS do domínio comprado
4. Atualizar URLs canônicas, CTAs e links absolutos do sistema
5. Revisar login, portal, notificações e links enviados automaticamente
6. Validar redirects e HTTPS em produção

Checklist detalhado em: [[DOMAIN_MIGRATION]]

### Posicionamento correto
O PrevLegal NÃO é para advogados autônomos.
É para **operações de captação previdenciária** — empresas não-OAB que:
1. Compram listas de beneficiários elegíveis
2. Usam o PrevLegal para qualificar leads via agente IA no WhatsApp
3. Repassam leads qualificados para **escritórios parceiros** (OAB)
4. Dividem honorários com o escritório

Modelo legal baseado no Provimento 205/2021 OAB + Art. 34 IV Estatuto da Advocacia.
A empresa de captação NUNCA se identifica como vinculada ao escritório parceiro.

### Agente IA — regras críticas
- Se apresenta como: "(nome) — Consultor(a) Previdenciário(a)"
- NUNCA menciona o escritório parceiro na abordagem inicial
- NUNCA revela NB, valores do benefício ou dados bancários
- Referência jurídica: STF RE 564.354 (08/09/2010, Informativo 599)
- ~70% dos contatos são feitos por filhos/familiares do beneficiário

---

## Fundador

**Nome:** Flávio Cauã Farias de Farias
**Email:** fbcfarias@icloud.com / fbcfarias@icloud.com
**GitHub:** fbcfarias (NÃO é CauaFarias — pessoa diferente)
**Empresa:** Fluxrow

---

## Cliente Piloto

**Jéssica Alexandrini** — advogada previdenciária
**Escritório:** Alexandrini Advogados
**Endereço:** Rua Paula Gomes, 853 — São Francisco — Curitiba/PR
**Email:** jessica@alexandrini.com.br
**WhatsApp:** (41) 99984-4234
**Site:** alexandrini.adv.br
**OAB/PR**

Opera como hunter via empresa secundária (captação) + escritório (jurídico).
Ainda não usa o PrevLegal — implementação planejada com as listas que ela trabalha.

---

## Pricing

| Plano | Preço | Leads/mês |
|-------|-------|-----------|
| Entrada | R$ 1.997/mês | Até 2.000 |
| Profissional | R$ 3.497/mês | Até 10.000 |
| Enterprise | R$ 5.000+/mês | Ilimitado |

Jéssica avaliou que o mercado paga facilmente R$ 5k/mês.
Estratégia: entrar com R$ 1.997 para gerar cases, subir gradualmente.

---

## Stack Técnica

- **Framework:** Next.js 16.1.6 App Router (TypeScript)
- **Banco:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deploy:** Vercel (auto-deploy no push para main)
- **WhatsApp:** Twilio (sandbox atual — conta pessoal do Cauã)
- **IA:** Claude API (claude-sonnet-4-20250514)
- **Agendamentos:** Google Calendar OAuth
- **Charts:** Recharts
- **Automação:** n8n

### Supabase
| Ambiente | Project ID |
|----------|-----------|
| Alexandrini (dev/piloto) | lrqvvxmgimjlghpwavdb |
| Central | zjelgobexwhhfoisuilm |

### Vercel
- Project: prevlegal
- projectId: prj_riweCOowADD0JR7rGw8yzSVQOEp8
- teamId: team_zeCqZtYRVn7PT9BHODcWKQiw

---

## Preferências de Desenvolvimento (Cauã)

1. Claude arquiteta e gera código/prompts completos
2. AgentVS Code (AntiGravity) executa no terminal local
3. npm run build local antes de cada push — obrigatório
4. Push para main → Vercel auto-deploya
5. Supabase MCP para queries e migrations direto

### Preferências de comunicação
- Direto ao ponto, sem rodeios
- Código completo, não parcial
- Commits com mensagens descritivas
- Sempre informar o commit hash após deploy
- Separar sempre `SITE_URL` de `APP_URL` ao mexer em SEO, LP, convites, portal ou links absolutos

### Política de sessão recomendada
- Plataforma principal: expiração por inatividade após `45 minutos`
- Admin: expiração por inatividade após `15 minutos`
- Portal do cliente: continua por link/token, sem sessão persistente clássica de backoffice
- Ações sensíveis devem exigir reautenticação adicional:
  - admin
  - financeiro
  - exportações
  - exclusões
  - troca de credenciais/integradores

---

## Twilio — Situação atual e roadmap

**Atual:** Conta pessoal do Cauã (sandbox) — não escala
**Planejado:** Subcontas Twilio por tenant
- Cada cliente terá sua própria subconta Twilio
- Campos necessários no tenant: twilio_account_sid, twilio_auth_token, twilio_number
- APIs de disparo usarão credenciais do tenant em vez das globais
- Onboarding: Fluxrow cria subconta e provisiona número para o cliente
