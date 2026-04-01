CREATE TABLE IF NOT EXISTS portal_timeline_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  visivel_cliente boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_timeline_events_lead
  ON portal_timeline_events(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_timeline_events_tenant
  ON portal_timeline_events(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_document_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT portal_document_requests_status_check
    CHECK (status IN ('pendente', 'enviado', 'aprovado', 'rejeitado'))
);

CREATE INDEX IF NOT EXISTS idx_portal_document_requests_lead
  ON portal_document_requests(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_document_requests_tenant
  ON portal_document_requests(tenant_id, created_at DESC);
