# Docling Worker

Serviço externo mínimo para a Fase A da inteligência documental do PrevLegal.

## Objetivo

Receber um arquivo por URL assinada, converter via `docling` CLI e devolver:

- `plain_text`
- `markdown`
- `raw_json`
- `parser_version`
- `chunks`

## Contrato esperado pelo app

### `POST /parse`

Payload:

```json
{
  "source_url": "https://...",
  "file_name": "cnis.pdf",
  "mime_type": "application/pdf",
  "source_type": "lead_documento",
  "source_id": "uuid"
}
```

Resposta:

```json
{
  "plain_text": "...",
  "markdown": "...",
  "raw_json": {},
  "doc_type_guess": "outro",
  "language": "pt-BR",
  "page_count": null,
  "has_ocr": false,
  "parser_version": "docling-cli",
  "chunks": [
    {
      "chunk_index": 0,
      "content": "..."
    }
  ]
}
```

## Como rodar localmente

```bash
cd workers/docling
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```

## Variáveis opcionais

- `DOCLING_SERVICE_TOKEN`
  - se definida, o app principal deve enviar `Authorization: Bearer <token>`
