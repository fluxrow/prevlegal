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

function normalizeContactType(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || "titular";
}

function sourceLooksWhatsAppCapable(source: string | null | undefined) {
  const normalized = String(source || "").trim().toUpperCase();
  if (!normalized) return false;
  return (
    normalized.includes("WHATSAPP") ||
    normalized.includes("CELULAR") ||
    normalized.includes("MOBILE")
  );
}

function chooseRelatedPhone(
  celular: string | null | undefined,
  telefone: string | null | undefined,
) {
  return {
    phone: celular || null,
    verified: Boolean(celular),
  };
}

function resolveCampaignContactForLead(
  lead: {
    telefone?: string | null;
    telefone_enriquecido?: string | null;
    conjuge_celular?: string | null;
    conjuge_telefone?: string | null;
    filho_celular?: string | null;
    filho_telefone?: string | null;
    irmao_celular?: string | null;
    irmao_telefone?: string | null;
    tem_whatsapp?: boolean | null;
    contato_abordagem_tipo?: string | null;
    contato_abordagem_origem?: string | null;
    contato_alternativo_tipo?: string | null;
    contato_alternativo_origem?: string | null;
  },
  targetType?: string | null,
) {
  const normalizedTarget = String(targetType || "").trim().toLowerCase();

  if (normalizedTarget === "conjuge") {
    const resolved = chooseRelatedPhone(lead.conjuge_celular, lead.conjuge_telefone);
    return resolved.phone
      ? { phone: resolved.phone, type: "conjuge", source: "structured_related_contact", verified: resolved.verified }
      : null;
  }

  if (normalizedTarget === "filho") {
    const resolved = chooseRelatedPhone(lead.filho_celular, lead.filho_telefone);
    return resolved.phone
      ? { phone: resolved.phone, type: "filho", source: "structured_related_contact", verified: resolved.verified }
      : null;
  }

  if (normalizedTarget === "irmao") {
    const resolved = chooseRelatedPhone(lead.irmao_celular, lead.irmao_telefone);
    return resolved.phone
      ? { phone: resolved.phone, type: "irmao", source: "structured_related_contact", verified: resolved.verified }
      : null;
  }

  const candidates = [
    {
      phone: lead.telefone || null,
      type: normalizeContactType(lead.contato_abordagem_tipo),
      source: lead.contato_abordagem_origem || null,
      verified:
        lead.tem_whatsapp === true ||
        sourceLooksWhatsAppCapable(lead.contato_abordagem_origem),
    },
    {
      phone: lead.telefone_enriquecido || null,
      type: normalizeContactType(lead.contato_alternativo_tipo),
      source: lead.contato_alternativo_origem || null,
      verified: sourceLooksWhatsAppCapable(lead.contato_alternativo_origem),
    },
  ].filter((candidate) => Boolean(candidate.phone) && candidate.verified);

  if (!normalizedTarget) {
    return candidates[0] || null;
  }

  return candidates.find((candidate) => candidate.type === normalizedTarget) || null;
}

async function ensureConversationForCampaignLead(
  adminClient: ReturnType<typeof createAdminClient>,
  {
    tenantId,
    leadId,
    phone,
    whatsappNumberId,
    lastMessage,
  }: {
    tenantId: string | null
    leadId: string
    phone: string
    whatsappNumberId: string | null
    lastMessage: string
  },
) {
  let query = adminClient
    .from("conversas")
    .select("id, status, whatsapp_number_id")
    .eq("lead_id", leadId)
    .limit(1)

  query = applyTenantFilter(query, tenantId)

  const { data: existente } = await query.maybeSingle()
  const agora = new Date().toISOString()

  if (existente) {
    await adminClient
      .from("conversas")
      .update({
        telefone: phone,
        whatsapp_number_id: existente.whatsapp_number_id || whatsappNumberId,
        ultima_mensagem: lastMessage,
        ultima_mensagem_at: agora,
      })
      .eq("id", existente.id)

    return existente.id as string
  }

  const { data: criada, error } = await adminClient
    .from("conversas")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      telefone: phone,
      status: "agente",
      ultima_mensagem: lastMessage,
      ultima_mensagem_at: agora,
      nao_lidas: 0,
      whatsapp_number_id: whatsappNumberId,
    })
    .select("id")
    .single()

  if (error || !criada?.id) {
    throw new Error(error?.message || "Falha ao criar conversa da campanha")
  }

  return criada.id as string
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

    const { data: selectedLeadRows, error: selectedLeadRowsError } = await adminClient
      .from("campanha_leads")
      .select("lead_id")
      .eq("tenant_id", context.tenantId)
      .eq("campanha_id", campanhaId);

    if (selectedLeadRowsError) {
      return NextResponse.json({ error: selectedLeadRowsError.message }, { status: 500 });
    }

    const selectedLeadIds = (selectedLeadRows || []).map((row) => row.lead_id).filter(Boolean);

    let query = adminClient
      .from("leads")
      .select("id, nome, nb, cpf, telefone, telefone_enriquecido, conjuge_celular, conjuge_telefone, filho_celular, filho_telefone, irmao_celular, irmao_telefone, banco, valor_rma, ganho_potencial, tem_whatsapp, contato_abordagem_tipo, contato_abordagem_origem, contato_alternativo_tipo, contato_alternativo_origem")
      .eq("lgpd_optout", false);
    query = applyTenantFilter(query, context.tenantId);

    if (selectedLeadIds.length > 0) {
      query = query.in("id", selectedLeadIds);
    } else {
      query = query.eq("lista_id", campanha.lista_id);
    }

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

    // Resolver o contato operacional correto por tipo de alvo da campanha.
    const leads = leadsDaLista
      .map((lead: any) => {
        const resolvedContact = resolveCampaignContactForLead(
          lead,
          campanha.contato_alvo_tipo,
        );

        return resolvedContact
          ? {
              ...lead,
              _targetPhone: resolvedContact.phone,
              _targetType: resolvedContact.type,
              _targetVerified: resolvedContact.verified,
            }
          : null;
      })
      .filter(
        (lead: any) =>
          lead &&
          (!campanha.apenas_verificados || lead._targetVerified === true),
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
      const phone = normalizePhone(lead._targetPhone || "");
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
          const conversaId = await ensureConversationForCampaignLead(adminClient, {
            tenantId: context.tenantId,
            leadId: lead.id,
            phone,
            whatsappNumberId: channel.id,
            lastMessage: mensagem,
          });

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

          await adminClient.from("mensagens_inbound").insert({
            tenant_id: context.tenantId,
            lead_id: lead.id,
            campanha_id: campanhaId,
            conversa_id: conversaId,
            whatsapp_number_id: channel.id,
            telefone_remetente: result.from || null,
            telefone_destinatario: phone,
            mensagem,
            respondido_por_agente: true,
            respondido_manualmente: false,
            resposta_agente: mensagem,
            twilio_sid: result.externalMessageId,
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
