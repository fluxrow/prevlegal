-- Fase 21: Gestão Financeira — Honorários por Lead
-- Contratos de honorário (êxito, fixo ou misto) vinculados a leads

CREATE TABLE IF NOT EXISTS contratos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  tipo_cobranca text NOT NULL DEFAULT 'exito' CHECK (tipo_cobranca IN ('exito', 'fixo', 'misto')),
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  percentual_exito numeric(5,2),          -- apenas para tipo exito/misto
  descricao text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'cancelado')),
  data_inicio date DEFAULT now(),
  data_encerramento date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parcelas do contrato (geradas automaticamente ou manualmente)
CREATE TABLE IF NOT EXISTS parcelas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES contratos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  valor numeric(12,2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contratos_usuario ON contratos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_lead ON contratos(lead_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contrato ON parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_usuario ON parcelas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento);

-- RLS
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_tenant" ON contratos
  USING (usuario_id = auth.uid());

CREATE POLICY "parcelas_tenant" ON parcelas
  USING (usuario_id = auth.uid());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contratos_updated_at') THEN
    CREATE TRIGGER update_contratos_updated_at
      BEFORE UPDATE ON contratos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_parcelas_updated_at') THEN
    CREATE TRIGGER update_parcelas_updated_at
      BEFORE UPDATE ON parcelas
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
