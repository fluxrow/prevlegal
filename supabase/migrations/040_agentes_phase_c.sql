-- Migration 040: Agentes por tenant — Fase C (multiagente)
-- Cria a tabela `agentes` para suportar múltiplos agentes configuráveis por escritório

create table if not exists agentes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,

  -- Identidade
  nome_interno    text not null,
  nome_publico    text not null,
  descricao       text,
  objetivo        text,
  persona         text,

  -- Prompt e modelo
  prompt_base            text,
  modelo                 text not null default 'claude-sonnet-4-20250514',
  max_tokens             integer not null default 500,
  resposta_automatica    boolean not null default false,

  -- Janela de atendimento
  janela_inicio          text,      -- ex: "08:00"
  janela_fim             text,      -- ex: "18:00"
  dias_uteis_only        boolean not null default false,

  -- Canal padrão
  whatsapp_number_id_default text,

  -- Configurações avançadas (herdadas do agente global)
  fluxo_qualificacao     text,
  exemplos_dialogo       text,
  gatilhos_escalada      text,
  frases_proibidas       text,
  objeccoes              text,
  fallback               text,

  -- Controle
  ativo                  boolean not null default true,
  is_default             boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Apenas um agente padrão por tenant
create unique index idx_agentes_tenant_default
  on agentes(tenant_id)
  where is_default = true;

-- RLS
alter table agentes enable row level security;

create policy "tenant members can view their agentes"
  on agentes for select
  using (
    tenant_id in (
      select tenant_id from usuarios where id = auth.uid()
    )
  );

create policy "admins can manage agentes"
  on agentes for all
  using (
    tenant_id in (
      select tenant_id from usuarios where id = auth.uid() and role = 'admin'
    )
  );
