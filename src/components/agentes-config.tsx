"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  BarChart2,
  Sparkles,
} from "lucide-react";
import {
  AGENT_SEED_PROFILE_SUMMARIES,
  DEFAULT_AGENT_SEED_PROFILE_ID,
} from "@/lib/agent-seed-profiles";

interface Agente {
  id: string;
  nome_interno: string;
  nome_publico: string;
  tipo: string;
  descricao: string | null;
  objetivo: string | null;
  persona: string | null;
  prompt_base: string | null;
  modelo: string;
  max_tokens: number;
  resposta_automatica: boolean;
  janela_inicio: string | null;
  janela_fim: string | null;
  dias_uteis_only: boolean;
  whatsapp_number_id_default: string | null;
  fluxo_qualificacao: string | null;
  exemplos_dialogo: string | null;
  gatilhos_escalada: string | null;
  frases_proibidas: string | null;
  objeccoes: string | null;
  fallback: string | null;
  ativo: boolean;
  is_default: boolean;
  created_at: string;
}

interface WhatsappChannel {
  id: string;
  label: string | null;
  provider: "twilio" | "zapi";
  phone: string | null;
  display_phone: string | null;
  purpose: string | null;
  ativo: boolean;
  is_default: boolean;
}

const TIPO_OPTIONS = [
  { value: "geral", label: "Geral" },
  { value: "triagem", label: "Triagem" },
  { value: "reativacao", label: "Reativação" },
  { value: "documental", label: "Documental" },
  { value: "confirmacao_agenda", label: "Confirmação de Agenda" },
  { value: "followup_comercial", label: "Follow-up Comercial / Fechamento" },
];

const AGENTE_VAZIO: Omit<Agente, "id" | "created_at"> = {
  nome_interno: "",
  nome_publico: "",
  tipo: "geral",
  descricao: "",
  objetivo: "",
  persona: "",
  prompt_base: "",
  modelo: "claude-sonnet-4-20250514",
  max_tokens: 500,
  resposta_automatica: false,
  janela_inicio: "",
  janela_fim: "",
  dias_uteis_only: false,
  whatsapp_number_id_default: "",
  fluxo_qualificacao: "",
  exemplos_dialogo: "",
  gatilhos_escalada: "",
  frases_proibidas: "",
  objeccoes: "",
  fallback: "",
  ativo: true,
  is_default: false,
};

interface FormState extends Omit<Agente, "id" | "created_at"> {}

function AgenteForm({
  initial,
  whatsappChannels,
  channelsLoading,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  whatsappChannels: WhatsappChannel[];
  channelsLoading: boolean;
  onSave: (form: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [avancadoAberto, setAvancadoAberto] = useState(false);

  function set(campo: keyof FormState, valor: unknown) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
    display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    background: "var(--bg-base)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    outline: "none",
    boxSizing: "border-box",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: "80px",
  };

  const activeWhatsappChannels = whatsappChannels.filter(
    (channel) => channel.ativo,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <div>
          <label style={labelStyle}>Nome interno *</label>
          <input
            style={inputStyle}
            value={form.nome_interno}
            onChange={(e) => set("nome_interno", e.target.value)}
            placeholder="Ex: Lia — Triagem Previdenciária"
          />
        </div>
        <div>
          <label style={labelStyle}>Nome público</label>
          <input
            style={inputStyle}
            value={form.nome_publico}
            onChange={(e) => set("nome_publico", e.target.value)}
            placeholder="Ex: Lia"
          />
        </div>
        <div>
          <label style={labelStyle}>Tipo / Roteamento (Fase D)</label>
          <select
            style={inputStyle}
            value={(form as any).tipo || "geral"}
            onChange={(e) => set("tipo" as any, e.target.value)}
          >
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Descrição</label>
        <input
          style={inputStyle}
          value={form.descricao || ""}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Breve descrição do agente"
        />
      </div>

      <div>
        <label style={labelStyle}>Objetivo</label>
        <input
          style={inputStyle}
          value={form.objetivo || ""}
          onChange={(e) => set("objetivo", e.target.value)}
          placeholder="Ex: qualificar leads e agendar consultas gratuitas"
        />
      </div>

      <div>
        <label style={labelStyle}>Prompt base (instruções do sistema)</label>
        <textarea
          style={textareaStyle}
          value={form.prompt_base || ""}
          onChange={(e) => set("prompt_base", e.target.value)}
          placeholder="Você é {nome_publico}, assistente virtual de um escritório de advocacia..."
        />
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          Variáveis: {"{nome}"} {"{nb}"} {"{banco}"} {"{valor}"} {"{ganho}"}{" "}
          {"{escritorio}"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
        }}
      >
        <div>
          <label style={labelStyle}>Modelo</label>
          <select
            style={inputStyle}
            value={form.modelo}
            onChange={(e) => set("modelo", e.target.value)}
          >
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="claude-opus-4-6">Claude Opus 4.6</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Máx. tokens</label>
          <input
            style={inputStyle}
            type="number"
            min={100}
            max={2000}
            value={form.max_tokens}
            onChange={(e) => set("max_tokens", Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Horário (início — fim)</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              style={{ ...inputStyle, width: "50%" }}
              type="time"
              value={form.janela_inicio || ""}
              onChange={(e) => set("janela_inicio", e.target.value)}
            />
            <input
              style={{ ...inputStyle, width: "50%" }}
              type="time"
              value={form.janela_fim || ""}
              onChange={(e) => set("janela_fim", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.resposta_automatica}
            onChange={(e) => set("resposta_automatica", e.target.checked)}
          />
          Resposta automática
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.dias_uteis_only}
            onChange={(e) => set("dias_uteis_only", e.target.checked)}
          />
          Apenas dias úteis
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => set("ativo", e.target.checked)}
          />
          Ativo
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => set("is_default", e.target.checked)}
          />
          Padrão do escritório
        </label>
      </div>

      {/* Avançado */}
      <button
        onClick={() => setAvancadoAberto((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: "12px",
          padding: "0",
        }}
      >
        {avancadoAberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Configurações avançadas
      </button>

      {avancadoAberto && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            paddingLeft: "12px",
            borderLeft: "2px solid var(--border)",
          }}
        >
          <div>
            <label style={labelStyle}>Persona</label>
            <textarea
              style={textareaStyle}
              value={form.persona || ""}
              onChange={(e) => set("persona", e.target.value)}
              placeholder="Descrição da personalidade e estilo de comunicação"
            />
          </div>
          <div>
            <label style={labelStyle}>Fluxo de qualificação</label>
            <textarea
              style={textareaStyle}
              value={form.fluxo_qualificacao || ""}
              onChange={(e) => set("fluxo_qualificacao", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Exemplos de diálogo</label>
            <textarea
              style={textareaStyle}
              value={form.exemplos_dialogo || ""}
              onChange={(e) => set("exemplos_dialogo", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Gatilhos de escalada (um por linha)
            </label>
            <textarea
              style={textareaStyle}
              value={form.gatilhos_escalada || ""}
              onChange={(e) => set("gatilhos_escalada", e.target.value)}
              placeholder="advogada&#10;urgente&#10;problema grave"
            />
          </div>
          <div>
            <label style={labelStyle}>Frases proibidas (uma por linha)</label>
            <textarea
              style={textareaStyle}
              value={form.frases_proibidas || ""}
              onChange={(e) => set("frases_proibidas", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Como lidar com objeções</label>
            <textarea
              style={textareaStyle}
              value={form.objeccoes || ""}
              onChange={(e) => set("objeccoes", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Fallback (quando não entender)</label>
            <input
              style={inputStyle}
              value={form.fallback || ""}
              onChange={(e) => set("fallback", e.target.value)}
              placeholder="Ex: Desculpe, não entendi. Pode reformular?"
            />
          </div>
          <div>
            <label style={labelStyle}>Canal WhatsApp padrão</label>
            <select
              style={inputStyle}
              value={form.whatsapp_number_id_default || ""}
              onChange={(e) =>
                set("whatsapp_number_id_default", e.target.value)
              }
            >
              <option value="">Usar canal padrão do escritório</option>
              {activeWhatsappChannels.map((channel) => {
                const descriptor = [
                  channel.label || null,
                  channel.provider === "zapi" ? "Z-API" : "Twilio",
                  channel.display_phone || null,
                  channel.is_default ? "padrão do escritório" : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <option key={channel.id} value={channel.id}>
                    {descriptor}
                  </option>
                );
              })}
            </select>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "5px",
                lineHeight: 1.5,
              }}
            >
              {channelsLoading
                ? "Carregando canais WhatsApp do escritório..."
                : activeWhatsappChannels.length > 0
                  ? "Na maioria dos casos, recomendamos usar o mesmo número do escritório para todos os agentes. Isso evita que o lead receba mensagens do mesmo caso por canais diferentes."
                  : "Nenhum canal ativo encontrado. Se deixar em branco, o runtime tentará usar o canal padrão do escritório quando ele existir."}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "4px",
        }}
      >
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "8px 18px",
            fontSize: "13px",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            cursor: "pointer",
            color: "var(--text)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.nome_interno.trim()}
          style={{
            padding: "8px 18px",
            fontSize: "13px",
            background: "var(--accent)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#fff",
            fontWeight: "600",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// Card de métricas lazy-loaded por agente (Fase D)
function AgenteMetricas({ agenteId }: { agenteId: string }) {
  const [metricas, setMetricas] = useState<any>(null);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    if (metricas) { setAberto((v) => !v); return; }
    setAberto(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/agentes/${agenteId}/metricas`);
      const data = await res.json();
      setMetricas(data.metricas || null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={carregar}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "5px 10px",
          fontSize: "12px",
          cursor: "pointer",
          color: "var(--text-muted)",
        }}
      >
        <BarChart2 size={12} />
        {aberto ? "Ocultar" : "Métricas"}
      </button>

      {aberto && (
        <div
          style={{
            marginTop: "8px",
            padding: "10px 14px",
            background: "var(--bg-base)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {loading ? (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Carregando…</span>
          ) : metricas ? (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--accent)" }}>
                  {metricas.total_respostas}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Respostas</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {metricas.total_leads_atendidos}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Leads atendidos</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: metricas.taxa_escalonamento_pct > 20 ? "#f59e0b" : "#22c55e",
                  }}
                >
                  {metricas.taxa_escalonamento_pct}%
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Escalonamentos</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-secondary)" }}>
                  {metricas.leads_via_campanha}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Leads via campanha</div>
              </div>
            </>
          ) : (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Sem dados ainda</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentesConfig() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [whatsappChannels, setWhatsappChannels] = useState<WhatsappChannel[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [seedFeedback, setSeedFeedback] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [selectedSeedProfileId, setSelectedSeedProfileId] = useState(
    DEFAULT_AGENT_SEED_PROFILE_ID,
  );

  const fetchAgentes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agentes");
      const data = await res.json();
      setAgentes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWhatsappChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const res = await fetch("/api/whatsapp-numbers");
      const data = await res.json().catch(() => null);
      setWhatsappChannels(Array.isArray(data?.numbers) ? data.numbers : []);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgentes();
    fetchWhatsappChannels();
  }, [fetchAgentes, fetchWhatsappChannels]);

  async function handleCreate(form: FormState) {
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/agentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao criar agente");
        return;
      }
      setCriando(false);
      await fetchAgentes();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, form: FormState) {
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch(`/api/agentes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao salvar");
        return;
      }
      setEditandoId(null);
      await fetchAgentes();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o agente "${nome}"?`)) return;
    const res = await fetch(`/api/agentes/${id}`, { method: "DELETE" });
    if (res.ok) await fetchAgentes();
  }

  async function handleSeedTemplates() {
    setIsSeeding(true);
    setSeedFeedback(null);
    setErro(null);
    try {
      const selectedProfile = AGENT_SEED_PROFILE_SUMMARIES.find(
        (profile) => profile.id === selectedSeedProfileId,
      );
      const res = await fetch("/api/agentes/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: selectedSeedProfileId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSeedFeedback({
          tone: "error",
          text: data?.error || "Erro ao aplicar templates de agentes",
        });
        return;
      }

      await fetchAgentes();

      const details = [
        data?.inserted_count ? `${data.inserted_count} inserido(s)` : null,
        data?.skipped_count ? `${data.skipped_count} já existentes` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const skippedDetails =
        Array.isArray(data?.skipped) && data.skipped.length > 0
          ? ` ${data.skipped
              .map((item: { nome_interno: string; reason: string }) => `${item.nome_interno}: ${item.reason}`)
              .join(" | ")}`
          : "";

      setSeedFeedback({
        tone:
          (data?.inserted_count ?? 0) > 0
            ? "success"
            : (data?.skipped_count ?? 0) > 0
                  ? "warning"
                  : "success",
        text: `${data?.message || `Templates processados para ${selectedProfile?.label || "o modelo selecionado"}.`}${details ? ` ${details}` : ""}${skippedDetails}`,
      });
    } finally {
      setIsSeeding(false);
    }
  }

  if (loading)
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
        Carregando…
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700" }}
          >
            Agentes de IA
          </h3>
          <p
            style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}
          >
            Configure múltiplos agentes com personas e prompts distintos para o
            seu escritório
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleSeedTemplates}
            disabled={isSeeding}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "13px",
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              cursor: isSeeding ? "wait" : "pointer",
              color: "var(--text-primary)",
              fontWeight: "600",
            }}
          >
            <Sparkles size={14} />{" "}
            {isSeeding ? "Aplicando modelo..." : "Aplicar modelo selecionado"}
          </button>
          {!criando && (
            <button
              onClick={() => {
                setCriando(true);
                setEditandoId(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                fontSize: "13px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#fff",
                fontWeight: "600",
              }}
            >
              <Plus size={14} /> Novo agente
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#dc2626",
          }}
        >
          {erro}
        </div>
      )}

      {seedFeedback && (
        <div
          style={{
            padding: "10px 14px",
            background:
              seedFeedback.tone === "success"
                ? "rgba(34,197,94,0.1)"
                : seedFeedback.tone === "warning"
                  ? "rgba(245,200,66,0.12)"
                  : "rgba(239,68,68,0.1)",
            border:
              seedFeedback.tone === "success"
                ? "1px solid rgba(34,197,94,0.24)"
                : seedFeedback.tone === "warning"
                  ? "1px solid rgba(245,200,66,0.24)"
                  : "1px solid rgba(239,68,68,0.24)",
            borderRadius: "8px",
            fontSize: "13px",
            lineHeight: 1.5,
            color:
              seedFeedback.tone === "success"
                ? "#16a34a"
                : seedFeedback.tone === "warning"
                  ? "var(--yellow)"
                  : "#dc2626",
          }}
        >
          {seedFeedback.text}
        </div>
      )}

      <div
        style={{
          padding: "14px 16px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--bg-hover)",
          display: "grid",
          gap: "6px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
          Modelos prontos PrevLegal
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.55 }}>
          O cliente pode começar com um kit já alinhado ao tipo de operação do escritório.
          Cada modelo sobe a base com triagem, confirmação de agenda, reativação,
          documentos e um agente de{" "}
          <strong style={{ color: "var(--text-primary)" }}>fechamento</strong> no tipo{" "}
          <strong style={{ color: "var(--text-primary)" }}>follow-up comercial</strong>.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "14px",
        }}
      >
        {AGENT_SEED_PROFILE_SUMMARIES.map((profile) => {
          const selected = profile.id === selectedSeedProfileId;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelectedSeedProfileId(profile.id)}
              style={{
                textAlign: "left",
                padding: "18px",
                borderRadius: "14px",
                border: selected
                  ? "1px solid rgba(59,130,246,0.45)"
                  : "1px solid var(--border)",
                background: selected ? "var(--accent-glow)" : "var(--bg-surface)",
                display: "grid",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {profile.label}
                  </div>
                  <div style={{ marginTop: "4px", fontSize: "12px", color: selected ? "var(--accent)" : "var(--text-muted)" }}>
                    {profile.subtitle}
                  </div>
                </div>
                {selected && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "var(--accent)",
                      border: "1px solid rgba(59,130,246,0.28)",
                      background: "rgba(59,130,246,0.08)",
                      borderRadius: "999px",
                      padding: "4px 8px",
                    }}
                  >
                    Selecionado
                  </span>
                )}
              </div>

              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {profile.summary}
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "var(--text-primary)" }}>Quando usar:</strong>{" "}
                {profile.audience}
              </div>

              <div style={{ display: "grid", gap: "6px" }}>
                {profile.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: selected ? "var(--accent)" : "var(--text-muted)" }}>•</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: "12px", color: selected ? "var(--accent)" : "var(--text-muted)", fontWeight: "600" }}>
                {profile.highlight}
              </div>
            </button>
          );
        })}
      </div>

      {/* Form de criação */}
      {criando && (
        <div
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h4
            style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600" }}
          >
            Novo agente
          </h4>
          <AgenteForm
            initial={AGENTE_VAZIO}
            whatsappChannels={whatsappChannels}
            channelsLoading={channelsLoading}
            onSave={handleCreate}
            onCancel={() => setCriando(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Lista de agentes */}
      {agentes.length === 0 && !criando ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          <Bot size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Nenhum agente configurado ainda.</p>
          <p style={{ margin: "4px 0 0" }}>
            Crie o primeiro agente para começar.
          </p>
        </div>
      ) : (
        agentes.map((agente) => (
          <div
            key={agente.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {editandoId === agente.id ? (
              <div style={{ padding: "20px" }}>
                <h4
                  style={{
                    margin: "0 0 16px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Editar — {agente.nome_interno}
                </h4>
                <AgenteForm
                  initial={{
                    nome_interno: agente.nome_interno,
                    nome_publico: agente.nome_publico,
                    tipo: agente.tipo,
                    descricao: agente.descricao,
                    objetivo: agente.objetivo,
                    persona: agente.persona,
                    prompt_base: agente.prompt_base,
                    modelo: agente.modelo,
                    max_tokens: agente.max_tokens,
                    resposta_automatica: agente.resposta_automatica,
                    janela_inicio: agente.janela_inicio,
                    janela_fim: agente.janela_fim,
                    dias_uteis_only: agente.dias_uteis_only,
                    whatsapp_number_id_default:
                      agente.whatsapp_number_id_default,
                    fluxo_qualificacao: agente.fluxo_qualificacao,
                    exemplos_dialogo: agente.exemplos_dialogo,
                    gatilhos_escalada: agente.gatilhos_escalada,
                    frases_proibidas: agente.frases_proibidas,
                    objeccoes: agente.objeccoes,
                    fallback: agente.fallback,
                    ativo: agente.ativo,
                    is_default: agente.is_default,
                  }}
                  whatsappChannels={whatsappChannels}
                  channelsLoading={channelsLoading}
                  onSave={(form) => handleUpdate(agente.id, form)}
                  onCancel={() => setEditandoId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>
                      {agente.nome_interno}
                    </span>
                    {agente.is_default && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#d97706",
                          background: "#fef3c7",
                          padding: "2px 7px",
                          borderRadius: "20px",
                        }}
                      >
                        <Star size={10} /> Padrão
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        background: agente.ativo ? "#dcfce7" : "#f1f5f9",
                        color: agente.ativo ? "#16a34a" : "#64748b",
                        fontWeight: "600",
                      }}
                    >
                      {agente.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {agente.descricao || agente.objetivo || "Sem descrição"}
                    {agente.resposta_automatica &&
                      " · Resposta automática ligada"}
                    {agente.janela_inicio &&
                      agente.janela_fim &&
                      ` · ${agente.janela_inicio}–${agente.janela_fim}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "flex-start" }}>
                  <AgenteMetricas agenteId={agente.id} />
                  <button
                    onClick={() => {
                      setEditandoId(agente.id);
                      setCriando(false);
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      background: "none",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(agente.id, agente.nome_interno)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      background: "none",
                      border: "1px solid #fca5a5",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
