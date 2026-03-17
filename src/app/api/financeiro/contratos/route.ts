import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addMonths, format } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = request.nextUrl.searchParams.get("lead_id");

  let query = supabase
    .from("contratos")
    .select(
      `
      *,
      lead:leads(id, nome, cpf, status),
      parcelas(id, numero, valor, data_vencimento, data_pagamento, status)
    `,
    )
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    lead_id,
    tipo_cobranca,
    valor_total,
    percentual_exito,
    descricao,
    num_parcelas,
    data_inicio,
  } = body;

  if (!lead_id || !tipo_cobranca || !valor_total) {
    return NextResponse.json(
      { error: "Campos obrigatórios: lead_id, tipo_cobranca, valor_total" },
      { status: 400 },
    );
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert({
      usuario_id: user.id,
      lead_id,
      tipo_cobranca,
      valor_total,
      percentual_exito: percentual_exito ?? null,
      descricao: descricao ?? null,
      data_inicio: data_inicio ?? format(new Date(), "yyyy-MM-dd"),
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Gera parcelas automaticamente quando num_parcelas >= 1 e tipo não é só êxito
  if (num_parcelas && num_parcelas >= 1 && tipo_cobranca !== "exito") {
    const valorParcela = Number((valor_total / num_parcelas).toFixed(2));
    const inicio = data_inicio ? new Date(data_inicio) : new Date();

    const parcelas = Array.from({ length: num_parcelas }, (_, i) => ({
      contrato_id: contrato.id,
      usuario_id: user.id,
      numero: i + 1,
      valor:
        i === num_parcelas - 1
          ? Number((valor_total - valorParcela * (num_parcelas - 1)).toFixed(2))
          : valorParcela,
      data_vencimento: format(addMonths(inicio, i), "yyyy-MM-dd"),
      status: "pendente",
    }));

    await supabase.from("parcelas").insert(parcelas);
  }

  // Busca contrato completo com parcelas
  const { data: full } = await supabase
    .from("contratos")
    .select("*, parcelas(*)")
    .eq("id", contrato.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
