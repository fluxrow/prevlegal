export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalizePhone(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) return "+55" + digits;
  if (digits.length === 10)
    return "+55" + digits.slice(0, 2) + "9" + digits.slice(2);
  if (digits.length === 13 && digits.startsWith("55")) return "+" + digits;
  if (digits.length === 12 && digits.startsWith("55"))
    return "+" + digits.slice(0, 4) + "9" + digits.slice(4);
  return null;
}

function buildMessage(template: string, lead: any): string {
  return template
    .replace(/\{nome\}/gi, lead.nome?.split(" ")[0] || "Prezado(a)")
    .replace(/\{nome_completo\}/gi, lead.nome || "")
    .replace(/\{nb\}/gi, lead.nb || "")
    .replace(/\{banco\}/gi, lead.banco || "")
    .replace(
      /\{valor\}/gi,
      lead.valor_rma ? `R$ ${Number(lead.valor_rma).toFixed(2)}` : "",
    )
    .replace(
      /\{ganho\}/gi,
      lead.ganho_potencial
        ? `R$ ${Number(lead.ganho_potencial).toFixed(2)}`
        : "",
    );
}

async function sendWhatsApp(
  to: string,
  message: string,
): Promise<{ sid: string } | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
  const encoded = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${from.replace("whatsapp:", "")}`,
        To: `whatsapp:${to}`,
        Body: message,
      }).toString(),
    },
  );

  if (!res.ok) return null;
  const data = await res.json();
  return { sid: data.sid };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campanhaId } = await params;

    // Buscar campanha
    const { data: campanha, error: campErr } = await adminClient
      .from("campanhas")
      .select("*")
      .eq("id", campanhaId)
      .single();
    if (campErr || !campanha)
      return NextResponse.json(
        { error: "Campanha não encontrada" },
        { status: 404 },
      );
    if (!["rascunho", "pausada"].includes(campanha.status)) {
      return NextResponse.json(
        { error: "Campanha já está " + campanha.status },
        { status: 400 },
      );
    }

    // Marcar como ativa
    await adminClient
      .from("campanhas")
      .update({ status: "ativa", iniciado_em: new Date().toISOString() })
      .eq("id", campanhaId);

    // Buscar leads da lista
    const query = adminClient
      .from("lista_leads")
      .select(
        "lead_id, leads(id, nome, nb, cpf, banco, valor_rma, ganho_potencial, tem_whatsapp)",
      )
      .eq("lista_id", campanha.lista_id);

    const { data: listaLeads } = await query;

    if (!listaLeads || listaLeads.length === 0) {
      await adminClient
        .from("campanhas")
        .update({ status: "concluida", concluido_em: new Date().toISOString() })
        .eq("id", campanhaId);
      return NextResponse.json({
        success: true,
        enviados: 0,
        message: "Nenhum lead na lista",
      });
    }

    // Filtrar leads: apenas com WhatsApp verificado se configurado
    const leads = listaLeads
      .map((ll: any) => ll.leads)
      .filter(
        (l: any) =>
          l && (!campanha.apenas_verificados || l.tem_whatsapp === true),
      );

    // Verificar limite diário do número
    const { data: numero } = await adminClient
      .from("numeros_whatsapp")
      .select("*")
      .eq("ativo", true)
      .eq("bloqueado", false)
      .order("total_enviados_hoje", { ascending: true })
      .limit(1)
      .single();

    if (!numero) {
      await adminClient
        .from("campanhas")
        .update({ status: "rascunho" })
        .eq("id", campanhaId);
      return NextResponse.json(
        { error: "Nenhum número WhatsApp ativo disponível" },
        { status: 400 },
      );
    }

    const limite = numero.limite_diario || campanha.limite_diario || 500;
    const jaEnviados = numero.total_enviados_hoje || 0;
    const disponivel = Math.max(0, limite - jaEnviados);
    const leadsParaEnviar = leads.slice(0, disponivel);

    let enviados = 0,
      falhos = 0;
    const delayMin = campanha.delay_min_ms || 1500;
    const delayMax = campanha.delay_max_ms || 3500;
    const tamLote = campanha.tamanho_lote || 50;
    const pausaLote = (campanha.pausa_entre_lotes_s || 30) * 1000;

    for (let i = 0; i < leadsParaEnviar.length; i++) {
      // Checar se campanha foi pausada/cancelada
      const { data: status } = await adminClient
        .from("campanhas")
        .select("status")
        .eq("id", campanhaId)
        .single();
      if (status?.status === "pausada" || status?.status === "cancelada") break;

      const lead = leadsParaEnviar[i];
      const phone = normalizePhone(lead.telefone || "");
      const mensagem = buildMessage(campanha.mensagem_template, lead);

      if (!phone) {
        await adminClient.from("campanha_mensagens").insert({
          campanha_id: campanhaId,
          lead_id: lead.id,
          numero_whatsapp_id: numero.id,
          telefone: null,
          mensagem: mensagem,
          status: "falhou",
          erro_detalhe: "Telefone inválido",
        });
        falhos++;
      } else {
        const result = await sendWhatsApp(phone, mensagem);
        if (result) {
          await adminClient.from("campanha_mensagens").insert({
            campanha_id: campanhaId,
            lead_id: lead.id,
            numero_whatsapp_id: numero.id,
            telefone: phone,
            mensagem: mensagem,
            status: "enviado",
            twilio_sid: result.sid,
            enviado_at: new Date().toISOString(),
          });
          enviados++;
          await adminClient
            .from("numeros_whatsapp")
            .update({
              total_enviados_hoje: jaEnviados + enviados,
              ultimo_envio_at: new Date().toISOString(),
            })
            .eq("id", numero.id);
        } else {
          await adminClient.from("campanha_mensagens").insert({
            campanha_id: campanhaId,
            lead_id: lead.id,
            numero_whatsapp_id: numero.id,
            telefone: phone,
            mensagem: mensagem,
            status: "falhou",
            erro_detalhe: "Falha no envio Twilio",
          });
          falhos++;
        }
      }

      // Atualizar contador da campanha a cada 10
      if (i % 10 === 0) {
        await adminClient
          .from("campanhas")
          .update({ total_enviados: enviados, total_falhos: falhos })
          .eq("id", campanhaId);
      }

      // Delay anti-ban entre mensagens
      const delay =
        Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
      await new Promise((r) => setTimeout(r, delay));

      // Pausa entre lotes
      if ((i + 1) % tamLote === 0 && i + 1 < leadsParaEnviar.length) {
        await new Promise((r) => setTimeout(r, pausaLote));
      }
    }

    // Finalizar campanha
    await adminClient
      .from("campanhas")
      .update({
        status: "concluida",
        total_enviados: enviados,
        total_falhos: falhos,
        total_contatados: enviados,
        concluido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campanhaId);

    return NextResponse.json({ success: true, enviados, falhos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
