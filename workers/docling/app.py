import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import requests
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel


app = FastAPI(title="PrevLegal Docling Worker")


class ParseRequest(BaseModel):
    source_url: str
    file_name: str | None = None
    mime_type: str | None = None
    source_type: str
    source_id: str


def require_token(authorization: str | None):
    token = os.getenv("DOCLING_SERVICE_TOKEN", "").strip()
    if not token:
        return

    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def split_chunks(text: str):
    text = text.strip()
    if not text:
      return []

    parts = [part.strip() for part in re.split(r"\n{2,}", text) if part.strip()]
    chunks = []
    current = ""
    chunk_index = 0

    for part in parts:
        next_value = f"{current}\n\n{part}".strip() if current else part
        if len(next_value) > 1200 and current:
            chunks.append({"chunk_index": chunk_index, "content": current})
            chunk_index += 1
            current = part
        else:
            current = next_value

    if current:
        chunks.append({"chunk_index": chunk_index, "content": current})

    return chunks


def markdown_to_plain_text(markdown: str):
    text = re.sub(r"```.*?```", " ", markdown, flags=re.S)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^[#>\-\*\s]+", "", text, flags=re.M)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/parse")
def parse_document(payload: ParseRequest, authorization: str | None = Header(default=None)):
    require_token(authorization)

    if shutil.which("docling") is None:
        raise HTTPException(status_code=500, detail="Docling CLI não encontrada no ambiente")

    with tempfile.TemporaryDirectory(prefix="prevlegal-docling-") as tmp_dir:
        workdir = Path(tmp_dir)
        source_name = payload.file_name or "documento.bin"
        source_path = workdir / source_name
        markdown_path = workdir / "output.md"
        json_path = workdir / "output.json"

        response = requests.get(payload.source_url, timeout=120)
        if response.status_code >= 400:
            raise HTTPException(status_code=400, detail=f"Falha ao baixar documento ({response.status_code})")

        source_path.write_bytes(response.content)

        markdown_cmd = ["docling", str(source_path), "--format", "markdown", "--output", str(markdown_path)]
        json_cmd = ["docling", str(source_path), "--format", "json", "--output", str(json_path)]

        md_result = subprocess.run(markdown_cmd, capture_output=True, text=True)
        if md_result.returncode != 0:
            raise HTTPException(status_code=500, detail=md_result.stderr.strip() or "Docling markdown falhou")

        json_result = subprocess.run(json_cmd, capture_output=True, text=True)
        if json_result.returncode != 0:
            raise HTTPException(status_code=500, detail=json_result.stderr.strip() or "Docling json falhou")

        markdown = markdown_path.read_text(encoding="utf-8").strip() if markdown_path.exists() else ""
        raw_json = json.loads(json_path.read_text(encoding="utf-8")) if json_path.exists() else {}
        plain_text = markdown_to_plain_text(markdown)

        return {
            "plain_text": plain_text,
            "markdown": markdown,
            "raw_json": raw_json,
            "doc_type_guess": "outro",
            "language": "pt-BR",
            "page_count": None,
            "has_ocr": False,
            "parser_version": "docling-cli",
            "chunks": split_chunks(plain_text),
        }
