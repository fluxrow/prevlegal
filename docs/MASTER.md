# PrevLegal — MASTER.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Documento vivo. Atualizado a cada sessão de desenvolvimento.
> Última atualização: 08/04/2026

---

## Navegação

- [[INDEX]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[EXECUTION_TRACK]]
- [[DOMAIN_MIGRATION]]
- [[MOBILE_CLIENT_APP_PLAN]]
- [[MOBILE_CLIENT_APP_BACKLOG]]
- [[PREVIDENCIARIO_EXPANSION_STRATEGY]]
- [[PRODUCT_PORTFOLIO_STRATEGY]]
- [[IMPORTADOR_INTELIGENTE_PLAN]]
- [[DOCLING_INTEGRATION_PLAN]]

## Produto

**Nome:** PrevLegal
**Categoria:** SaaS B2B para operações de captação previdenciária
**Repositório:** https://github.com/fluxrow/prevlegal
**Produção atual:** https://app.prevlegal.com.br
**LP atual:** https://www.prevlegal.com.br
**Domínio próprio adquirido:** `prevlegal.com.br`

## Estado operacional atual

- o core do produto já está funcional
- o maior risco atual não é falta de feature principal
- o maior risco atual é de `go-live incompleto`, especialmente por:
  - migrations pendentes em produção
  - Google OAuth ainda sem verificação comercial
  - smoke test final do tenant real ainda não fechado ponta a ponta

Referencia executiva principal:
- `docs/EXECUTION_TRACK.md`

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

### Estado confirmado em 2026-03-19

- `https://www.prevlegal.com.br` -> LP pública canônica
- `https://prevlegal.com.br` -> `307` para `https://www.prevlegal.com.br/`
- `https://app.prevlegal.com.br` -> plataforma principal
- `https://admin.prevlegal.com.br` -> admin principal
- `https://prevlegal.vercel.app` -> host técnico de fallback, não mais canônico
- banco operacional `lrqvvxmgimjlghpwavdb` resetado com sucesso via SQL direto (`031` + reset limpo)
- banco central `zjelgobexwhhfoisuilm` preservado sem execução destrutiva
- legado piloto foi descartado; o próximo passo correto é recadastrar o primeiro escritório real do zero

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
**Email:** jessica@alexandrini.adv.br
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
- **WhatsApp:** camada em transicao para providers (`Twilio` agora, `Z-API` a seguir) com suporte planejado a multiplos numeros por tenant
- **IA:** Claude API (claude-sonnet-4-20250514)
- **Agendamentos:** Google Calendar OAuth por usuário com fallback do escritório
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

## WhatsApp Providers — Direcao atual

- a camada `src/lib/whatsapp-provider.ts` passa a ser a fundacao canonica para envio outbound
- o modelo novo admite:
  - `provider = twilio`
  - `provider = zapi`
  - multiplos numeros por tenant
- a tabela planejada para isso e `whatsapp_numbers`
- o runtime continua com fallback seguro para o helper legado de Twilio enquanto a base nova nao estiver populada
- objetivo de produto:
  - permitir mais de um numero de prospeccao por escritorio
  - escolher origem por campanha e, depois, por conversa humana
  - reduzir dependencia de um unico sender ou provider global

## Mobile do Cliente — Direcao atual

- o app mobile do cliente deve nascer como extensao do portal
- ordem recomendada:
  - portal mobile-first
  - PWA instalavel
  - identidade persistente do cliente/familiar
  - app nativo apenas se o uso provar necessidade
- objetivo do MVP:
  - acompanhamento do caso
  - mensagens
  - agenda / Meet
  - documentos
  - perfil do cliente/familiar
- referencia canonica:
  - `docs/MOBILE_CLIENT_APP_PLAN.md`
- backlog tecnico inicial:
  - `docs/MOBILE_CLIENT_APP_BACKLOG.md`
- fase 1 ja iniciada:
  - o portal atual passou a ler branding dinamico do tenant
  - o payload do portal ja inclui `branding`, `proximo_agendamento` e `resumo`
  - o payload do portal agora tambem inclui:
    - `pendencias_documento`
    - `timeline`
    - `resumo.documentos_pendentes`

## Agentes IA — Direcao atual

- a superficie canonica de operacao dos agentes passou a ser `/agente`
- ela agora representa o modelo multiagente do produto, nao mais o singleton legado
- o escritorio pode operar multiplos agentes com papeis distintos, incluindo:
  - triagem
  - confirmacao de agenda
  - reativacao
  - documental
  - follow-up comercial / fechamento
- o runtime continua com fallback seguro para a configuracao global antiga quando o tenant ainda nao tiver agentes configurados
  - o portal agora tambem permite confirmar presenca na proxima consulta, gerando timeline e notificacao interna para a equipe
  - a home do portal agora combina:
  - o portal agora tambem permite:
    - envio de documentos pelo proprio cliente/familiar
    - associacao opcional do envio a uma pendencia existente
    - atualizacao automatica da timeline e notificacao interna da equipe
    - pedido de remarcacao pelo proprio cliente/familiar, sem alterar a agenda automaticamente

## Inteligencia Documental — Direcao atual

- o PrevLegal deve evoluir de `arquivo armazenado` para `documento compreendido`
- a fundacao escolhida para isso e `Docling`, inicialmente como camada de parsing estrutural para:
  - `lead_documentos`
  - `agent_documents`
- o primeiro ROI nao e gerar mais documentos, e sim:
  - entender documentos ja enviados
  - tornar o acervo pesquisavel
  - melhorar contexto de agentes e operacao humana
- referencia canonica:
  - `docs/DOCLING_INTEGRATION_PLAN.md`

## Arquitetura de Portfólio — Regra atual

- `PrevLegal Core` continua sendo a plataforma principal:
  - captacao
  - qualificacao
  - inbox humana
  - agenda
  - portal/app do cliente
  - financeiro
- expansoes nao substituem o core; elas se conectam a ele
- `PrevGlobal` e demais frentes previdenciarias avancadas devem entrar como modulos premium
- principio atual preservado:
  - o produto central continua orientado a operacao previdenciaria ponta a ponta
  - o crescimento acontece por camadas, nao por troca de identidade
- referencia canonica:
  - `docs/PRODUCT_PORTFOLIO_STRATEGY.md`
    - status macro do caso
    - proxima consulta
    - documentos pendentes
    - linha do tempo do caso
  - a fundacao de schema para a fase seguinte foi preparada em:
    - `supabase/migrations/035_portal_mobile_foundation.sql`
  - a migration `035_portal_mobile_foundation.sql` ja foi aplicada no operacional `lrqvvxmgimjlghpwavdb`
  - o portal agora tambem ganhou installability de PWA:
    - manifesto dinamico por token
    - `service worker` leve em `public/sw.js`
    - CTA `Instalar app` dentro do proprio portal
    - fallback instrucional para iPhone / iOS
  - a foundation de identidade persistente do portal tambem ja foi aberta:
    - migration `036_portal_identity_foundation.sql` aplicada no operacional
    - novas tabelas:
      - `portal_users`
      - `portal_access_links`
    - o detalhe do lead agora permite:
      - cadastrar cliente / familiar / cuidador para o portal
      - ativar / pausar acesso
      - excluir acesso
      - gerar link persistente individual
    - o link persistente atual funciona como ponte segura:
      - registra o acesso em `portal_access_links`
      - atualiza `ultimo_acesso_em` em `portal_users`
      - redireciona para o portal tokenizado existente
  - a foundation de sessao do portal tambem ja foi aberta:
    - migration `037_portal_session_foundation.sql` aplicada no operacional
    - nova tabela:
      - `portal_sessions`
    - o acesso por `/portal/acesso/[token]` agora:
      - cria sessao real de portal em cookie httpOnly
      - registra `ultimo_acesso_em` da sessao
      - permite reconhecer o cliente/familiar dentro do app
    - o portal agora tambem ganhou a primeira aba de `Perfil`:
      - edicao de nome
      - e-mail
      - telefone
      - acao de sair do acesso persistente

## Expansao Previdenciaria — Direcao atual

- a leitura competitiva entre `Prévius` e `Tramitação Inteligente` reforca que o PrevLegal nao deve virar apenas um “software de calculo”
- a tese mais forte e unir:
  - CRM
  - IA
  - operacao comercial
  - calculo previdenciario integrado ao lead
  - agenda
  - contrato
- blocos mais promissores:
  - analise de CNIS com IA
  - score de viabilidade
  - calculo preliminar integrado ao lead
  - geracao de pecas com IA como modulo premium
  - acompanhamento processual como modulo premium
- tese de modulo premium separado:
  - totalizacao internacional (`PrevGlobal`)
- referencia canonica:
  - `docs/PREVIDENCIARIO_EXPANSION_STRATEGY.md`
