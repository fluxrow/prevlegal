ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS twilio_numero_origem text DEFAULT 'whatsapp:+14155238886',
  ADD COLUMN IF NOT EXISTS twilio_horario_inicio integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS twilio_horario_fim integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS twilio_limite_diario integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS twilio_modo text DEFAULT 'sandbox';
