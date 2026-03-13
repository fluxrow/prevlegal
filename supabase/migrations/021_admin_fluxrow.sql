CREATE TABLE IF NOT EXISTS tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  subdominio text UNIQUE,
  cnpj text,
  responsavel_nome text,
  responsavel_email text NOT NULL,
  responsavel_telefone text,
  oab_estado text,
  oab_numero text,
  plano text DEFAULT 'profissional',
  status text DEFAULT 'trial',
  trial_expira_em timestamptz,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
