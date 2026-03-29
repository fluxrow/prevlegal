export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant-context";
import { resolveWhatsAppChannel, sendWhatsAppMessage } from "@/lib/whatsapp-provider";
import {
  applyWarmupPolicyToThrottleSettings,
  getWhatsAppWarmupPolicy,
} from "@/lib/whatsapp-warmup";

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq("tenant_id", tenantId) : query.is("tenant_id", null);
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authSupabase = await createServerClient();
    const context = await getTenantContext(authSupabase);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!context.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { id: campanhaId } = await params;

    // Buscar campanha
    let campanhaQuery = adminClient
      .from("campanhas")
      .select("*")
      .eq("id", campanhaId);
    campanhaQuery = applyTenantFilter(campanhaQuery, context.tenantId);
    const { data: campanha, error: campErr } = await campanhaQuery.single();
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
    let query = adminClient
      .from("leads")
      .select("id, nome, nb, cpf, telefone, banco, valor_rma, ganho_potencial, tem_whatsapp")
      .eq("lista_id", campanha.lista_id)
      .eq("lgpd_optout", false);
    query = applyTenantFilter(query, context.tenantId);

    const { data: leadsDaLista } = await query;

    if (!leadsDaLista || leadsDaLista.length === 0) {
      await adminClient
        .from("campanhas")
        .update({ status: "encerrada", concluido_em: new Date().toISOString() })
        .eq("id", campanhaId);
      return NextResponse.json({
        success: true,
        enviados: 0,
        message: "Nenhum lead na lista",
      });
    }

    // Filtrar leads: apenas com WhatsApp verificado se configurado
    const leads = leadsDaLista.filter(
      (l: any) =>
        l && (!campanha.apenas_verificados || l.tem_whatsapp === true),
    );

    const channel = await resolveWhatsAppChannel(
      context.tenantId,
      campanha.whatsapp_number_id || null,
    );
    const throttleSettings = applyWarmupPolicyToThrottleSettings(
      {
        limitDaily: campanha.limite_diario,
        batchSize: campanha.tamanho_lote,
        pauseBetweenBatchesS: campanha.pausa_entre_lotes_s,
        delayMinMs: campanha.delay_min_ms,
        delayMaxMs: campanha.delay_max_ms,
      },
      getWhatsAppWarmupPolicy(channel.metadata),
    );

    const disponivel = Math.max(0, throttleSettings.limitDaily);
    const leadsParaEnviar = leads.slice(0, disponivel);

    let enviados = 0,
      falhos = 0;
    const delayMin = throttleSettings.delayMinMs;
    const delayMax = throttleSettings.delayMaxMs;
    const tamLote = throttleSettings.batchSize;
    const pausaLote = throttleSettings.pauseBetweenBatchesS * 1000;
    for (let i = 0; i < leadsParaEnviar.length; i++) {
      // Checar se campanha foi pausada/cancelada
      const { data: status } = await applyTenantFilter(
        adminClient.from("campanhas").select("status").eq("id", campanhaId),
        context.tenantId,
      ).single();
      if (status?.status === "pausada" || status?.status === "encerrada") break;

      const lead = leadsParaEnviar[i];
      const phone = normalizePhone(lead.telefone || "");
      const mensagem = buildMessage(campanha.mensagem_template, lead);

      if (!phone) {
        await adminClient.from("campanha_mensagens").insert({
          campanha_id: campanhaId,
          lead_id: lead.id,
          whatsapp_number_id: channel.id,
          telefone: null,
          mensagem: mensagem,
          status: "falhou",
          erro_detalhe: "Telefone inválido",
        });
        falhos++;
      } else {
        const result = await sendWhatsAppMessage({
          tenantId: context.tenantId,
          to: phone,
          body: mensagem,
          preferredNumberId: channel.id,
        });
        if (result.success) {
          await adminClient.from("campanha_mensagens").insert({
            campanha_id: campanhaId,
            lead_id: lead.id,
            whatsapp_number_id: channel.id,
            telefone: phone,
            mensagem: mensagem,
            status: "enviado",
            twilio_sid: result.externalMessageId,
            enviado_at: new Date().toISOString(),
          });
          enviados++;
        } else {
          await adminClient.from("campanha_mensagens").insert({
            campanha_id: campanhaId,
            lead_id: lead.id,
            whatsapp_number_id: channel.id,
            telefone: phone,
            mensagem: mensagem,
            status: "falhou",
            erro_detalhe: result.error || "Falha no envio WhatsApp",
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
        status: "encerrada",
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
