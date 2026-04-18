import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { contextHasPermission, getTenantContext } from "@/lib/tenant-context";
import { createAdminSupabase } from "@/lib/internal-collaboration";
import { getAgentSeedProfile } from "@/lib/agent-seed-profiles";
import { normalizeOperationProfile } from "@/lib/operation-profile";

export async function POST(request: Request) {
  const authSupabase = await createServerClient();
  const context = await getTenantContext(authSupabase);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!contextHasPermission(context, "agentes_manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const selectedProfile = getAgentSeedProfile(body?.profile_id);
  const baseTemplates = selectedProfile.templates;

  const supabase = createAdminSupabase();
  const { data: existingAgents, error: existingError } = await supabase
    .from("agentes")
    .select("id, tipo, nome_interno, is_default, perfil_operacao")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: true });

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const currentAgents = existingAgents || [];
  const hasDefaultAgent = currentAgents.some((agent) => agent.is_default);
  const existingProfileTypeKeys = new Set(
    currentAgents
      .map((agent) => {
        const tipo = (agent.tipo || "").trim();
        const perfil = normalizeOperationProfile(agent.perfil_operacao);
        return tipo ? `${perfil}:${tipo}` : "";
      })
      .filter(Boolean),
  );

  const toInsert = baseTemplates.filter(
    (template) =>
      !existingProfileTypeKeys.has(
        `${selectedProfile.operationProfile}:${template.tipo}`,
      ),
  ).map((template) => ({
    tenant_id: context.tenantId,
    perfil_operacao: selectedProfile.operationProfile,
    tipo: template.tipo,
    nome_interno: template.nome_interno,
    nome_publico: template.nome_publico,
    descricao: template.descricao,
    objetivo: template.objetivo,
    persona: template.persona,
    prompt_base: template.prompt_base,
    modelo: "claude-sonnet-4-20250514",
    max_tokens:
      selectedProfile.operationProfile === "planejamento_previdenciario"
        ? 1200
        : 500,
    resposta_automatica: template.resposta_automatica,
    janela_inicio: "08:00",
    janela_fim: "18:00",
    dias_uteis_only: true,
    whatsapp_number_id_default: null,
    fluxo_qualificacao: template.fluxo_qualificacao,
    exemplos_dialogo: template.exemplos_dialogo,
    gatilhos_escalada: template.gatilhos_escalada,
    frases_proibidas: template.frases_proibidas,
    objeccoes: template.objeccoes,
    fallback: template.fallback,
    ativo: true,
    is_default: template.is_default && !hasDefaultAgent,
  }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("agentes").insert(toInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const skipped = baseTemplates.filter((template) =>
    existingProfileTypeKeys.has(
      `${selectedProfile.operationProfile}:${template.tipo}`,
    ),
  ).map((template) => ({
    tipo: template.tipo,
    nome_interno: template.nome_interno,
    reason: "Já existe um agente configurado para este tipo.",
  }));

  return NextResponse.json({
    profile_id: selectedProfile.id,
    profile_label: selectedProfile.label,
    message:
      toInsert.length > 0
        ? `Templates de agentes aplicados para ${selectedProfile.label}.`
        : `Nenhum agente novo foi inserido para ${selectedProfile.label}.`,
    inserted_count: toInsert.length,
    skipped_count: skipped.length,
    inserted: toInsert.map((item) => ({
      tipo: item.tipo,
      nome_interno: item.nome_interno,
      is_default: item.is_default,
    })),
    skipped,
    summary: selectedProfile.summary,
  });
}
