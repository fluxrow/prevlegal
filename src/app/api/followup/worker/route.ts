import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp-provider";

// Proteção por secret — chamada pelo Vercel Cron ou manualmente via header
function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function substituirVariaveis(
  template: string,
  lead: { nome?: string | null; nb?: string | null },
  tenant: { nome?: string | null },
) {
  return template
    .replace(/\{nome\}/g, lead.nome || "cliente")
    .replace(/\{nb\}/g, lead.nb || "")
    .replace(/\{escritorio\}/g, tenant.nome || "escritório");
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Busca runs ativas com próximo envio vencido
  const { data: runs, error: runsError } = await supabase
    .from("followup_runs")
    .select(
      `
      id, tenant_id, lead_id, rule_id, proximo_step_ordem, proximo_envio_at,
      leads(id, nome, telefone, nb, status),
      followup_rules(id, nome, followup_rule_steps(ordem, delay_horas, canal, mensagem)),
      tenants(id, nome)
    `,
    )
    .eq("status", "ativo")
    .lte("proximo_envio_at", now)
    .limit(50);

  if (runsError) {
    console.error("[followup-worker] erro buscando runs:", runsError.message);
    return NextResponse.json({ error: runsError.message }, { status: 500 });
  }

  const resultados: { run_id: string; status: string; erro?: string }[] = [];

  for (const run of runs ?? []) {
    const lead = run.leads as unknown as {
      id: string;
      nome: string;
      telefone: string;
      nb: string;
      status: string;
    } | null;
    const rule = run.followup_rules as unknown as {
      nome: string;
      followup_rule_steps: {
        ordem: number;
        delay_horas: number;
        canal: string;
        mensagem: string;
      }[];
    } | null;
    const tenant = run.tenants as unknown as { nome: string } | null;

    // Stop conditions automáticas
    const shouldStop = lead?.status === "converted" || lead?.status === "lost";

    if (shouldStop) {
      await supabase
        .from("followup_runs")
        .update({
          status: "stop_automatico",
          motivo_parada: `Lead com status ${lead?.status}`,
        })
        .eq("id", run.id);
      await supabase.from("followup_events").insert({
        tenant_id: run.tenant_id,
        run_id: run.id,
        lead_id: run.lead_id,
        tipo: lead?.status === "converted" ? "stop_convertido" : "stop_perdido",
        metadata: { status_lead: lead?.status },
      });
      resultados.push({ run_id: run.id, status: "stop_automatico" });
      continue;
    }

    const steps =
      rule?.followup_rule_steps?.sort((a, b) => a.ordem - b.ordem) ?? [];
    const stepAtual = steps.find((s) => s.ordem === run.proximo_step_ordem);

    if (!stepAtual) {
      // Sem mais steps — conclui
      await supabase
        .from("followup_runs")
        .update({ status: "concluido" })
        .eq("id", run.id);
      await supabase.from("followup_events").insert({
        tenant_id: run.tenant_id,
        run_id: run.id,
        lead_id: run.lead_id,
        tipo: "concluido",
        metadata: {},
      });
      resultados.push({ run_id: run.id, status: "concluido" });
      continue;
    }

    const mensagem = substituirVariaveis(
      stepAtual.mensagem,
      { nome: lead?.nome, nb: lead?.nb },
      { nome: tenant?.nome },
    );

    try {
      if (stepAtual.canal === "whatsapp" && lead?.telefone) {
        await sendWhatsAppMessage({
          tenantId: run.tenant_id,
          to: lead.telefone,
          body: mensagem,
        });
      }
      // canal portal: por ora apenas registra o evento sem envio automático

      // Avança para o próximo step
      const proximoStep = steps.find((s) => s.ordem > run.proximo_step_ordem);
      const proximoEnvioAt = proximoStep
        ? new Date(
            Date.now() + proximoStep.delay_horas * 3600 * 1000,
          ).toISOString()
        : null;

      if (proximoStep) {
        await supabase
          .from("followup_runs")
          .update({
            proximo_step_ordem: proximoStep.ordem,
            proximo_envio_at: proximoEnvioAt,
          })
          .eq("id", run.id);
      } else {
        await supabase
          .from("followup_runs")
          .update({ status: "concluido" })
          .eq("id", run.id);
      }

      await supabase.from("followup_events").insert({
        tenant_id: run.tenant_id,
        run_id: run.id,
        lead_id: run.lead_id,
        tipo: "step_disparado",
        step_ordem: stepAtual.ordem,
        mensagem_enviada: mensagem,
        canal: stepAtual.canal,
        metadata: { proximo_step: proximoStep?.ordem ?? null },
      });

      resultados.push({ run_id: run.id, status: "step_disparado" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("followup_events").insert({
        tenant_id: run.tenant_id,
        run_id: run.id,
        lead_id: run.lead_id,
        tipo: "step_falhou",
        step_ordem: stepAtual.ordem,
        canal: stepAtual.canal,
        metadata: { erro: msg },
      });
      resultados.push({ run_id: run.id, status: "step_falhou", erro: msg });
    }
  }

  return NextResponse.json({ processados: resultados.length, resultados });
}

// GET invocado pelo Vercel Cron (passa Authorization: Bearer $CRON_SECRET automaticamente)
export async function GET(request: NextRequest) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Reutiliza a mesma lógica do POST
  return POST(request);
}
