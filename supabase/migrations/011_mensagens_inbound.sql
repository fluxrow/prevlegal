-- Tabela para armazenar mensagens recebidas dos leads via WhatsApp
CREATE TABLE IF NOT EXISTS mensagens_inbound (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  campanha_id uuid REFERENCES campanhas(id) ON DELETE SET NULL,
  telefone_remetente text NOT NULL,
  telefone_destinatario text NOT NULL,
  mensagem text NOT NULL,
  twilio_sid text,
  twilio_message_sid text,
  lido boolean DEFAULT false,
  lido_em timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_inbound_lead_id ON mensagens_inbound(lead_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_inbound_telefone ON mensagens_inbound(telefone_remetente);
CREATE INDEX IF NOT EXISTS idx_mensagens_inbound_created_at ON mensagens_inbound(created_at DESC);

ALTER TABLE mensagens_inbound ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler mensagens inbound"
  ON mensagens_inbound FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role pode inserir mensagens inbound"
  ON mensagens_inbound FOR INSERT
  TO service_role
  WITH CHECK (true);
