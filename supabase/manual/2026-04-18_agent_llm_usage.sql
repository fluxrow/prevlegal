CREATE TABLE IF NOT EXISTS public.agent_llm_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid REFERENCES public.conversas(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  agente_id uuid REFERENCES public.agentes(id) ON DELETE SET NULL,
  perfil_operacao text,
  modelo text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cache_creation_input_tokens integer DEFAULT 0,
  cache_read_input_tokens integer DEFAULT 0,
  custo_usd numeric(12, 6) NOT NULL DEFAULT 0,
  latencia_ms integer,
  sucesso boolean NOT NULL DEFAULT true,
  erro_descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_llm_usage_tenant_created
  ON public.agent_llm_usage(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_llm_usage_conversa
  ON public.agent_llm_usage(conversa_id) WHERE conversa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_llm_usage_lead
  ON public.agent_llm_usage(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.agent_llm_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_llm_usage_tenant_select" ON public.agent_llm_usage
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.usuarios
      WHERE auth_id = auth.uid()
    )
  );
