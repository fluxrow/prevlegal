# PrevLegal — TENANT_SMOKE_TEST_CHECKLIST.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Checklist canônico para validar um tenant real antes de colocar o produto para rodar com cliente.
> Última atualização: 10/04/2026

## Objetivo

Fechar um smoke test enxuto, mas suficiente, para evitar go-live “meio verde”.

## Tenant de referência atual

- `Fluxrow`

## Status consolidado em 10/04/2026

### Já validado

- login do responsável funciona
- não cai mais em `acesso-pendente`
- admin continua acessível
- `ultimo_acesso` passou a refletir uso real
- follow-up:
  - gatilhos seedados ativos
  - régua ativa
  - mudança de status cria run
  - `Executar agora` registra evento
  - motivo de falha aparece
- agenda:
  - `Conectar meu Google` funciona
  - `Conectar calendário do escritório` funciona
  - criar agendamento funciona
  - novo agendamento aparece na UI
  - agendamentos antigos aparecem
  - remarcar funciona
  - cancelar funciona
- documentos:
  - `Petição Inicial`
  - `Procuração`
  - `Requerimento INSS`
- WhatsApp:
  - Z-API outbound funciona
  - Z-API inbound funciona
- busca:
  - nomes com/sem acento
  - telefone com/sem máscara

### Ainda precisa de passe final antes do go-live

- convidar um usuário novo e aceitar convite
- validar permissões customizadas em usuário não-admin
- validar inbox humana completa com fluxo inbound -> abrir conversa -> responder
- validar portal no tenant real com:
  - acesso
  - timeline
  - documentos
  - mensagens
  - confirmação/remarcação

## Etapas

### 1. Login e acesso

- login do responsável funciona
- não cai mais em `acesso-pendente`
- admin continua acessível
- `ultimo_acesso` reflete uso real no tenant detail

### 2. Usuários e permissões

- convidar um usuário novo
- aceitar convite
- validar role base
- validar permissões customizadas
- validar restrição de telas/ações

### 3. Caixa de entrada

- abas filtram corretamente:
  - todas
  - portal
  - agente
  - atendimento
  - aguardando
  - resolvidas
- conversa abre
- resposta humana funciona

### 4. Follow-up e automações

- gatilhos seedados ativos
- régua ativa
- mudança de status cria run
- `Executar agora` registra evento
- motivo de falha aparece quando houver erro operacional

### 5. Portal

- acesso ao portal funciona
- timeline carrega
- pendências/documentos funcionam
- mensagens aparecem
- confirmação/remarcação seguem operacionais

### 6. Agenda

- `Conectar meu Google` funciona
- `Conectar calendário do escritório` funciona
- criar agendamento funciona
- novo agendamento aparece na UI
- agendamentos antigos aparecem
- remarcar funciona
- cancelar funciona

### 7. Documentos

- upload manual funciona
- documentos IA básicos funcionam:
  - petição inicial
  - procuração
  - requerimento INSS
- documento aparece no lead

## Critério de pronto

Pode considerar o tenant pronto para rodar quando:

- todos os fluxos acima estiverem `ok`
- não houver erro de schema/runtime nos fluxos principais
- os bloqueios restantes forem apenas:
  - visual
  - premium
  - ou melhoria não crítica

## Registro recomendado

Ao concluir o smoke test:

- atualizar `SESSION_BRIEF`
- atualizar `EXECUTION_TRACK`
- criar sessão em `Sessoes/`
- registrar qualquer erro residual em `LEARNINGS`
