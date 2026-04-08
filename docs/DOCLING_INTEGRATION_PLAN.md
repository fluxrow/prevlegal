# DOCLING_INTEGRATION_PLAN.md

> Plano oficial para introduzir parsing documental estruturado com Docling no PrevLegal.
> Data: 08/04/2026

---

## Objetivo

Adicionar uma camada canônica de ingestão e estruturação documental para que arquivos deixem de ser apenas storage/passivo e passem a virar contexto utilizável por:

- agentes
- operação humana
- análise documental
- busca
- automações futuras

O Docling entra como motor de parsing e OCR estrutural, não como substituto completo do fluxo de IA generativa.

---

## Por que Docling

O Docling é especialmente útil para o PrevLegal porque:

- converte PDFs, DOCX, XLSX, HTML e imagens para formato estruturado
- preserva ordem de leitura, tabelas e OCR
- exporta texto, markdown e JSON rico
- roda localmente, o que ajuda com privacidade e material jurídico sensível

Referências oficiais:

- https://github.com/docling-project/docling
- https://docling.site/

---

## Tese de produto

Hoje o PrevLegal já possui:

- upload de documentos do lead
- upload de documentos pelo portal
- documentos na base do agente
- beta de geração de documentos IA

Mas esses fluxos ainda tratam o arquivo como:

- storage
- link
- metadado

Não como conhecimento estruturado.

O ganho real não está em “gerar mais petições” primeiro. O maior ROI está em:

1. entender documentos já enviados
2. deixar documentos pesquisáveis
3. melhorar o contexto dos agentes
4. preparar a próxima camada de análise documental

---

## Onde entra primeiro com mais ROI

### Fase 1 — Lead documentos

Primeira prioridade:

- `lead_documentos`

Motivo:

- já existe volume real
- já existe storage e contrato canônico
- melhora operação do escritório imediatamente
- pode alimentar análise, resumo e checklist

Casos de uso:

- resumir documento do cliente
- extrair conteúdo útil de PDF escaneado
- identificar se o documento parece CNIS, procuração, laudo ou requerimento
- permitir busca interna por conteúdo

### Fase 2 — Base de conhecimento do agente

Segunda prioridade:

- `agent_documents`

Motivo:

- melhora qualidade do contexto do agente
- reduz dependência de prompt estático
- deixa a base mais pesquisável e reutilizável

### Fase 3 — Análise documental

Terceira prioridade:

- revisão assistida
- checklist de pendências
- comparação entre documento enviado e expectativa do fluxo

---

## Arquitetura recomendada

### Camadas

1. Upload canônico
- o arquivo continua entrando no Supabase Storage
- o registro continua entrando em `lead_documentos` ou `agent_documents`

2. Job de processamento
- cada novo documento elegível gera um job assíncrono

3. Worker Docling
- serviço separado em Python
- baixa o arquivo via URL assinada curta ou path controlado
- processa o documento
- devolve saída estruturada

4. Persistência estruturada
- texto limpo
- markdown
- JSON lossless
- chunks derivados

5. Consumo no produto
- resumo
- busca
- contexto de agentes
- análise assistida
- automações

---

## Modelo mínimo de dados

### `document_processing_jobs`

Responsável pela fila operacional.

Campos sugeridos:

- `id`
- `tenant_id`
- `source_type`
  - `lead_documento`
  - `agent_document`
- `source_id`
- `storage_path`
- `status`
  - `pending`
  - `processing`
  - `done`
  - `failed`
- `parser`
  - `docling`
- `parser_version`
- `error_message`
- `started_at`
- `finished_at`
- `created_at`

### `document_parsed_contents`

Responsável pelo conteúdo estruturado principal.

Campos sugeridos:

- `id`
- `tenant_id`
- `source_type`
- `source_id`
- `plain_text`
- `markdown`
- `raw_json`
- `doc_type_guess`
- `language`
- `page_count`
- `has_ocr`
- `created_at`
- `updated_at`

### `document_chunks`

Responsável por consumo posterior em busca e embeddings.

Campos sugeridos:

- `id`
- `tenant_id`
- `source_type`
- `source_id`
- `parsed_content_id`
- `chunk_index`
- `content`
- `page_from`
- `page_to`
- `section_title`
- `metadata`
- `created_at`

---

## Fluxo operacional recomendado

### Upload de documento do lead

1. arquivo sobe normalmente
2. insert em `lead_documentos`
3. cria `document_processing_job`
4. worker Docling processa
5. grava `document_parsed_contents`
6. grava `document_chunks`
7. documento passa a aparecer como:
   - `processado`
   - `falhou`
   - `pendente`

### Upload na base do agente

1. arquivo entra em `agent_documents`
2. cria job
3. Docling estrutura o material
4. agente passa a poder consultar conteúdo mais limpo

---

## Uso de produto por superfície

### Lead

- resumo do documento
- preview estruturado
- indicação de tipo provável
- busca textual interna
- sugestão de pendência documental

### Agente

- base de conhecimento mais rica
- chunks melhores para recuperação
- menos dependência de texto cru

### Portal

- no futuro, documentos enviados pelo cliente podem gerar:
  - confirmação automática de recebimento útil
  - classificação inicial
  - aviso para equipe

### Documentos IA

- o beta atual de geração não precisa depender de Docling para nascer
- mas a futura revisão e análise pode usar o conteúdo parseado como contexto

---

## Tipos de documento prioritários no PrevLegal

Primeira leva sugerida de classificação provável:

- `cnis`
- `procuracao`
- `requerimento_inss`
- `laudo_medico`
- `peticao`
- `identidade`
- `comprovante_residencia`
- `outro`

No início, isso pode ser heurístico ou via classificação leve posterior.

---

## Stack proposta

### Aplicação principal

- Next.js continua orquestrando upload, jobs e consumo

### Worker documental

- serviço Python pequeno
- dependência principal: `docling`
- pode rodar:
  - local/dev
  - worker dedicado
  - container separado no futuro

### Banco

- Supabase para jobs e conteúdo estruturado

### Storage

- Supabase Storage continua como fonte dos arquivos originais

---

## Ordem de implementação

### Fase A — Foundation

- criar tabelas de job e parsed content
- criar worker inicial com Docling
- processar `lead_documentos`
- expor status de processamento

### Fase B — Leitura útil

- resumo simples do documento
- preview markdown/texto
- tipo provável

### Fase C — Busca e contexto

- chunks
- busca interna por conteúdo
- consumo pelo agente

### Fase D — Inteligência documental

- checklist
- comparação
- análise assistida
- classificação mais forte por tipo

---

## Riscos e limites

### 1. Nem todo documento precisa passar por Docling

Arquivos muito simples ou temporários podem continuar apenas como storage.

### 2. OCR e parsing não substituem validação humana

Documento jurídico e previdenciário continua exigindo revisão humana.

### 3. `agent_documents` ainda carrega passivo estrutural legado

Ele já está tenant-aware na rota, mas ainda pede evolução de modelagem.

### 4. Não misturar parsing com decisão jurídica automática

Docling estrutura documento. Decisão jurídica continua em camada posterior.

---

## ROI esperado

### Curto prazo

- melhor entendimento dos documentos do lead
- menos arquivo “cego”
- mais contexto para operação humana

### Médio prazo

- base de conhecimento melhor para agentes
- busca documental real
- redução de tempo para leitura manual inicial

### Longo prazo

- análise documental assistida
- automações por tipo/conteúdo
- foundation reutilizável no PrevGlobal

---

## Reuso no PrevGlobal

Essa mesma foundation pode ser reaproveitada depois para:

- propostas
- contratos
- anexos comerciais
- editais
- documentos operacionais

Ou seja: no PrevLegal ele nasce como inteligência documental jurídica; no PrevGlobal ele vira camada transversal de ingestão de documentos do negócio.

---

## Próximo passo recomendado

Implementar a Fase A:

1. schema de jobs e parsed content
2. worker Python com Docling
3. trigger assíncrono em `lead_documentos`
4. status visual de processamento no detalhe do lead
