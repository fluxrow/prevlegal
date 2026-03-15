CREATE TABLE IF NOT EXISTS advogados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  nome text,
  email text,
  telefone text,
  cpf text,
  foto_url text,
  oab_numero text,
  oab_estado text,
  oab_tipo text DEFAULT 'advogado',
  oab_situacao text DEFAULT 'ativo',
  escritorio_nome text,
  escritorio_cnpj text,
  escritorio_endereco text,
  escritorio_cidade text,
  escritorio_estado text,
  escritorio_cep text,
  escritorio_telefone text,
  escritorio_email text,
  escritorio_logo_url text,
  assinatura_texto text,
  assinatura_rodape text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_advogados_usuario ON advogados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_advogados_oab ON advogados(oab_numero, oab_estado);

-- Migra dados existentes de configuracoes para advogados
INSERT INTO advogados (usuario_id, nome, email, telefone, cpf, foto_url, oab_numero, oab_estado, oab_tipo, oab_situacao, escritorio_nome, escritorio_cnpj, escritorio_endereco, escritorio_cidade, escritorio_estado, escritorio_cep, escritorio_telefone, escritorio_email, escritorio_logo_url, assinatura_texto, assinatura_rodape)
SELECT
  u.id,
  c.advogado_nome, c.advogado_email, c.advogado_telefone, c.advogado_cpf,
  c.advogado_foto_url, c.oab_numero, c.oab_estado, c.oab_tipo, c.oab_situacao,
  c.escritorio_nome, c.escritorio_cnpj, c.escritorio_endereco, c.escritorio_cidade,
  c.escritorio_estado, c.escritorio_cep, c.escritorio_telefone, c.escritorio_email,
  c.escritorio_logo_url, c.assinatura_texto, c.assinatura_rodape
FROM configuracoes c
CROSS JOIN usuarios u
WHERE c.advogado_nome IS NOT NULL
ON CONFLICT (usuario_id) DO NOTHING;
