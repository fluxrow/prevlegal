# PrevLegal — OPERATIONAL_BOOK_INBOX.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica da inbox humana e da colaboração interna por lead.

## Objetivo

Este guia existe para responder:

- quem vê o quê na inbox
- como funciona a colaboração interna
- quando a conversa está com agente, humano ou aguardando
- como handoff deve acontecer sem bagunçar a carteira

## Regra principal

A inbox humana nasce pessoal por padrão.

Isso significa:

- o usuário vê principalmente a própria carteira
- a visibilidade vem do `responsavel_id` do lead
- uma conversa também pode aparecer para quem está com ela assumida

Não é correto tratar a inbox como fila global invisível para todo mundo por padrão.

## Regra de visibilidade

Uma conversa fica visível quando pelo menos uma destas condições é verdadeira:

- o lead pertence ao usuário (`responsavel_id = usuario atual`)
- a conversa está assumida pelo usuário (`assumido_por = usuario atual`)

Essa mesma lógica sustenta:

- contagem de pendências
- badges da inbox
- acesso prático à carteira

## Estados da conversa

Os estados operacionais relevantes são:

- `agente`
- `humano`
- `aguardando_cliente`
- `resolvido`
- `financeiro`
- `juridico`

Leitura prática:

- `agente` = IA conduzindo a conversa
- `humano` = operador assumiu
- `aguardando_cliente` = equipe já fez sua parte e espera retorno
- `resolvido` = thread encerrada operacionalmente
- `financeiro` / `juridico` = especialização por etapa

## Colaboração interna

Cada lead pode ter uma thread interna própria.

Essa thread sustenta:

- comentários internos
- tasks
- handoffs
- current owner

O objetivo é evitar que a coordenação da equipe fique espalhada em ferramentas externas.

## Handoff interno

Fluxo certo:

1. escolher usuário de destino
2. registrar motivo
3. definir status operacional de destino
4. atualizar `responsavel_id` do lead
5. atualizar o dono atual da thread interna
6. registrar o handoff no histórico interno
7. ajustar a conversa quando ela existir

## Regra do handoff

Handoff não é só “comentar no lead”.
Ele precisa mudar o estado operacional real do caso.

Quando houver conversa:

- `agente` pode devolver a conversa para IA
- `humano`, `aguardando_cliente`, `resolvido` atualizam a thread real

## Tasks internas

Tasks servem para transformar contexto em ação concreta.

Elas devem responder:

- o que precisa ser feito
- por quem
- com qual prioridade
- até quando

Se a badge não aponta para ação real, ela é ruído.

## Pendências

O bloco de pendências deve representar trabalho acionável:

- portal não lido
- conversa humana com não lidas
- agendamento pendente

Não é correto inflar badge com estado que não exige ação.

## Quando considerar a inbox saudável

- cada operador consegue focar na própria carteira
- handoff muda dono e contexto, não só gera comentário
- tasks abertas aparecem ligadas ao lead certo
- badges representam trabalho real
- a conversa não some quando muda de etapa, só muda de caixa correta
