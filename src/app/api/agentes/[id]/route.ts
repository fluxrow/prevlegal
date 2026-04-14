import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { contextHasPermission, getTenantContext } from "@/lib/tenant-context";
import { createAdminSupabase } from "@/lib/internal-collaboration";
import { normalizeOperationProfile } from "@/lib/operation-profile";

async function resolveWhatsappNumberId(
  supabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string | null,
  whatsappNumberId: unknown,
) {
  const normalized =
    typeof whatsappNumberId === "string" ? whatsappNumberId.trim() : "";

  if (!normalized) {
    return { value: null as string | null };
  }

  if (!tenantId) {
    return { error: "Tenant inválido para vincular canal WhatsApp." };
  }

  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select("id")
    .eq("id", normalized)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Canal WhatsApp não encontrado neste escritório." };
  }

  return { value: normalized };
}

const CAMPOS_EDITAVEIS = [
  "nome_interno",
  "nome_publico",
  "perfil_operacao",
  "tipo",
  "descricao",
  "objetivo",
  "persona",
  "prompt_base",
  "modelo",
  "max_tokens",
  "resposta_automatica",
  "janela_inicio",
  "janela_fim",
  "dias_uteis_only",
  "whatsapp_number_id_default",
  "fluxo_qualificacao",
  "exemplos_dialogo",
  "gatilhos_escalada",
  "frases_proibidas",
  "objeccoes",
  "fallback",
  "ativo",
  "is_default",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createServerClient();
  const context = await getTenantContext(authSupabase);
  if (!context)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!contextHasPermission(context, "agentes_manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createAdminSupabase();

  // Verificar que o agente pertence ao tenant
  const { data: existente } = await supabase
    .from("agentes")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  if (!existente)
    return NextResponse.json(
      { error: "Agente não encontrado" },
      { status: 404 },
    );

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.whatsapp_number_id_default !== undefined) {
    const resolvedWhatsappNumber = await resolveWhatsappNumberId(
      supabase,
      context.tenantId,
      body.whatsapp_number_id_default,
    );

    if ("error" in resolvedWhatsappNumber) {
      return NextResponse.json(
        { error: resolvedWhatsappNumber.error },
        { status: 400 },
      );
    }

    body.whatsapp_number_id_default = resolvedWhatsappNumber.value;
  }

  if (body.perfil_operacao !== undefined) {
    body.perfil_operacao = normalizeOperationProfile(body.perfil_operacao);
  }

  CAMPOS_EDITAVEIS.forEach((campo) => {
    if (body[campo] !== undefined) updates[campo] = body[campo];
  });

  const { data, error } = await supabase
    .from("agentes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createServerClient();
  const context = await getTenantContext(authSupabase);
  if (!context)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!contextHasPermission(context, "agentes_manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createAdminSupabase();

  const { data: existente } = await supabase
    .from("agentes")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  if (!existente)
    return NextResponse.json(
      { error: "Agente não encontrado" },
      { status: 404 },
    );

  const { error } = await supabase.from("agentes").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
