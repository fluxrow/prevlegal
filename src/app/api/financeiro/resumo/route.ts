import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hoje = new Date();
  const inicioMes = format(startOfMonth(hoje), "yyyy-MM-dd");
  const fimMes = format(endOfMonth(hoje), "yyyy-MM-dd");

  const [contratosRes, parcelasRes, atrasadasRes, mesRes] = await Promise.all([
    supabase
      .from("contratos")
      .select("id, valor_total, status, tipo_cobranca")
      .eq("usuario_id", user.id),
    supabase
      .from("parcelas")
      .select("id, valor, status, data_vencimento")
      .eq("usuario_id", user.id),
    supabase
      .from("parcelas")
      .select("id, valor")
      .eq("usuario_id", user.id)
      .eq("status", "atrasado"),
    supabase
      .from("parcelas")
      .select("id, valor, status")
      .eq("usuario_id", user.id)
      .gte("data_vencimento", inicioMes)
      .lte("data_vencimento", fimMes),
  ]);

  const contratos = contratosRes.data ?? [];
  const parcelas = parcelasRes.data ?? [];
  const atrasadas = atrasadasRes.data ?? [];
  const parcelasMes = mesRes.data ?? [];

  const totalContratado = contratos
    .filter((c) => c.status === "ativo")
    .reduce((s, c) => s + Number(c.valor_total), 0);

  const totalRecebido = parcelas
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  const totalPendente = parcelas
    .filter((p) => p.status === "pendente")
    .reduce((s, p) => s + Number(p.valor), 0);

  const totalAtrasado = atrasadas.reduce((s, p) => s + Number(p.valor), 0);

  const recebidoMes = parcelasMes
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  const previstomMes = parcelasMes.reduce((s, p) => s + Number(p.valor), 0);

  return NextResponse.json({
    total_contratado: totalContratado,
    total_recebido: totalRecebido,
    total_pendente: totalPendente,
    total_atrasado: totalAtrasado,
    recebido_mes: recebidoMes,
    previsto_mes: previstomMes,
    contratos_ativos: contratos.filter((c) => c.status === "ativo").length,
    parcelas_atrasadas: atrasadas.length,
  });
}
