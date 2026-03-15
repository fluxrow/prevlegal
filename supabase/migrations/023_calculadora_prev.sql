CREATE TABLE IF NOT EXISTS calculadora_prev (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Dados básicos
  data_nascimento date,
  sexo text CHECK (sexo IN ('M', 'F')),
  data_inicio_contribuicao date,

  -- Períodos de contribuição (JSON array de {inicio, fim, tipo})
  periodos jsonb DEFAULT '[]'::jsonb,

  -- Resultado calculado
  tempo_contribuicao_meses integer,
  tempo_contribuicao_anos numeric(5,2),
  idade_atual_anos numeric(5,2),
  data_calculo timestamptz,

  -- Elegibilidade por regra
  elegivel_regra_permanente boolean DEFAULT false,
  elegivel_regra_pontos boolean DEFAULT false,
  elegivel_regra_idade_progressiva boolean DEFAULT false,
  elegivel_regra_pedagio_50 boolean DEFAULT false,
  elegivel_regra_pedagio_100 boolean DEFAULT false,
  elegivel_aposentadoria_especial boolean DEFAULT false,

  -- Detalhes das regras
  regra_aplicavel text,
  pontos_atuais numeric(5,2),
  pontos_necessarios numeric(5,2),
  falta_contribuicao_meses integer,
  falta_idade_meses integer,
  previsao_aposentadoria date,

  -- RMI estimada
  salarios_contribuicao jsonb DEFAULT '[]'::jsonb,
  media_salarios numeric(12,2),
  fator_previdenciario numeric(6,4),
  coeficiente_aposentadoria numeric(5,4),
  rmi_estimada numeric(12,2),

  -- Observações
  observacoes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculadora_lead ON calculadora_prev(lead_id);
CREATE INDEX IF NOT EXISTS idx_calculadora_created ON calculadora_prev(created_at DESC);
