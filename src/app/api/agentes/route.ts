import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant-context";
import { createAdminSupabase } from "@/lib/internal-collaboration";

export async function GET() {
  const authSupabase = await createServerClient();
  const context = await getTenantContext(authSupabase);
  if (!context)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("agentes")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const authSupabase = await createServerClient();
  const context = await getTenantContext(authSupabase);
  if (!context)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!context.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminSupabase();
  const body = await request.json();

  const {
    nome_interno,
    nome_publico,
    descricao,
    objetivo,
    persona,
    prompt_base,
    modelo,
    max_tokens,
    resposta_automatica,
    janela_inicio,
    janela_fim,
    dias_uteis_only,
    whatsapp_number_id_default,
    fluxo_qualificacao,
    exemplos_dialogo,
    gatilhos_escalada,
    frases_proibidas,
    objeccoes,
    fallback,
    ativo,
    is_default,
  } = body;

  if (!nome_interno || !nome_publico) {
    return NextResponse.json(
      { error: "nome_interno e nome_publico são obrigatórios" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("agentes")
    .insert({
      tenant_id: context.tenantId,
      nome_interno,
      nome_publico,
      descricao: descricao || null,
      objetivo: objetivo || null,
      persona: persona || null,
      prompt_base: prompt_base || null,
      modelo: modelo || "claude-sonnet-4-20250514",
      max_tokens: max_tokens || 500,
      resposta_automatica: resposta_automatica ?? false,
      janela_inicio: janela_inicio || null,
      janela_fim: janela_fim || null,
      dias_uteis_only: dias_uteis_only ?? false,
      whatsapp_number_id_default: whatsapp_number_id_default || null,
      fluxo_qualificacao: fluxo_qualificacao || null,
      exemplos_dialogo: exemplos_dialogo || null,
      gatilhos_escalada: gatilhos_escalada || null,
      frases_proibidas: frases_proibidas || null,
      objeccoes: objeccoes || null,
      fallback: fallback || null,
      ativo: ativo ?? true,
      is_default: is_default ?? false,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
