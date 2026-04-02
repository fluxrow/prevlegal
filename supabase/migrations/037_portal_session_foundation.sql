CREATE TABLE IF NOT EXISTS portal_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  portal_user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expira_em timestamptz NOT NULL,
  ultimo_acesso_em timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_lead
  ON portal_sessions(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_user
  ON portal_sessions(portal_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_tenant
  ON portal_sessions(tenant_id, created_at DESC);
