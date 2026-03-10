-- =============================================
-- PREVLEGAL — Schema Inicial
-- Multi-tenant: cada tenant tem seu próprio banco
-- Este arquivo roda no banco de cada cliente
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- USUÁRIOS E PERMISSÕES
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'operador', 'visualizador');

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL, -- referência ao auth.users do Supabase
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'operador',
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- AGENTE DE IA
-- =============================================

CREATE TABLE agentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL DEFAULT 'Assistente',
  prompt_base TEXT NOT NULL DEFAULT '',
  horario_inicio TIME NOT NULL DEFAULT '08:00',
  horario_fim TIME NOT NULL DEFAULT '18:00',
  dias_ativos INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=dom, 6=sab
  escalada_keywords TEXT[] NOT NULL DEFAULT '{"falar com advogado","não entendi","humano","pessoa real"}',
  mensagem_fora_horario TEXT DEFAULT 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve.',
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CONFIGURAÇÕES DO ESCRITÓRIO
-- =============================================

CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_escritorio VARCHAR(255) NOT NULL,
  logo_url TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#4f80ff',
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_whatsapp_number VARCHAR(20),
  google_calendar_token JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- LISTAS DE LEADS
-- =============================================

CREATE TABLE listas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  fornecedor VARCHAR(255),
  arquivo_original VARCHAR(255),
  total_registros INTEGER NOT NULL DEFAULT 0,
  total_ativos INTEGER NOT NULL DEFAULT 0,
  total_cessados INTEGER NOT NULL DEFAULT 0,
  total_duplicados INTEGER NOT NULL DEFAULT 0,
  ganho_potencial_total NUMERIC(15,2) DEFAULT 0,
  ganho_potencial_medio NUMERIC(15,2) DEFAULT 0,
  percentual_com_telefone NUMERIC(5,2) DEFAULT 0,
  importado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CAMPANHAS
-- =============================================

CREATE TYPE campanha_status AS ENUM ('rascunho', 'ativa', 'pausada', 'encerrada');

CREATE TABLE campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id UUID NOT NULL REFERENCES listas(id) ON DELETE RESTRICT,
  agente_id UUID REFERENCES agentes(id),
  responsavel_id UUID REFERENCES usuarios(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  status campanha_status NOT NULL DEFAULT 'rascunho',
  total_leads INTEGER NOT NULL DEFAULT 0,
  total_contatados INTEGER NOT NULL DEFAULT 0,
  total_responderam INTEGER NOT NULL DEFAULT 0,
  total_agendados INTEGER NOT NULL DEFAULT 0,
  total_convertidos INTEGER NOT NULL DEFAULT 0,
  honorarios_gerados NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuários associados a campanhas (operador só vê campanhas atribuídas)
CREATE TABLE campanha_usuarios (
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (campanha_id, usuario_id)
);

-- =============================================
-- LEADS
-- =============================================

CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'awaiting', 'scheduled', 'converted', 'lost');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id UUID NOT NULL REFERENCES listas(id) ON DELETE RESTRICT,
  campanha_id UUID REFERENCES campanhas(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Dados previdenciários
  nb VARCHAR(20) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  telefone VARCHAR(20),
  telefone_enriquecido VARCHAR(20),
  aps VARCHAR(255),
  banco VARCHAR(100),
  dib DATE,
  tipo_beneficio VARCHAR(255),
  valor_rma NUMERIC(12,2),
  ganho_potencial NUMERIC(15,2),
  nit VARCHAR(50),

  -- CRM
  status lead_status NOT NULL DEFAULT 'new',
  score SMALLINT NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  anotacao TEXT,

  -- Controles
  enriquecido BOOLEAN NOT NULL DEFAULT false,
  enriquecido_em TIMESTAMPTZ,
  lgpd_optout BOOLEAN NOT NULL DEFAULT false,
  lgpd_optout_em TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Deduplicação: mesmo NB não entra duas vezes
  UNIQUE(nb)
);

-- Índices para performance
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_campanha ON leads(campanha_id);
CREATE INDEX idx_leads_lista ON leads(lista_id);
CREATE INDEX idx_leads_responsavel ON leads(responsavel_id);
CREATE INDEX idx_leads_nome_trgm ON leads USING gin(nome gin_trgm_ops);
CREATE INDEX idx_leads_cpf ON leads(cpf);
CREATE INDEX idx_leads_nb ON leads(nb);

-- =============================================
-- CONVERSAS WHATSAPP
-- =============================================

CREATE TYPE canal_tipo AS ENUM ('whatsapp', 'email', 'telefone', 'manual');
CREATE TYPE interacao_tipo AS ENUM ('enviado', 'recebido', 'anotacao', 'sistema');

CREATE TABLE conversas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  telefone VARCHAR(20) NOT NULL,
  agente_ativo BOOLEAN NOT NULL DEFAULT true, -- true = IA respondendo, false = humano assumiu
  assumido_por UUID REFERENCES usuarios(id),
  assumido_em TIMESTAMPTZ,
  interesse_detectado BOOLEAN NOT NULL DEFAULT false,
  interesse_detectado_em TIMESTAMPTZ,
  ultima_mensagem_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  canal canal_tipo NOT NULL DEFAULT 'whatsapp',
  tipo interacao_tipo NOT NULL,
  conteudo TEXT NOT NULL,
  por_agente BOOLEAN NOT NULL DEFAULT false,
  usuario_id UUID REFERENCES usuarios(id),
  twilio_sid VARCHAR(100), -- ID da mensagem no Twilio
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX idx_mensagens_lead ON mensagens(lead_id);
CREATE INDEX idx_conversas_lead ON conversas(lead_id);

-- =============================================
-- AGENDAMENTOS
-- =============================================

CREATE TYPE agendamento_status AS ENUM ('agendado', 'confirmado', 'realizado', 'cancelado', 'remarcado');

CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  google_event_id VARCHAR(255),
  meet_link TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  status agendamento_status NOT NULL DEFAULT 'agendado',
  lembrete_enviado BOOLEAN NOT NULL DEFAULT false,
  honorario NUMERIC(12,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agendamentos_lead ON agendamentos(lead_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(data_hora);
CREATE INDEX idx_agendamentos_usuario ON agendamentos(usuario_id);

-- =============================================
-- TEMPLATES DE MENSAGEM
-- =============================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL, -- suporta {{nome}}, {{nb}}, {{ganho_potencial}}, {{dib}}
  canal canal_tipo NOT NULL DEFAULT 'whatsapp',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- DISPAROS EM MASSA
-- =============================================

CREATE TYPE disparo_status AS ENUM ('agendado', 'em_andamento', 'concluido', 'cancelado', 'erro');

CREATE TABLE disparos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id),
  template_id UUID NOT NULL REFERENCES templates(id),
  criado_por UUID NOT NULL REFERENCES usuarios(id),
  status disparo_status NOT NULL DEFAULT 'agendado',
  agendado_para TIMESTAMPTZ,
  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  total_envios INTEGER NOT NULL DEFAULT 0,
  total_sucesso INTEGER NOT NULL DEFAULT 0,
  total_erro INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- LOGS DE AUDITORIA
-- =============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  acao VARCHAR(100) NOT NULL, -- 'lead.status_changed', 'conversa.assumida', etc
  entidade VARCHAR(50) NOT NULL, -- 'lead', 'conversa', 'agendamento'
  entidade_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_usuario ON audit_logs(usuario_id);
CREATE INDEX idx_audit_entidade ON audit_logs(entidade, entidade_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- =============================================
-- VIEWS ÚTEIS
-- =============================================

-- Dashboard: stats gerais
CREATE VIEW v_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'new') AS total_novos,
  COUNT(*) FILTER (WHERE status = 'contacted') AS total_contatados,
  COUNT(*) FILTER (WHERE status = 'awaiting') AS total_aguardando,
  COUNT(*) FILTER (WHERE status = 'scheduled') AS total_agendados,
  COUNT(*) FILTER (WHERE status = 'converted') AS total_convertidos,
  COUNT(*) FILTER (WHERE status = 'lost') AS total_perdidos,
  COUNT(*) AS total_leads,
  ROUND(AVG(score)::NUMERIC, 1) AS score_medio,
  SUM(ganho_potencial) FILTER (WHERE ganho_potencial IS NOT NULL) AS potencial_total,
  SUM(ganho_potencial) FILTER (WHERE status = 'converted') AS potencial_convertido
FROM leads
WHERE lgpd_optout = false;

-- Kanban: leads com dados de responsável
CREATE VIEW v_kanban_leads AS
SELECT
  l.*,
  u.nome AS responsavel_nome,
  u.avatar_url AS responsavel_avatar,
  c.nome AS campanha_nome,
  li.nome AS lista_nome,
  cv.agente_ativo AS conversa_agente_ativo,
  cv.id AS conversa_id,
  cv.interesse_detectado
FROM leads l
LEFT JOIN usuarios u ON l.responsavel_id = u.id
LEFT JOIN campanhas c ON l.campanha_id = c.id
LEFT JOIN listas li ON l.lista_id = li.id
LEFT JOIN conversas cv ON cv.lead_id = l.id
WHERE l.lgpd_optout = false;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política base: usuário autenticado vê tudo do seu tenant
-- (em banco separado por tenant, todos os dados são do mesmo tenant)
CREATE POLICY "usuarios autenticados leem tudo" ON leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados leem tudo" ON conversas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados leem tudo" ON mensagens
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados leem tudo" ON agendamentos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados leem tudo" ON campanhas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados leem tudo" ON listas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados escrevem" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados escrevem" ON conversas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados escrevem" ON mensagens
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios autenticados escrevem" ON agendamentos
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_campanhas_updated_at
  BEFORE UPDATE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agentes_updated_at
  BEFORE UPDATE ON agentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Agente padrão (sem nome definido — escritório configura)
INSERT INTO agentes (nome, prompt_base, ativo)
VALUES (
  'Assistente',
  'Você é um assistente do escritório de advocacia previdenciária. Seu objetivo é entrar em contato com beneficiários do INSS que podem ter direito à readequação do teto do benefício. Seja cordial, objetivo e humano. Nunca prometa valores exatos. Sempre que o beneficiário demonstrar interesse real, informe que um especialista entrará em contato.',
  false
);
