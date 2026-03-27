-- =============================================
-- PREVLEGAL - Migration 032
-- WhatsApp provider foundation (Twilio + Z-API + multi-number)
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'whatsapp_provider'
  ) THEN
    CREATE TYPE whatsapp_provider AS ENUM ('twilio', 'zapi');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider whatsapp_provider NOT NULL,
  label text,
  phone text,
  purpose text NOT NULL DEFAULT 'ambos',
  ativo boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,

  twilio_account_sid text,
  twilio_auth_token text,
  twilio_whatsapp_number text,

  zapi_instance_id text,
  zapi_instance_token text,
  zapi_client_token text,
  zapi_base_url text,
  zapi_connected_phone text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_numbers_twilio_required
    CHECK (
      provider <> 'twilio' OR (
        twilio_account_sid IS NOT NULL
        AND twilio_auth_token IS NOT NULL
        AND COALESCE(twilio_whatsapp_number, phone) IS NOT NULL
      )
    ),
  CONSTRAINT whatsapp_numbers_zapi_required
    CHECK (
      provider <> 'zapi' OR (
        zapi_instance_id IS NOT NULL
        AND zapi_instance_token IS NOT NULL
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_tenant_id
  ON whatsapp_numbers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_tenant_provider
  ON whatsapp_numbers(tenant_id, provider);

CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_tenant_active
  ON whatsapp_numbers(tenant_id, ativo, is_default);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_numbers_default_per_tenant
  ON whatsapp_numbers(tenant_id)
  WHERE is_default = true AND ativo = true;

ALTER TABLE conversas
  ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid REFERENCES whatsapp_numbers(id);

ALTER TABLE mensagens_inbound
  ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid REFERENCES whatsapp_numbers(id);

ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid REFERENCES whatsapp_numbers(id);

ALTER TABLE campanhas
  ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid REFERENCES whatsapp_numbers(id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'campanha_mensagens'
  ) THEN
    ALTER TABLE campanha_mensagens
      ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid REFERENCES whatsapp_numbers(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_number_id
  ON conversas(whatsapp_number_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_inbound_whatsapp_number_id
  ON mensagens_inbound(whatsapp_number_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_whatsapp_number_id
  ON notificacoes(whatsapp_number_id);

CREATE INDEX IF NOT EXISTS idx_campanhas_whatsapp_number_id
  ON campanhas(whatsapp_number_id);
