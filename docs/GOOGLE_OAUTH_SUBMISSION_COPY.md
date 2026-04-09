# PrevLegal — GOOGLE_OAUTH_SUBMISSION_COPY.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Material pronto para preencher o Google Auth Platform com menos improviso.
> Última atualização: 09/04/2026

## Campos principais

### App name

`PrevLegal`

### User support email

`fbcfarias@icloud.com`

### Developer contact email

`fbcfarias@icloud.com`

### Homepage

`https://www.prevlegal.com.br`

### Privacy policy

`https://www.prevlegal.com.br/privacidade`

### Terms of service

`https://www.prevlegal.com.br/termos`

## Descrição curta do app

O PrevLegal é uma plataforma operacional para captação previdenciária e rotina comercial de escritórios e operações parceiras. O produto organiza leads, agenda, mensagens, documentos e automações operacionais em um único ambiente.

## Justificativa de uso do Google Calendar

O Google Calendar é utilizado para conectar a agenda do responsável ou do escritório ao fluxo operacional do PrevLegal. A integração permite:

- criar agendamentos
- atualizar/remarcar compromissos
- cancelar compromissos
- identificar qual calendário está conectado

O acesso é usado apenas para suportar a agenda operacional do próprio usuário dentro do produto.

## Escopos usados

### `https://www.googleapis.com/auth/calendar.events`

Usado para criar, atualizar, remarcar e cancelar eventos de consulta e compromissos operacionais gerados pelo PrevLegal.

### `https://www.googleapis.com/auth/userinfo.email`

Usado para identificar o e-mail da conta Google conectada e exibir ao usuário qual calendário está ativo no produto.

## Texto curto para explicar os escopos

O PrevLegal usa acesso de agenda apenas para operar compromissos criados dentro da plataforma. O acesso ao e-mail do usuário é utilizado somente para identificar qual conta Google foi conectada.

## Checklist de submissão

- branding preenchido
- links públicos válidos
- domínio consistente com o app
- escopos mínimos revisados
- test users configurados enquanto a verificação não sai
- vídeo curto do fluxo preparado, se o Google pedir

## Roteiro de vídeo, se necessário

1. abrir `https://app.prevlegal.com.br/login`
2. entrar na plataforma
3. abrir `/agendamentos`
4. clicar em `Conectar meu Google`
5. mostrar o consentimento
6. concluir a conexão
7. criar um agendamento
8. mostrar que o evento aparece na rotina do produto
9. remarcar
10. cancelar

## Observação

Se o Google pedir mais contexto, manter a explicação simples:

- não é um agregador genérico de dados Google
- não lê e-mails
- não acessa Drive
- não acessa arquivos
- não executa ações fora da agenda do usuário
