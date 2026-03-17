-- =============================================
-- PREVLEGAL - Migration 029
-- Gestao financeira basica por lead
-- =============================================

-- Contratos de honorarios por lead
CREATE TABLE IF NOT EXISTS contratos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  numero text,
  descricao text,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  valor_entrada numeric(12,2) DEFAULT 0,
  num_parcelas integer DEFAULT 1,
  tipo_cobranca text DEFAULT 'exito',
  percentual_exito numeric(5,2),
  status text DEFAULT 'ativo',
  data_assinatura date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT contratos_num_parcelas_check CHECK (num_parcelas >= 0),
  CONSTRAINT contratos_tipo_cobranca_check CHECK (tipo_cobranca IN ('exito', 'fixo', 'misto')),
  CONSTRAINT contratos_status_check CHECK (status IN ('ativo', 'quitado', 'cancelado', 'inadimplente'))
);

-- Parcelas do contrato
CREATE TABLE IF NOT EXISTS parcelas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES contratos(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  valor numeric(12,2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'pendente',
  forma_pagamento text,
  observacao text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT parcelas_numero_check CHECK (numero > 0),
  CONSTRAINT parcelas_status_check CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  CONSTRAINT parcelas_forma_pagamento_check CHECK (
    forma_pagamento IS NULL OR forma_pagamento IN ('pix', 'boleto', 'cartao', 'dinheiro', 'transferencia')
  )
);

CREATE INDEX IF NOT EXISTS idx_contratos_lead ON contratos(lead_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_contrato ON parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios autenticados leem contratos" ON contratos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados escrevem contratos" ON contratos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados leem parcelas" ON parcelas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados escrevem parcelas" ON parcelas
  FOR ALL USING (auth.role() = 'authenticated');
