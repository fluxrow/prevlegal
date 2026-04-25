# PrevLegal — OPERATIONAL_BOOK_DOCUMENTS.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica para preparação de minuta, documentos do lead e parsing documental.

## Objetivo

Este guia existe para responder:

- como a geração de minuta deve funcionar
- quando a extração de dados do cliente entra
- quando o operador precisa preencher manualmente
- onde Docling entra e onde ainda não entra

## Regra operacional

- a geração de minuta nunca deve sair com placeholder obrigatório vazio
- o contrato pode combinar:
  - dados extraídos da conversa
  - dados do lead já cadastrados
  - dados manuais do operador
- se faltar campo obrigatório, o sistema deve bloquear e pedir complemento manual

## Fluxo certo de minuta

1. escolher o template do tenant
2. carregar lead + tenant
3. resolver a conversa principal do lead
4. extrair dados estruturados do cliente da conversa
5. montar `placeholderValues`
6. derivar placeholders obrigatórios do próprio `corpo_html`
7. bloquear com `422` se houver faltantes
8. só então gerar PDF, salvar no storage e registrar evento

## Fonte dos dados

### 1. Extração da conversa

É a fonte principal para dados civis/documentais como:

- nome completo
- nacionalidade
- estado civil
- profissão
- CPF
- RG
- e-mail
- endereço quebrado em rua, número, bairro, cidade e CEP

### 2. Lead já cadastrado

Serve como fallback para:

- nome
- CPF
- telefone
- e-mail
- NB
- data de nascimento
- idade

### 3. Dados manuais do operador

Ainda são necessários principalmente para os campos comerciais do contrato:

- valor total
- valor total por extenso
- parcelamento por extenso
- primeira parcela
- primeira parcela por extenso
- datas das parcelas
- data do contrato por extenso

## Regra dos faltantes

- se um placeholder usado no HTML estiver vazio, a geração deve parar
- a resposta correta é `422`
- a UI deve mostrar:
  - campos extraídos já preenchidos
  - campos faltantes destacados
  - preenchimento manual antes de gerar o documento

## Templates de contrato

Os templates são por tenant e ficam em `contract_templates`.

Cada template deve ter:

- `tipo`
- `corpo_html`
- `placeholders_definidos`
- `ativo`

O produto não deve assumir uma lista fixa menor do que o HTML real usa.
O HTML é a fonte prática dos placeholders obrigatórios.

## Docling

Docling não é pré-requisito do smoke de conversa/campanha.

Hoje o papel dele é:

- enriquecer o tratamento de documentos do lead
- guardar `plain_text`, `markdown`, `raw_json` e chunks
- suportar parsing mais inteligente de binários e anexos

Docling entra quando o fluxo depende de leitura documental real, como:

- CNIS
- PDFs digitalizados
- documentos anexados pelo lead

Docling não precisa bloquear:

- disparo
- abordagem inicial
- resposta do agente
- preparação básica de minuta baseada na conversa

## Estado atual correto

- a foundation de processamento documental existe
- existe worker de `document_processing`
- existe schema para jobs, parsed contents e chunks
- a preparação de minuta já usa conversa + extração + bloqueio por faltantes
- Docling ainda é camada de maturidade documental, não fundação do smoke comercial

## Cuidados que não podem ser esquecidos

- template real do tenant e builder do código precisam evoluir juntos
- não permitir PDF “bonito, mas vazio”
- não inventar dado documental com IA
- manter contrato como ação assistida, não totalmente autônoma, enquanto o playbook ainda está em validação

## Quando considerar o fluxo saudável

- preview mostra exatamente os faltantes
- operador consegue completar manualmente
- PDF sai com placeholders resolvidos
- arquivo entra no bucket certo
- evento/timeline são registrados
