CREATE TABLE IF NOT EXISTS portal_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  papel text NOT NULL DEFAULT 'cliente',
  ativo boolean NOT NULL DEFAULT true,
  ultimo_acesso_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT portal_users_papel_check
    CHECK (papel IN ('cliente', 'familiar', 'cuidador'))
);

CREATE INDEX IF NOT EXISTS idx_portal_users_lead
  ON portal_users(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_users_tenant
  ON portal_users(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_access_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  portal_user_id uuid REFERENCES portal_users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'magic_link',
  expira_em timestamptz,
  usado_em timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT portal_access_links_tipo_check
    CHECK (tipo IN ('portal_link', 'magic_link', 'otp'))
);

CREATE INDEX IF NOT EXISTS idx_portal_access_links_lead
  ON portal_access_links(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_access_links_portal_user
  ON portal_access_links(portal_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_access_links_tenant
  ON portal_access_links(tenant_id, created_at DESC);
