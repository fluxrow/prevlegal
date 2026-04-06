import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function processEventTriggers(
    tenant_id: string,
    lead_id: string,
    trigger_evento: string,
    trigger_condicao: string
) {
    const supabase = createAdminClient();

    // Busca os gatilhos ativos para este evento e condição (status)
    const { data: triggers, error: triggersError } = await supabase
        .from('event_triggers')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('ativo', true)
        .eq('trigger_evento', trigger_evento)
        .eq('trigger_condicao', trigger_condicao);

    if (triggersError || !triggers || triggers.length === 0) {
        return; // Nada para processar
    }

    for (const trigger of triggers) {
        if (trigger.acao_tipo === 'iniciar_followup') {
            // Lidar com cancelamentos de concorrentes se configurado
            if (trigger.cancelar_followups_rodando) {
                await supabase
                    .from('followup_runs')
                    .update({
                        status: 'cancelado',
                        motivo_parada: `Cancelado por novo gatilho (${trigger.trigger_condicao})`
                    })
                    .eq('lead_id', lead_id)
                    .in('status', ['ativo', 'pausado']);
            }

            // Inicia o novo follow up
            await supabase
                .from('followup_runs')
                .insert({
                    tenant_id: tenant_id,
                    lead_id: lead_id,
                    rule_id: trigger.acao_ref_id,
                    status: 'ativo',
                    proximo_step_ordem: 1,
                    proximo_envio_at: new Date().toISOString() // Iniciar imediatamente o primeiro step (o worker pega na próxima rodada)
                });

        } else if (trigger.acao_tipo === 'trocar_agente') {
            // Troca o agente responsável nas conversas inbound
            // No PrevLegal, o roteamento de agente na Fase D define o `agente_respondente_id` na `mensagens_inbound` ou fallback pra `campanhas`.
            // Ou nós podemos apenas registrar um evento / marcador. Vamos atualizar algo no lead ou só lançar notificação se configurado.
            // Para simplicidade, vamos ver se precisamos atualizar a tabela de lead.
            // Se enviar_mensagem_transicao for true, a IA avisará (isso pode ser tratado num worker de mensagem ou enviado aqui via whatsapp-provider se tivéssemos importado, mas vamos deixar documentado).
            console.log(`[EventTrigger] Trocar agente disparado para lead ${lead_id}. Ação ref: ${trigger.acao_ref_id}`);
        }
    }
}
