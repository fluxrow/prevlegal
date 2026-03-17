import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if ("status" in body) updates.status = body.status;
  if ("observacao" in body) updates.observacao = body.observacao;
  if ("data_vencimento" in body) updates.data_vencimento = body.data_vencimento;

  // Marca data de pagamento automaticamente ao baixar como pago
  if (body.status === "pago" && !body.data_pagamento) {
    updates.data_pagamento = format(new Date(), "yyyy-MM-dd");
  } else if ("data_pagamento" in body) {
    updates.data_pagamento = body.data_pagamento;
  }

  const { data, error } = await supabase
    .from("parcelas")
    .update(updates)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
