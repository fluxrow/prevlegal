# PrevLegal — OPERATIONAL_BOOK_PORTAL.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica do portal do cliente e da relação entre lead, timeline, documentos e sessão externa.

## Objetivo

Este guia existe para responder:

- o que o portal do cliente precisa entregar
- como o acesso é resolvido
- quais superfícies devem ser visíveis ao cliente

## Princípio

O portal não é uma segunda aplicação independente.
Ele é a superfície controlada do lead para:

- ver documentos compartilhados
- acompanhar timeline
- trocar mensagens
- ver/agendar compromissos quando a feature estiver disponível

## Acesso

O portal é resolvido por `portal_token` do lead.

Fluxo certo:

1. lead tem `portal_token`
2. link operacional é gerado
3. cliente acessa `/portal/[token]`
4. o backend resolve lead + tenant + branding
5. uma sessão de portal pode ser criada/validada quando a foundation de identidade estiver presente

## Dados que o portal mostra

### Branding

Deve vir de:

- tenant
- configuração atual do tenant

### Documentos

Mostrar apenas documentos explicitamente compartilhados com o cliente.

### Mensagens

O portal precisa separar:

- mensagem do cliente
- mensagem do escritório

e marcar leitura corretamente.

### Timeline

A timeline pode ser:

- explícita, via `portal_timeline_events`
- derivada, quando a foundation explícita ainda não cobre tudo

### Agendamentos

O portal deve mostrar:

- próximo agendamento útil
- histórico recente suficiente para contexto

## Regra de visibilidade

Nem todo evento interno deve aparecer no portal.

O portal deve mostrar:

- o que ajuda o cliente a entender o andamento
- o que pede ação do cliente
- o que reduz ansiedade operacional

O portal não deve vazar:

- notas internas
- estados técnicos de fila
- decisões internas de operação

## Estado correto hoje

- há endpoint de link do portal por lead
- há payload com branding, documentos, mensagens, timeline e agendamento
- há foundation de viewer/sessão
- há pendências documentais e timeline explícita quando a tabela existe

## Próximo nível de maturidade

- identidade mais robusta do portal
- pedidos de documento mais ricos
- remarcação mais madura
- timeline mais explícita e menos derivada
- integração melhor com contrato, assinatura e etapas formais do caso

## Quando considerar o portal saudável

- o link abre o lead correto
- branding bate com o tenant correto
- documentos compartilhados aparecem sem vazamento indevido
- mensagens funcionam com contagem de não lidas coerente
- timeline dá segurança ao cliente sem expor ruído interno
