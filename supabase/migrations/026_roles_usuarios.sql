-- Adiciona role na tabela usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'operador',
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS convidado_por uuid REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS convidado_em timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;

-- Admin existente já deve ter role admin
UPDATE usuarios SET role = 'admin' WHERE role IS NULL OR role = 'operador';

-- Tabela de convites pendentes
CREATE TABLE IF NOT EXISTS convites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text DEFAULT 'operador',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  convidado_por uuid REFERENCES usuarios(id),
  aceito boolean DEFAULT false,
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convites_token ON convites(token);
CREATE INDEX IF NOT EXISTS idx_convites_email ON convites(email);
