# SESSION_BRIEF — PrevLegal (atualizado 10/04/2026)

## Stack e repositório
- Next.js 16 App Router + React 19 + Supabase + Twilio WhatsApp + Claude API + Vercel
- Repo: https://github.com/fluxrow/prevlegal
- Branch operacional: `main`

## Banco operacional
- Supabase project: `lrqvvxmgimjlghpwavdb`

## Fases entregues (todas no main)

| Fase | Descrição | Commits |
|------|-----------|---------|
| A | Colaboração interna — thread, tasks, handoff, inbox strip | 7b468e1..d7eea54 |
| B | Follow-up engine — worker Vercel Cron 5min, stop conditions em 4 pontos | e1a9027..8bea965 |
| C | Multi-agente por tenant — tabela agentes, CRUD, UI, wire responder com fallback | 1e8ae47 |
| D | Roteamento por campanha/estágio + métricas por agente | 34e3f92 |
| E | Gatilhos de Ativação Automática (BD, APIs e Orquestrador backend) | a528367..atual |

## Pendências operacionais (próxima rodada)
- Fechar a trilha comercial do OAuth do Google:
  - consent screen
  - verificação do app
  - domínio verificado
  - links públicos válidos
  - submissão com material pronto
  - vídeo de demonstração
- Rodar smoke test do tenant real com:
  - convite
  - permissões
  - inbox humana ponta a ponta
  - portal em tenant real

## Arquitetura de Roteamento (Fase D & E)
Prioridade no responder mantém Fase D.
Gatilho automático: a mudança de status do lead na API `PATCH` chama o *Orquestrador*, varrendo `event_triggers` e rodando followups (podendo cancelar os velhos).

## Próximo bloco oficial
1. Gravar e subir o vídeo do Google OAuth comercial.
2. Fechar as pendências residuais do smoke test final do tenant real.
3. Só depois: Docling operacional, agenda premium extra e importador fase 2.

## Atualização 2026-04-10 - Convite de usuário endurecido para o go-live

- o fluxo de convite continua sendo `link manual`; a UI agora deixa explícito que o sistema não envia email automaticamente
- o aceite do convite passou a tratar com mensagem amigável o caso de email já existente no Supabase Auth
- para o go-live atual, ficou assumido e documentado que cada email pertence a um único escritório
- consequência prática:
  - para convidar alguém novo no tenant, usar email inédito
  - se o email já existir em outra conta do PrevLegal, tratar migração depois do go-live, não durante o onboarding do cliente

## Atualização 2026-04-13 - Inbox passou a ser pessoal por padrão, inclusive para admins

- no smoke test multiusuário, um novo admin convidado conseguiu ver conversas da carteira principal do escritório logo no primeiro acesso
- decisão de produto para o go-live:
  - a inbox humana deve ser pessoal por padrão para todo mundo
  - inclusive para `admin` do escritório
  - visão total da equipe fica para depois, como modo explícito de supervisão
- correção aplicada:
  - criação de `src/lib/inbox-visibility.ts`
  - `GET /api/conversas`
  - `GET|PATCH /api/conversas/[id]`
  - `POST /api/conversas/[id]/responder`
  - regra única:
    - vê a conversa quem é dono do lead
    - ou quem assumiu a conversa humana
- impacto operacional:
  - reduz exposição de carteira
  - preserva noção de dono do atendimento
  - prepara melhor futura transferência de atendimento entre usuários

## Atualização 2026-04-13 - Cadastro manual passou a aceitar lead sem CPF

- o modal `Novo lead` já sugeria que CPF era opcional, mas o banco ainda rejeitava `null`
- leitura de produto consolidada:
  - no primeiro contato com lead avulso ou lead de campanha, CPF não deve ser obrigatório
  - esse dado pode entrar depois, quando o escritório já construiu confiança para pedir informação sensível
- correção aplicada:
  - migration `046_leads_cpf_optional.sql`
  - patch manual de produção em `supabase/manual/2026-04-13_make_leads_cpf_nullable.sql`
  - tipagem de lead atualizada para aceitar `cpf` nulo
  - label do modal ajustada para `CPF (opcional)`

## Atualização 2026-04-13 - Templates de agentes ficaram orientados por tipo de operação, não por nome de cliente

- a configuração padrão de agentes deixou de expor rótulos como `Modelo Jessica` e `Modelo Ana`
- decisão de produto:
  - o cliente deve escolher o tipo de operação que quer rodar
  - não faz sentido expor o nome de outros escritórios/clientes na UX
- estado atual:
  - `Captação de Benefícios Previdenciários`
  - `Captação de Planejamento Previdenciário`
- confirmação técnica:
  - a escolha do perfil continua aplicando treinamento realmente específico por abordagem em `POST /api/agentes/seed`
  - cada agente nasce com `prompt_base`, `fluxo_qualificacao`, `gatilhos_escalada`, `frases_proibidas`, `objeccoes` e `fallback` próprios do perfil selecionado
- também foi neutralizado o fallback antigo do responder que ainda citava `Ana`

## Atualização 2026-04-13 - Agentes passaram a selecionar canal WhatsApp real do escritório

- o campo avançado do agente ainda expunha um input cru com rótulo legado de `Twilio/Meta`
- isso gerava dois problemas:
  - a UX não refletia o canal realmente conectado no tenant, como `Z-API`
  - parecia que cada agente precisava de um número próprio para funcionar bem
- decisão de produto consolidada:
  - o padrão recomendado é usar o mesmo canal WhatsApp do escritório para a maioria dos agentes
  - isso evita que o lead receba mensagens do mesmo caso por números diferentes
  - separar canal por agente deve ser exceção operacional, não obrigação da configuração
- correção aplicada:
  - criação de `GET /api/whatsapp-numbers` no contexto do tenant
  - formulário de agentes agora lista canais reais ativos do escritório
  - o texto foi atualizado para `Canal WhatsApp padrão`
  - o backend passou a validar se o canal escolhido pertence mesmo ao tenant

## Atualização 2026-04-13 - Novas tarefas registradas após smoke test de campanhas e inbox

- campanhas:
  - permitir escolher também leads cadastrados manualmente para campanhas/testes
  - ao selecionar `Agente IA para esta campanha`, mostrar os agentes reais do escritório
  - ao escolher o agente, sugerir a mensagem inicial por template, com edição livre
  - expor canal `Z-API` na configuração de disparo, e não só `Twilio`
- inbox humana:
  - ao transferir um lead/conversa, a thread precisa aparecer para o novo responsável
  - o usuário antigo não deve continuar recebendo notificação daquela conversa após a transferência
  - notificações e visibilidade da inbox ainda estão desalinhadas em alguns fluxos
  - ações `Abrir conversa` e `Iniciar conversa` a partir do lead precisam abrir a thread correta na `Caixa de Entrada`

## Atualização 2026-04-13 - Campanhas e inbox ganharam alinhamento operacional para o go-live

- campanhas:
  - `/campanhas` agora carrega:
    - listas do escritório incluindo listas de sistema/manual (`include_system=1`)
    - agentes reais do tenant
    - canais WhatsApp reais do escritório via `/api/whatsapp-numbers`
  - ao escolher o agente da campanha, o produto sugere automaticamente uma mensagem inicial coerente com o tipo de agente:
    - `triagem`
    - `confirmacao_agenda`
    - `reativacao`
    - `followup_comercial`
    - `documental`
  - a mensagem continua editável pelo usuário
  - `POST /api/campanhas` passou a aceitar `whatsapp_number_id` explícito, validando se o canal pertence ao tenant e está ativo
- inbox humana:
  - links de notificação e de webhook (`Twilio` / `Z-API`) agora carregam `conversaId` e `telefone`, tentando abrir a thread certa em `/caixa-de-entrada`
  - iniciar conversa a partir do lead agora já cria/assume a thread humana e redireciona com deep link correto
  - handoff interno agora transfere também `leads.responsavel_id`, para a carteira do novo usuário ficar coerente com a conversa
  - notificações passaram a respeitar visibilidade real de conversa/lead antes de listar ou marcar como lidas
  - portal ganhou deep link para `tab=portal&leadId=...` e a UI da inbox passou a selecionar a thread do portal pela URL quando esse contexto existir
- leitura prática:
  - o produto ficou bem mais próximo do comportamento esperado para campanha de teste com lead manual e operação multiusuário real
  - ainda precisamos retestar em runtime os fluxos de:
    - transferência completa da thread para o novo responsável
    - abertura/foco da thread a partir de notificação e lead detail
    - campanha usando agente + canal Z-API + lead manual ponta a ponta

## Atualização 2026-04-14 - Inbox deixou de reimpor deep links antigos e voltou a respeitar a navegação do operador

- no smoke test multiusuário, a transferência do lead `Fabio` para `Dr. Fabio` coincidiu com dois sintomas visuais:
  - abas da `Caixa de Entrada` pareciam travadas
  - notificações levavam para a inbox, mas a thread/foco não se estabilizava
- leitura técnica:
  - a tela reaplicava `conversaId` / `telefone` / `leadId` sempre que os dados eram recarregados
  - isso podia devolver a UI para `Todas` ou para uma thread antiga, mesmo depois de o usuário clicar em outra aba
- correção aplicada:
  - deep link humano e deep link do portal agora são tratados como hidratação pontual
  - a inbox passou a memorizar quando o link já foi processado
  - trocar de aba limpa parâmetros concorrentes (`conversaId`, `telefone`, `leadId`) e reseta a seleção do outro contexto
- impacto esperado:
  - filtros voltam a responder normalmente
  - `Abrir conversa`, `Iniciar conversa` e cliques em notificação deixam de competir com o estado já escolhido pelo operador
  - o reteste de transferência entre usuários fica mais fiel ao estado real do banco, sem ruído de navegação antiga

## Atualização 2026-04-14 - Tabelas `UNRESTRICTED` no Supabase viraram item formal de hardening

- no painel do Supabase apareceram várias tabelas novas e antigas como `UNRESTRICTED`, ou seja, sem RLS habilitado
- leitura atual:
  - isso não explica os testes funcionais que já estão verdes
  - mas é um ponto real de segurança antes de escalar operação com escritórios pagantes
- prioridade de endurecimento:
  - `whatsapp_numbers` por guardar credenciais sensíveis
  - `portal_access_links` e `portal_sessions` por guardarem hashes de acesso
  - `portal_users` por envolver identidade do portal
- segunda onda:
  - `campanha_leads`
  - `followup_*`
  - `lead_*` internas
  - `document_*`
- decisão prática:
  - não bloquear o smoke test funcional por isso
  - registrar como hardening explícito no pós-go-live imediato

## Atualização 2026-04-14 - Campanhas passaram a recalcular elegibilidade real das listas

- a lista `Cadastro manual` podia aparecer com `0 com WhatsApp` mesmo já contendo leads manuais aptos para campanha
- a causa era drift entre a tabela `listas` e o estado real da tabela `leads`
- correção aplicada:
  - `/api/listas` agora recalcula `total_leads`, `com_whatsapp`, `sem_whatsapp` e `nao_verificado` diretamente a partir de `leads`
- decisão de produto registrada:
  - além do disparo por lista inteira, a campanha deve evoluir para permitir seleção explícita de contatos individuais
  - isso fica como próxima camada operacional, especialmente útil para campanhas personalizadas de recuperação e follow-up

## Atualização 2026-04-14 - Importador passou a aceitar lista enriquecida por `CPF + nome` para go-live

- o go-live da Jessica ficou dependente da base enriquecida do Assertivo, porque nela estão os números realmente utilizáveis para abordagem
- a lista nutrida nova trouxe:
  - `CPF`
  - `NOME`
  - `DATANASC`
  - telefones do titular
  - telefones com sinalização de WhatsApp
  - contatos de cônjuge, filho e irmão
- correção aplicada no importador:
  - layouts com `CPF + nome` agora são aceitos mesmo sem `NB`
  - quando não existir `NB`, o sistema gera um identificador técnico determinístico por lead
  - o importador escolhe automaticamente um contato prioritário por lead na ordem:
    - `CELULAR_WHATSAPP_1`
    - `TELEFONE_WHATSAPP_1`
    - `TELEFONE1`
    - `TELEFONE2`
    - `CONJUGE_CELULAR_1`
    - `FILHO_1_CELULAR_1`
    - `IRMAO_1_CELULAR_1`
  - o contato prioritário vai direto para `leads.telefone`, porque o disparo de campanha usa esse campo
  - quando o contato vier de familiar, o sistema registra isso em `anotacao` para orientar uma abordagem indireta
- decisão de operação para o go-live:
  - continua valendo `1 lead = 1 beneficiário`
  - a campanha aborda um único contato por vez
  - árvore familiar e múltiplos contatos relacionados ficam para a próxima fase, sem bloquear a operação de segunda

## Tasks abertas registradas após o novo smoke test

- campanhas:
  - revisar a aba `Configuração de Disparo`, que ainda expõe um modelo legado focado em Twilio, em vez de refletir os canais reais do tenant (`Z-API` / `Twilio`)
  - confirmar no runtime que lead manual, agente escolhido e template inicial sugerido estão fechados ponta a ponta
- inbox / portal:
  - retestar transferência de conversa entre `Cauã` e `Dr. Fabio` após a correção de deep link
  - retestar abertura da thread a partir de:
    - notificação no sino
    - `Abrir conversa` no lead
    - `Iniciar conversa` no lead
  - confirmar se a separação das threads do portal por carteira pessoal está estável no runtime após as últimas correções

## Atualização 2026-04-13 - Portal e badge da inbox passaram a refletir tratamento real da carteira pessoal

- a visibilidade de portal foi alinhada à mesma regra da inbox humana:
  - só enxerga a thread quem é dono do lead
  - ou quem deveria ter acesso pela carteira pessoal
- ao responder no portal, as mensagens do cliente daquele lead passam a ser marcadas como lidas no banco
- consequência prática:
  - o badge da `Caixa de Entrada` deixa de ficar preso só porque o escritório respondeu mas o sistema ainda mantinha `portal_mensagens.lida = false`
  - o badge lateral agora reflete `inboxTotal` real, sem somar agendamentos

## Atualização 2026-04-10 - Z-API inbound e outbound validados no tenant operacional

- o canal Z-API do tenant foi validado em produção com:
  - envio do sistema para número externo: `ok`
  - recebimento de número externo para o sistema: `ok`
- a correção final veio de três camadas combinadas:
  - relay público por Supabase Edge Function no padrão do Orbit
  - parser tolerante a múltiplos formatos e métodos
  - match operacional por telefone mascarado, reutilizando lead manual e conversa existente
- leitura prática:
  - o WhatsApp do tenant deixou de depender apenas de outbound
  - inbox humana agora consegue receber mensagens reais do número conectado
  - a frente de WhatsApp saiu da lista de bloqueios P0 de go-live

## Atualização 2026-04-10 - Z-API inbound ganhou Edge Function pública no padrão do Orbit

- durante a investigação do inbound da Z-API, foi comparado o PrevLegal com o repo `fluxrow/orbiitcrm`
- a diferença arquitetural relevante apareceu: no Orbit, a Z-API apontava para uma Supabase Edge Function pública (`/functions/v1/orbit-webhook`), não para uma app route do frontend
- com base nisso, o PrevLegal ganhou a função `supabase/functions/zapi-webhook/index.ts`
- a função foi deployada no projeto operacional `lrqvvxmgimjlghpwavdb` com `--no-verify-jwt`
- healthcheck validado:
  - `https://lrqvvxmgimjlghpwavdb.supabase.co/functions/v1/zapi-webhook?event=health`
- leitura prática:
  - isso cria um alvo de webhook no mesmo padrão que já funcionava no Orbit
  - o próximo teste operacional da Z-API deve usar a Edge Function do Supabase como `Ao receber`
- validação:
  - `supabase functions deploy zapi-webhook --project-ref lrqvvxmgimjlghpwavdb --no-verify-jwt` concluído com sucesso
  - `npm run build` passou após isolar a tipagem da função Deno com `// @ts-nocheck`

## Atualização 2026-04-10 - Z-API inbound passou a reconhecer telefone mascarado ao vincular lead e conversa

- na produção, o webhook inbound já estava chegando e gravando linhas em `mensagens_inbound`
- o problema restante era de vínculo:
  - `lead_id` e `conversa_id` seguiam nulos
  - o lead manual existia, mas o telefone estava salvo como `(41) 99236-1868`
  - o matcher buscava blocos contínuos como `5541992361868`, que não aparecem assim no campo mascarado
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - geração de padrões que sobrevivem à máscara, como `99236` e `1868`
  - busca tolerante em `leads` e `conversas` seguida de normalização em memória
  - quando a conversa antiga é reutilizada, o sistema agora também preenche `lead_id` e `whatsapp_number_id`
- leitura prática:
  - o inbound deixa de depender de telefone “limpo” no banco
  - o comportamento esperado passa a ser reaproveitar o lead manual e a conversa humana já existente

## Atualização 2026-04-09 - Go-live do Google OAuth endurecido no app e nos materiais públicos

- a frente do Google saiu do modo “falta ajustar código” e entrou no modo “falta fechar Console/submissão”
- arquivos principais:
  - `src/app/api/google/auth/route.ts`
  - `public/privacidade/index.html`
  - `public/termos/index.html`
  - `site/privacidade/index.html`
  - `site/termos/index.html`
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md`
- mudanças aplicadas:
  - remoção do escopo desnecessário `calendar.readonly`
  - manutenção apenas dos escopos:
    - `calendar.events`
    - `userinfo.email`
  - textos públicos passaram a explicar explicitamente o uso do Google Calendar
  - foi preparado um material pronto para preencher o Google Auth Platform com menos improviso
- leitura prática:
  - o que ainda falta nessa frente agora é majoritariamente manual:
    - consent screen
    - domínio/branding
    - submissão de verificação
  - o app já está mais alinhado ao que o Google e o cliente esperam ver
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Parser do webhook Z-API foi ampliado para instância web/multi-device

- no teste real, o outbound já funcionava, mas o inbound ainda não aparecia na caixa de entrada
- a hipótese mais forte passou a ser formato de payload da variante `web / multi-device`
- a rota `src/app/api/webhooks/zapi/route.ts` foi endurecida para aceitar também:
  - `messages[0].chatId`
  - `messages[0].author`
  - `messages[0].body`
  - `messages[0].id`
  - `messages[0].fromMe`
- também entrou log defensivo quando o webhook chega sem telefone ou texto suficiente para processamento
- resultado esperado:
  - mensagens recebidas pela instância web/multi-device passam a alimentar `mensagens_inbound`, `conversas` e notificações operacionais
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Inbound Z-API agora cria lead técnico quando o número ainda não existe

- no teste real, o webhook passou a bater no PrevLegal, mas a conversa ainda não aparecia
- o log de produção mostrou o erro:
  - `null value in column "lead_id" of relation "conversas" violates not-null constraint`
- causa:
  - o número que respondeu ainda não existia como lead no tenant
  - o schema atual de `conversas` exige `lead_id`
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - garantir busca do lead por telefone antes da criação da conversa
  - se o telefone não existir, criar automaticamente um lead técnico mínimo em `Cadastro manual`
  - seguir com persistência da mensagem inbound, abertura da conversa e notificação operacional
- resultado esperado:
  - respostas de números novos deixam de morrer no inbound e passam a cair na caixa de entrada
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Placeholder lead do inbound Z-API foi ajustado ao schema real da produção

- no teste seguinte, o webhook continuou chegando corretamente na produção, mas o inbound ainda morria antes de abrir a conversa
- o log de produção mostrou o erro:
  - `Could not find the 'observacoes' column of 'leads' in the schema cache`
- causa:
  - o lead técnico criado pelo webhook tentava gravar `leads.observacoes`
  - essa coluna não existe no schema operacional atual, então a criação do lead falhava e `conversas.lead_id` continuava nulo
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - remover `observacoes` do insert do lead técnico
  - manter o fallback de criação automática, mas preso apenas a colunas confirmadas da produção
- resultado esperado:
  - inbound Z-API de números ainda não reconhecidos deixa de falhar por incompatibilidade de schema
  - a mensagem passa a conseguir abrir conversa e cair na caixa de entrada
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Matcher do inbound Z-API agora reconhece lead manual com telefone formatado

- no banco operacional, o telefone do lead manual do teste apareceu salvo como:
  - `(41) 99236-1868`
- causa do desvio:
  - a primeira busca do webhook priorizava igualdade exata por variantes já normalizadas
  - com telefone salvo formatado, o match podia falhar e o fluxo cair no placeholder
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - manter a busca exata normalizada como primeira etapa
  - adicionar fallback por candidatos usando `like` com sufixo do telefone
  - normalizar os candidatos em memória e priorizar o lead manual quando houver correspondência única
- resultado esperado:
  - respostas vindas do WhatsApp passam a casar com leads manuais mesmo quando o telefone estiver salvo com máscara
  - o sistema evita criar lead técnico desnecessário para números já cadastrados
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Busca global agora tolera acentos e formatações naturais

- o princípio de UX da Fluxrow foi formalizado também no core do PrevLegal:
  - o sistema não deve exigir digitação “perfeita” para encontrar pessoas ou documentos
- arquivos principais:
  - `src/lib/search-normalization.ts`
  - `src/app/api/busca/route.ts`
  - `src/app/api/leads/route.ts`
- mudanças aplicadas:
  - foi criada uma camada compartilhada de normalização para:
    - texto com acento / sem acento
    - números com ou sem máscara
  - a `Ctrl+K` deixou de depender apenas de `ilike` puro do banco
  - a busca global agora combina:
    - candidatos por query bruta
    - candidatos recentes
    - filtro final em memória com normalização
  - a busca de leads também passou a reutilizar a mesma fundação, eliminando divergência entre superfícies
- resultado esperado:
  - `Caua` encontra `Cauã`
  - telefone digitado com ou sem máscara encontra o mesmo lead
  - a experiência de busca fica mais próxima do comportamento humano esperado

## Atualização 2026-04-09 - Webhook Z-API agora tolera body form-urlencoded e texto cru

- o inbound da Z-API ainda falhava em alguns testes mesmo com:
  - rota publicada
  - parser ampliado para payload de instância web
  - match por telefone formatado
- leitura final:
  - a Z-API pode entregar o webhook fora de `application/json`
  - em cenários `web / multi-device`, o body pode vir como:
    - `application/x-www-form-urlencoded`
    - texto cru
    - campos string contendo JSON serializado
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - leitura unificada via `request.text()`
  - suporte a body urlencoded
  - parse recursivo de strings JSON
  - fallback para query params e `raw body`
- resultado esperado:
  - o inbound deixa de depender do formato exato do provider
  - mensagens recebidas pela instância passam a ter chance real de cair na caixa mesmo quando o provider não envia JSON puro
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Inbound Z-API passou a aceitar `GET` em `event=on-receive`

- depois do endurecimento do body, ainda restava uma hipótese plausível na integração web:
  - o painel/proxy da Z-API podia estar chamando o webhook de inbound por `GET`, não só por `POST`
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - `GET` com `event=on-receive` agora reaproveita o mesmo fluxo de processamento usado no `POST`
- resultado esperado:
  - o inbound deixa de depender do método HTTP exato usado pelo provider
- validação:
  - `npm run build` passou

## Arquivos-chave para contexto rápido
- `docs/ROADMAP.md` — histórico completo
- `docs/SESSION_BRIEF.md` — estado atual e transição de IAs
- `docs/EXECUTION_TRACK.md` — trilho executivo de execução e go-live
- `src/lib/events/orchestrator.ts` — orquestrador de gatilhos na mudança de status do lead
- `supabase/migrations/042_event_triggers.sql` — infra de BD para eventos

## Atualização 2026-04-08 - Loop de login virou estado explícito de acesso pendente

- sintoma reportado:
  - usuário conseguia autenticar, entrava na plataforma e quase em seguida era devolvido ao login
- causa confirmada em código:
  - o app distinguia mal `sessão Supabase válida` de `acesso operacional válido ao escritório`
  - quando o usuário não tinha contexto resolvível em `usuarios`, a experiência parecia “login quebrado”
- arquivos principais:
  - `src/app/(dashboard)/layout.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/lib/supabase/middleware.ts`
  - `src/app/acesso-pendente/page.tsx`
- correção:
  - dashboard agora manda para `/acesso-pendente` quando há sessão mas não há contexto do escritório
  - login passou a usar `POST /api/session/login`, com autenticação server-side e cookie já estabilizado antes do redirect
  - middleware passou a tratar `/acesso-pendente` como rota pública
- leitura prática:
  - daqui para frente, se o usuário cair em `acesso-pendente`, o problema não é senha
  - o ponto a revisar é provisionamento / vínculo do usuário no tenant
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Templates Seed da Fase E fechados

- a aba `Automações` agora aplica templates padrão direto no banco
- arquivos principais:
  - `src/app/api/automacoes/triggers/route.ts`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
  - `src/app/api/automacoes/triggers/seed/route.ts`
  - `src/components/automacoes/trigger-config.tsx`
- comportamento:
  - o botão `Templates PrevLegal` deixou de ser placeholder
  - agora dispara um seed idempotente por tenant
  - insere apenas gatilhos faltantes para slots padrão:
    - `new`
    - `contacted`
    - `scheduled`
    - `lost`
  - o seed só usa regras e agentes ativos realmente existentes no tenant atual
  - se já houver gatilho no slot, preserva a configuração atual e sinaliza `skip`
  - a UI mostra feedback com contagem de inseridos, já existentes e indisponíveis
- ajuste técnico importante:
  - as rotas de `event_triggers` foram alinhadas ao `tenant-context` canônico
- validação:
  - `npm run build` passou
- próximo passo:
  - validar em runtime o clique do seed e depois voltar ao modal avançado de criação/edição de gatilhos

## Atualização 2026-04-08 - UX da tela de Gatilhos refinada

- a interface de `Automações` ficou mais legível e menos opaca para o operador
- arquivo principal:
  - `src/components/automacoes/trigger-config.tsx`
- ajustes:
  - o botão `Novo Gatilho` passou a usar contraste explícito e deixou de cair em preto sem texto visível
  - a tela agora mostra o erro real retornado por `/api/automacoes/triggers` quando houver falha
  - a UI também passou a avisar quando faltam pré-requisitos do tenant para o `Templates PrevLegal`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Pré-requisitos dos gatilhos ficaram explícitos na UI

- a validação em runtime mostrou que o seed estava correto, mas o tenant atual ainda não tem base suficiente para popular todos os templates
- estado observado no tenant operacional:
  - nenhuma régua de follow-up ativa
  - nenhum agente ativo
  - nenhum `event_trigger` criado ainda
- ajustes aplicados em `src/components/automacoes/trigger-config.tsx`:
  - `Novo Gatilho` e `Salvar Gatilho` passaram a usar contraste e aparência explícitos, reduzindo risco de botão “bloco preto” por override visual
  - o feedback do seed deixa de parecer “sucesso verde” quando nada foi inserido por falta de recurso e passa a sinalizar aviso
  - o modal desabilita opções sem recurso real e explica o que falta no tenant:
    - régua ativa
    - agente ativo
  - quando houver só 1 agente ativo, a UI informa isso explicitamente
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - criar pelo menos 1 agente de triagem, 1 de confirmação, 1 de reativação e ativar 1 régua para que o `Templates PrevLegal` consiga popular a base

## Atualização 2026-04-08 - Superfície de Agentes virou multiagente canônica

- a tela `/agente` deixou de ser o editor singleton legado e passou a expor a operação real de múltiplos agentes do escritório
- arquivos principais:
  - `src/app/(dashboard)/agente/page.tsx`
  - `src/components/agentes-config.tsx`
  - `src/app/api/agentes/route.ts`
  - `src/app/api/agentes/[id]/route.ts`
  - `src/app/api/agentes/seed/route.ts`
- mudanças principais:
  - `POST /api/agentes` agora persiste `tipo`
  - `PATCH /api/agentes/[id]` também passou a permitir atualização de `tipo`
  - foi criado o seed idempotente `POST /api/agentes/seed`
  - o seed sobe a base recomendada:
    - triagem
    - confirmação de agenda
    - reativação
    - documentos
    - fechamento via `followup_comercial`
  - a UI de agentes agora tem botão `Templates PrevLegal`
  - o papel de fechamento entra nesta rodada sem abrir novo enum/coluna: usamos o tipo já existente `followup_comercial`
- leitura estratégica:
  - isso corrige o descompasso entre a Fase C/D implementada e a tela antiga que ainda parecia “agente único”
  - também deixa o produto mais pronto para operações além do caso previdenciário clássico, onde fechamento/proposta têm papel próprio
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - validar o seed dos agentes em runtime no tenant atual e depois voltar ao seed dos gatilhos

## Atualização 2026-04-08 - Rota rápida de status agora também dispara a Fase E

- foi corrigida uma inconsistência entre os dois caminhos de atualização de status do lead
- arquivo principal:
  - `src/app/api/leads/[id]/status/route.ts`
- correção:
  - a rota rápida de status agora também chama `processEventTriggers` quando o status realmente muda
  - antes disso, os gatilhos da Fase E só rodavam no `PATCH /api/leads/[id]`, o que criava comportamento diferente dependendo do ponto da UI usado pelo operador
- impacto:
  - o teste e a operação ficam mais confiáveis
  - mudar o status pelo fluxo rápido ou pelo update completo do lead passa a acionar a mesma automação
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Templates de gatilho ficaram editáveis e legíveis

- a tela de `Automações` deixou de depender de apagar/recriar para ajustar templates padrão
- arquivos principais:
  - `src/components/automacoes/trigger-config.tsx`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
- mudanças:
  - cada card de gatilho agora mostra:
    - status com nome mais legível
    - resumo humano da ação
    - explicação rápida de por que aquele estágio costuma ser útil
  - foi adicionado botão `Editar` também nos templates padrão
  - o modal passou a servir tanto para criação quanto para edição
  - o modal agora explica em linguagem natural o que vai acontecer quando salvar
- efeito de produto:
  - reduz dependência operacional do time técnico
  - torna os templates do PrevLegal mais próximos de um playbook configurável
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Geração de documentos IA agora salva no módulo canônico

- o beta de documentos IA foi alinhado ao contrato real da tabela `lead_documentos`
- arquivo principal:
  - `src/app/api/leads/[id]/gerar-documento/route.ts`
- correção:
  - o backend agora gera o conteúdo com Claude e sobe um `.txt` real para o bucket `lead-documentos`
  - depois grava o documento com:
    - `arquivo_url`
    - `arquivo_nome`
    - `arquivo_tamanho`
    - `arquivo_tipo`
    - `tenant_id`
    - `created_by`
  - em caso de falha no insert, o arquivo é removido para evitar lixo órfão no bucket
- erro eliminado:
  - `null value in column "arquivo_url" of relation "lead_documentos" violates not-null constraint`
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - testar os três documentos beta em runtime e depois decidir a próxima camada de produto:
    - revisão
    - versionamento
    - análise documental por IA

## Atualização 2026-04-08 - Follow-up por status validado no banco e visibilidade melhorada

- o teste com o lead `VALTERLINO AQUINO S RIBEIRO` confirmou que os gatilhos por status estavam funcionando no backend
- estado confirmado:
  - mudança para `contacted` criou uma run
  - mudança seguinte para `lost` cancelou a anterior e abriu nova run ativa
- isso mostrou dois pontos:
  - não dependia de WhatsApp conectado para a run nascer
  - a UI do lead ainda não dava feedback bom o suficiente logo após a troca de status
- ajustes aplicados:
  - `src/components/followup-lead.tsx`
    - atualização automática a cada 10 segundos
    - refresh ao voltar foco para a aba
    - botão `Atualizar`
  - `src/app/api/followup/worker/route.ts`
    - remoção da regra antiga que dava stop automático em `lost`
    - stop automático mantido apenas para `converted`
- efeito de produto:
  - o template `lost -> reativação` deixa de entrar em conflito com o worker
  - a validação operacional fica mais legível para o escritório
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Execução manual do follow-up adicionada ao detalhe do lead

- para fechar a validação sem depender do cron, a run ativa do lead agora pode executar o passo atual manualmente
- arquivos principais:
  - `src/app/api/leads/[id]/followup/[runId]/route.ts`
  - `src/components/followup-lead.tsx`
- mudanças:
  - nova ação `executar_agora` na API da run
  - o botão `Executar agora` aparece nas runs ativas do detalhe do lead
  - a execução manual:
    - usa o canal real do step
    - registra `step_disparado` ou `step_falhou`
    - avança o próximo passo ou conclui a run
- efeito de produto:
  - a Fase E fica testável ponta a ponta sem depender exclusivamente do cron
  - a operação ganha um mecanismo seguro de validação e destravamento
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Motivo da falha agora aparece no histórico do follow-up

- o refinamento final de UX da Fase E foi concluído
- arquivos principais:
  - `src/app/api/leads/[id]/followup/route.ts`
  - `src/components/followup-lead.tsx`
- mudança:
  - a UI agora mostra o motivo real de `step_falhou` usando `followup_events.metadata.erro`
- caso validado:
  - no lead `VALTERLINO AQUINO S RIBEIRO`, a run falhou por:
    - `Lead sem telefone para disparo via WhatsApp`
- efeito:
  - a validação do escritório fica autoexplicativa
  - a frente de follow-up pode ser considerada fechada do ponto de vista de engine + visibilidade básica
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Importador ficou flexível para planilhas com cabeçalhos

- a frente seguinte começou pelo ponto mais pragmático: tornar o import atual menos frágil para fontes variadas
- arquivos principais:
  - `src/lib/import-schema.ts`
  - `src/app/api/import/route.ts`
  - `src/app/(dashboard)/leads/import/page.tsx`
- mudanças:
  - o backend agora detecta planilhas por cabeçalhos reconhecíveis
  - colunas em ordem diferente passaram a funcionar quando os nomes forem inteligíveis
  - o layout legado por posição fixa continua suportado
  - o import já aproveita mais campos quando existirem:
    - `telefone`
    - `email`
    - `categoria_profissional`
  - a UI mostra se a leitura foi:
    - `header_mapping`
    - ou `legacy_fixed`
  - a UI também mostra os campos detectados
- limite explicitado:
  - o import atual ainda pertence ao core previdenciário e continua orientado a `NB`
  - fontes sem `NB`, como Google Maps / Places e listas comerciais externas, entram numa próxima fase
- documento criado:
  - `docs/IMPORTADOR_INTELIGENTE_PLAN.md`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agenda passou a suportar Google por usuário com fallback do escritório

- a frente de agendamentos ganhou a foundation correta para operação de equipe real
- arquivos principais:
  - `supabase/migrations/043_user_calendar_ownership.sql`
  - `src/lib/google-calendar.ts`
  - `src/app/api/google/auth/route.ts`
  - `src/app/api/google/callback/route.ts`
  - `src/app/api/google/status/route.ts`
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/app/(dashboard)/agendamentos/page.tsx`
  - `src/app/(dashboard)/perfil/page.tsx`
  - `src/components/novo-agendamento-modal.tsx`
  - `src/components/gestao-usuarios.tsx`
- mudanças:
  - cada usuário agora pode conectar o próprio Google Calendar
  - admin continua podendo conectar um calendário padrão do escritório
  - o sistema tenta usar primeiro o calendário do responsável do agendamento
  - se ele não tiver conexão própria, usa o calendário padrão do escritório como fallback
  - cada agendamento agora registra de onde veio o evento:
    - `calendar_owner_scope = user`
    - `calendar_owner_scope = tenant`
  - remarcação e cancelamento voltam para a mesma origem do evento
  - a UI de `Agendamentos` ficou mais explícita sobre:
    - meu Google
    - fallback do escritório
    - qual calendário será usado
  - o `Perfil` virou a área natural para o usuário conectar o próprio Google
  - a gestão de usuários passou a sinalizar quem já tem agenda própria conectada
- efeito de produto:
  - permite cenário de secretária/admin agendando para outro responsável sem concentrar tudo no calendário do admin
  - reduz ruído operacional entre criação do agendamento e propriedade real do compromisso
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Inbox estabilizada e permissões por usuário iniciadas

- a `Caixa de Entrada` recebeu um ajuste importante de robustez:
  - conversas sem status válido agora são normalizadas como `agente`
  - a aba ativa passou a ser sincronizada com a URL
  - a seleção é limpa quando deixa de pertencer ao filtro escolhido
- isso reduz o caso em que o operador sente que só `Todas` e `Portal` funcionam
- em paralelo, o sistema ganhou a primeira foundation real de permissões granulares por usuário
- arquivos principais:
  - `supabase/migrations/044_user_permissions_foundation.sql`
  - `src/lib/permissions.ts`
  - `src/components/gestao-usuarios.tsx`
  - `src/app/api/usuarios/route.ts`
  - `src/app/api/usuarios/[id]/route.ts`
  - `src/app/api/usuarios/convidar/route.ts`
- modelo novo:
  - a role continua existindo como preset
  - cada usuário pode ter permissões ajustadas ponto a ponto
- permissões já aplicadas em backend para áreas críticas:
  - usuários
  - agentes
  - automações / gatilhos / réguas
  - reatribuição de agenda
  - listas
  - financeiro
  - operação humana da inbox
- limite atual:
  - ainda não é substituição total de todo `isAdmin` do sistema
  - é uma foundation útil focada nos módulos mais sensíveis
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agenda desktop virou painel lateral de operação

- a tela de `Agendamentos` deu mais um salto de UX no desktop:
  - o calendário mensal ficou mais compacto
  - a fila operacional saiu da parte inferior e foi para uma coluna lateral fixa
  - o operador agora enxerga `Precisa confirmação`, `Confirmados` e `Histórico recente` sem rolar a página
- a decisão de produto foi tratar a agenda menos como “calendário cheio” e mais como painel de execução
- no mobile e em telas menores, a composição empilhada continua existindo para preservar legibilidade
- arquivo principal:
  - `src/app/(dashboard)/agendamentos/page.tsx`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Inteligência documental com Docling formalizada

- foi criada a spec oficial de integração documental em:
  - `docs/DOCLING_INTEGRATION_PLAN.md`
- tese aprovada:
  - o maior ROI inicial não está em gerar mais petições, e sim em compreender documentos já enviados
  - `lead_documentos` vira a primeira superfície prioritária
  - `agent_documents` entra na segunda fase
- arquitetura recomendada:
  - upload canônico continua igual
  - entra uma fila assíncrona de processamento
  - um worker Python com `Docling` gera texto, markdown, JSON e chunks
  - o produto passa a consumir isso em busca, agentes e análise futura
- próximo passo sugerido:
  - implementar a `Fase A` da foundation documental

## Atualização 2026-04-08 - Fase A da inteligência documental entrou no código

- a foundation documental saiu do plano e entrou no runtime:
  - `supabase/migrations/045_document_processing_foundation.sql`
  - `src/lib/document-processing.ts`
  - `src/app/api/document-processing/worker/route.ts`
- comportamento novo:
  - uploads manuais do lead entram na fila de processamento
  - uploads do portal entram na fila de processamento
  - documentos gerados por IA também entram na fila
  - a listagem de documentos do lead agora pode mostrar:
    - `Na fila do Docling`
    - `Processando`
    - `Estruturado`
    - `Falhou`
- tela principal atualizada:
  - `src/app/(dashboard)/leads/[id]/page.tsx`
- foundation externa já preparada:
  - `workers/docling/app.py`
  - `workers/docling/requirements.txt`
  - `workers/docling/README.md`
- limite atual:
  - parsing binário real ainda depende de `DOCLING_SERVICE_URL`
  - sem isso, o sistema só processa inline arquivos textuais e mantém os demais como fila pendente/foundation
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agendamentos ficaram compatíveis com schema legado da produção

- a criação de agendamento deixou de quebrar quando a produção ainda não tem `calendar_owner_scope`, `calendar_owner_usuario_id` e `calendar_owner_email` em `agendamentos`
- arquivos ajustados:
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/lib/permissions.ts`
- comportamento novo:
  - a API tenta persistir ownership do calendário, mas rebaixa para o payload legado se a `043` ainda não estiver aplicada
  - `PATCH` e `DELETE` leem o agendamento atual com fallback de select para conviver com schema incompleta
  - update/cancel do evento Google usam owner columns apenas quando elas existem de fato
- impacto prático:
  - o modal `Novo agendamento` deixa de falhar com erro de `schema cache`
  - a agenda continua operacional até o banco receber a migration `043`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agenda desktop ficou mais operacional em larguras comuns

- a página de agendamentos deixou de depender de `xl` para mostrar a lateral operacional
- arquivo principal:
  - `src/app/(dashboard)/agendamentos/page.tsx`
- comportamento novo:
  - a composição com calendário + rail agora aparece em `lg`
  - o rail ganhou um card `Em foco` com o item selecionado ou mais prioritário
  - as células do calendário foram comprimidas para reduzir scroll e abrir espaço para contexto
- impacto prático:
  - notebooks e janelas menores já mostram o trabalho a fazer sem jogar a fila para baixo
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - API de agendamentos foi alinhada ao novo schema já migrado

- após a aplicação da `043`, surgiu um bug novo de runtime:
  - o evento era criado no Google e podia chegar por e-mail
  - mas a resposta da API quebrava com embed ambíguo entre `agendamentos` e `usuarios`
- causa:
  - `agendamentos` passou a ter duas FKs para `usuarios`
  - os selects ainda usavam `usuarios(...)` sem explicitar qual relação era a do responsável
- correção aplicada:
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - os embeds agora usam:
    - `usuarios:usuarios!agendamentos_usuario_id_fkey(...)`
- impacto prático:
  - a listagem de agendamentos deixa de “sumir” depois da migration
  - a criação/edição volta a responder corretamente no modo já migrado
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Agenda runtime validada, foco agora é go-live

- os testes reais da agenda ficaram verdes:
  - `listagem antiga: ok`
  - `novo agendamento: ok`
  - `remarcar: ok`
  - `cancelar: ok`
- leitura executiva:
  - a frente de agenda Google saiu da zona vermelha técnica
  - o próximo gargalo real para segunda-feira é:
    - confiança comercial do OAuth do Google
    - smoke test final do tenant
- documentos novos de execução:
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/TENANT_SMOKE_TEST_CHECKLIST.md`

## Atualização 2026-04-09 - Admin de canais WhatsApp ficou menos ambíguo e a Z-API do teste revelou webhook legado

- a tela de admin do tenant ajustou a UX dos canais WhatsApp em:
  - `src/app/admin/[id]/page.tsx`
- comportamento novo:
  - ao clicar em `Editar` ou `Novo canal`, a viewport desce automaticamente até o formulário inline
  - quando a reautenticação admin expira, a UI mostra aviso antes do redirecionamento
- impacto prático:
  - o operador deixa de interpretar `Editar` e `Novo Z-API/Twilio` como botões sem ação
  - `Definir padrão` e demais mutações passam a ficar mais inteligíveis quando a sessão recente venceu
- leitura operacional da Z-API de teste:
  - o print enviado mostrava webhooks preenchidos
  - mas os endpoints ainda apontavam para `orbit-zapi-webhook` em um projeto antigo do Orbit
  - isso não deve ser tratado como inbound ativo do PrevLegal
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - PrevLegal ganhou webhook inbound nativo para Z-API

- o produto já enviava via Z-API pelo canal configurado no admin, mas ainda não tinha uma rota inbound própria
- arquivos principais:
  - `src/lib/whatsapp-provider.ts`
  - `src/app/api/webhooks/zapi/route.ts`
- melhorias entregues:
  - resolução de tenant/canal pelo `zapi_instance_id`
  - suporte inicial a `event=on-receive`
  - parsing defensivo de payload para telefone, mensagem textual, `fromMe` e ID externo
  - upsert de conversa + mensagem inbound + notificação
  - stop automático de follow-up quando o lead responde via canal Z-API
- impacto prático:
  - o time deixa de depender do webhook antigo do Orbit
  - a instância Z-API do tenant agora pode apontar para o PrevLegal de forma canônica
  - inbound e outbound passam a existir na mesma trilha do produto atual
- validação:
  - `npm run build` passou

## Atualização 2026-04-13 - Seed de agentes passou a oferecer dois modelos operacionais explícitos

- o seed de agentes deixou de estar implicitamente ancorado apenas no contexto da Ana
- arquivos principais:
  - `src/lib/agent-seed-profiles.ts`
  - `src/app/api/agentes/seed/route.ts`
  - `src/components/agentes-config.tsx`
  - `src/app/(dashboard)/agente/page.tsx`
- comportamento novo:
  - a UI de `/agente` agora mostra dois kits prontos de onboarding:
    - `Modelo Jessica`
      - benefícios previdenciários
      - acolhimento jurídico inicial
      - conversão para consulta / análise
    - `Modelo Ana`
      - planejamento previdenciário consultivo
      - diagnóstico comercial
      - fechamento de planos
  - o usuário escolhe explicitamente qual modelo aplicar antes de rodar o seed
  - os prompts-base, fluxos, objeções, gatilhos de escalada e fallback ficaram distintos por contexto
- leitura de produto:
  - template de agente não pode mais nascer enviesado por um único piloto
  - o produto agora oferece um atalho coerente tanto para o caso jurídico/previdenciário tradicional quanto para o comercial consultivo de planejamento

## Atualização 2026-04-14 - Campanhas ganharam fundação para público por contatos específicos

- a frente de campanhas deixou de depender só de lista inteira como unidade de disparo
- arquivos principais:
  - `src/app/(dashboard)/campanhas/page.tsx`
  - `src/app/api/campanhas/route.ts`
  - `src/app/api/campanhas/[id]/disparar/route.ts`
  - `supabase/migrations/047_campaign_selected_leads.sql`
  - `supabase/manual/2026-04-14_add_campaign_selected_leads.sql`
- comportamento novo:
  - a campanha agora pode operar em dois modos:
    - `lista inteira`
    - `contatos específicos`
  - quando o operador escolhe contatos específicos, o sistema:
    - cria/reusa uma lista técnica `Seleção personalizada`
    - persiste os destinatários em `campanha_leads`
    - faz o disparo respeitar esse recorte explícito
- pendência operacional:
  - aplicar o patch manual `2026-04-14_add_campaign_selected_leads.sql` no banco de produção antes do reteste em runtime

## Atualização 2026-04-14 - Troca manual de aba na inbox passou a limpar deep link antigo

- a `Caixa de Entrada` ainda podia parecer travada porque query params antigos (`conversaId`, `telefone`, `leadId`) reabriam a thread anterior logo após o clique do operador
- ajuste aplicado:
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
  - ao trocar de aba manualmente, a tela agora limpa esses parâmetros e reseta a hidratação de deep link
- impacto prático:
  - o clique do operador volta a mandar na navegação
  - reduz a sensação de box/aba “não responde”
