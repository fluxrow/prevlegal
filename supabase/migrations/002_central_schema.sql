-- =============================================
-- PREVLEGAL — Schema do Banco Central
-- Roda apenas no banco central da Fluxrow
-- Controla tenants, planos e provisionamento
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE plano_tipo AS ENUM ('starter', 'pro', 'enterprise');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- ex: alexandrini
  subdominio VARCHAR(100) UNIQUE NOT NULL, -- ex: alexandrini.prevlegal.com.br
  supabase_project_id VARCHAR(100),
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_role_key TEXT,
  plano plano_tipo NOT NULL DEFAULT 'starter',
  ativo BOOLEAN NOT NULL DEFAULT true,
  trial_ate TIMESTAMPTZ,
  contrato_assinado_em TIMESTAMPTZ,
  responsavel_nome VARCHAR(255),
  responsavel_email VARCHAR(255),
  responsavel_telefone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE faturamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  pago_em DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_ativo ON tenants(ativo);
