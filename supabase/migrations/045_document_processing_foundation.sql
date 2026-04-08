CREATE TABLE IF NOT EXISTS document_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  arquivo_nome text,
  mime_type text,
  parser text NOT NULL DEFAULT 'docling',
  parser_version text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_processing_jobs_source_type_check
    CHECK (source_type IN ('lead_documento', 'agent_document')),
  CONSTRAINT document_processing_jobs_status_check
    CHECK (status IN ('pending', 'processing', 'done', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_processing_jobs_source_unique
  ON document_processing_jobs(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_status
  ON document_processing_jobs(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_tenant
  ON document_processing_jobs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_parsed_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  parser text NOT NULL DEFAULT 'docling',
  parser_version text,
  plain_text text,
  markdown text,
  raw_json jsonb,
  doc_type_guess text,
  language text,
  page_count integer,
  has_ocr boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_parsed_contents_source_type_check
    CHECK (source_type IN ('lead_documento', 'agent_document'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_parsed_contents_source_unique
  ON document_parsed_contents(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_document_parsed_contents_tenant
  ON document_parsed_contents(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  parsed_content_id uuid REFERENCES document_parsed_contents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  page_from integer,
  page_to integer,
  section_title text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_chunks_source_type_check
    CHECK (source_type IN ('lead_documento', 'agent_document'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_chunks_unique
  ON document_chunks(parsed_content_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_document_chunks_source
  ON document_chunks(source_type, source_id, chunk_index);
