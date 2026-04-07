-- Migration 041: Roteamento de agente por campanha (Fase D)
--
-- A coluna campanhas.agente_id e a FK campanhas_agente_id_fkey para agentes(id)
-- já existem no banco. Esta migration formaliza o estado e adiciona o índice
-- de performance para lookup do agente pelo responder.

-- Índice para busca eficiente de campanhas por agente
create index if not exists idx_campanhas_agente_id
  on campanhas(agente_id)
  where agente_id is not null;

-- Comentários descritivos para documentar a lógica de roteamento
comment on column campanhas.agente_id is
  'Agente responsável por responder os leads desta campanha. '
  'Se nulo, usa o agente padrão do tenant (agentes.is_default = true). '
  'Se nenhum agente configurado, usa config global da tabela configuracoes.';

comment on table agentes is
  'Agentes de IA configuráveis por tenant. '
  'Prioridade de uso no responder: campanha.agente_id > agentes.is_default > configuracoes global.';
