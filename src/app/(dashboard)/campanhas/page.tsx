"use client";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Zap, CheckCircle2, XCircle, X } from "lucide-react";
import CampanhasOnboardingTour from "@/components/campanhas-onboarding-tour";

type Toast = { id: number; type: "success" | "error"; message: string };

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;
  function show(type: Toast["type"], message: string) {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4500,
    );
  }
  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }
  return { toasts, show, dismiss };
}

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            background: "var(--bg-card)",
            border: `1px solid ${t.type === "success" ? "#22c55e40" : "#ef444440"}`,
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            minWidth: "280px",
            maxWidth: "400px",
            animation: "slideIn 0.2s ease",
          }}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
          ) : (
            <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          )}
          <span
            style={{
              flex: 1,
              fontSize: "13px",
              color: "var(--text-primary)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {t.message}
          </span>
          <button
            onClick={() => dismiss(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "2px",
              display: "flex",
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

interface Campanha {
  id: string;
  nome: string;
  status: string;
  total_leads: number;
  total_enviados: number;
  total_falhos: number;
  total_respondidos: number;
  mensagem_template: string;
  created_at: string;
  listas?: { nome: string };
  agentes?: { id: string; nome_interno: string; nome_publico: string } | null;
  agente_id?: string | null;
}

interface Lista {
  id: string;
  nome: string;
  total_leads: number;
  com_whatsapp: number;
}

interface Agente {
  id: string;
  nome_interno: string;
  nome_publico: string;
  tipo: string;
  ativo: boolean;
}

const STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  rascunho: { label: "Rascunho", color: "#94a3b8", bg: "#94a3b820" },
  ativa: { label: "Ativa", color: "#22c55e", bg: "#22c55e20" },
  pausada: { label: "Pausada", color: "#f59e0b", bg: "#f59e0b20" },
  encerrada: { label: "Encerrada", color: "#4f7aff", bg: "#4f7aff20" },
  concluida: { label: "Concluída", color: "#4f7aff", bg: "#4f7aff20" },
  cancelada: { label: "Cancelada", color: "#ef4444", bg: "#ef444420" },
};

export default function CampanhasPage() {
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const [confirmDisparo, setConfirmDisparo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"campanhas" | "configuracao">(
    "campanhas",
  );
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [disparando, setDisparando] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    lista_id: "",
    agente_id: "",
    mensagem_template: "",
    delay_min_ms: 1500,
    delay_max_ms: 3500,
    tamanho_lote: 50,
    pausa_entre_lotes_s: 30,
    limite_diario: 500,
    apenas_verificados: true,
  });
  const [saving, setSaving] = useState(false);
  const [configDisparo, setConfigDisparo] = useState({
    twilio_numero_origem: "whatsapp:+14155238886",
    twilio_horario_inicio: 8,
    twilio_horario_fim: 20,
    twilio_limite_diario: 200,
    twilio_modo: "sandbox" as "sandbox" | "producao",
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    async function fetchConfigDisparo() {
      const res = await fetch("/api/configuracoes");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfigDisparo({
            twilio_numero_origem:
              data.twilio_numero_origem || "whatsapp:+14155238886",
            twilio_horario_inicio: data.twilio_horario_inicio ?? 8,
            twilio_horario_fim: data.twilio_horario_fim ?? 20,
            twilio_limite_diario: data.twilio_limite_diario ?? 200,
            twilio_modo: data.twilio_modo || "sandbox",
          });
        }
      }
    }
    fetchConfigDisparo();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [c, l, a] = await Promise.all([
      fetch("/api/campanhas").then((r) => r.json()),
      fetch("/api/listas").then((r) => r.json()),
      fetch("/api/agentes").then((r) => r.json()),
    ]);
    setCampanhas(c.campanhas || []);
    setListas(l.listas || []);
    setAgentes((a.agentes || []).filter((ag: Agente) => ag.ativo));
    setLoading(false);
  }

  async function criarCampanha() {
    setSaving(true);
    const res = await fetch("/api/campanhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        nome: "",
        lista_id: "",
        agente_id: "",
        mensagem_template: "",
        delay_min_ms: 1500,
        delay_max_ms: 3500,
        tamanho_lote: 50,
        pausa_entre_lotes_s: 30,
        limite_diario: 500,
        apenas_verificados: true,
      });
      await fetchAll();
    }
    setSaving(false);
  }

  async function disparar(id: string) {
    setConfirmDisparo(null);
    setDisparando(id);
    const res = await fetch(`/api/campanhas/${id}/disparar`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.success)
      showToast(
        "success",
        `Disparo concluído: ${data.enviados} enviados, ${data.falhos} falhos`,
      );
    else showToast("error", data.error || "Erro ao disparar campanha");
    setDisparando(null);
    await fetchAll();
  }

  async function salvarConfigDisparo() {
    setSavingConfig(true);
    try {
      await fetch("/api/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configDisparo),
      });
    } finally {
      setSavingConfig(false);
    }
  }

  const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

  return (
    <div style={{ padding: "32px", maxWidth: "1200px" }}>
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* Modal de confirmação de disparo */}
      {confirmDisparo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "16px",
                fontWeight: "700",
                color: "var(--text-primary)",
                marginTop: 0,
                marginBottom: "8px",
              }}
            >
              Confirmar disparo
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                fontFamily: "DM Sans, sans-serif",
                marginBottom: "24px",
              }}
            >
              O disparo iniciará imediatamente para todos os leads da lista.
              Esta ação não pode ser desfeita.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setConfirmDisparo(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => disparar(confirmDisparo)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "#22c55e",
                  color: "#fff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Zap size={13} /> Confirmar disparo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "24px",
            fontWeight: "700",
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            marginBottom: "4px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Megaphone size={22} color="var(--accent)" /> Campanhas
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          Gerencie campanhas e configurações de disparo WhatsApp
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "28px",
          background: "var(--bg-card)",
          borderRadius: "10px",
          padding: "4px",
          width: "fit-content",
          border: "1px solid var(--border)",
        }}
      >
        {[
          { id: "campanhas", label: "Campanhas", icon: "📢" },
          { id: "configuracao", label: "Configuração de Disparo", icon: "⚙️" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "campanhas" | "configuracao")}
            style={{
              padding: "8px 18px",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              fontFamily: "DM Sans, sans-serif",
              background:
                activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Campanhas */}
      {activeTab === "campanhas" && (
        <div data-tour="campanhas-lista" style={{ maxWidth: "960px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "28px",
            }}
          >
            <div>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  margin: 0,
                }}
              >
                Crie e dispare campanhas de WhatsApp para suas listas de leads
              </p>
            </div>
            <button
              data-tour="campanhas-nova"
              onClick={() => setShowForm(!showForm)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "9px 16px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Nova campanha
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              data-tour="campanhas-metricas"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                Métricas de entrega
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Cada campanha mostra quantos leads foram enviados, quantos
                responderam e quantas falhas aconteceram ao longo do disparo.
              </p>
            </div>

            <div
              data-tour="campanhas-agente"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                Agente IA nas respostas
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Depois do disparo, as respostas dos leads podem seguir para o
                fluxo automatizado do agente, que qualifica o contato e escala
                os casos quentes para você.
              </p>
            </div>
          </div>

          {/* Formulário nova campanha */}
          {showForm && (
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  marginTop: 0,
                  marginBottom: "20px",
                }}
              >
                Nova Campanha
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Nome da campanha *
                  </label>
                  <input
                    value={form.nome}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, nome: e.target.value }))
                    }
                    placeholder="Ex: Disparo NOMES RJ BNG - Março"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-hover)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Lista de leads *
                  </label>
                  <select
                    value={form.lista_id}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, lista_id: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-hover)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    <option value="">Selecionar lista...</option>
                    {listas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} ({l.com_whatsapp} com WhatsApp)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seletor de Agente IA — Fase D */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Agente IA para esta campanha{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    (opcional — usa o agente padrão do escritório se não selecionado)
                  </span>
                </label>
                <select
                  value={form.agente_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, agente_id: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-hover)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                >
                  <option value="">
                    {agentes.length === 0
                      ? "Nenhum agente configurado"
                      : "Usar agente padrão do escritório"}
                  </option>
                  {agentes.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.nome_interno}
                      {ag.tipo !== "geral" ? ` — ${ag.tipo.replace(/_/g, " ")}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Mensagem template * — use {"{nome}"}, {"{nb}"}, {"{banco}"},{" "}
                  {"{valor}"}, {"{ganho}"}
                </label>
                <textarea
                  value={form.mensagem_template}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      mensagem_template: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Olá {nome}! Identificamos que o seu benefício {nb} pode ter direito a revisão..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-hover)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                {[
                  {
                    key: "limite_diario",
                    label: "Máx. msgs/dia",
                    suffix: "mensagens",
                    hint: "Quantas mensagens enviar por dia no máximo",
                  },
                  {
                    key: "tamanho_lote",
                    label: "Msgs por lote",
                    suffix: "mensagens",
                    hint: "Mensagens antes de fazer uma pausa maior",
                  },
                  {
                    key: "pausa_entre_lotes_s",
                    label: "Pausa entre lotes",
                    suffix: "segundos",
                    hint: "Tempo de pausa entre cada lote (anti-bloqueio)",
                  },
                  {
                    key: "delay_min_ms",
                    label: "Intervalo mínimo",
                    suffix: "ms",
                    hint: "Tempo mínimo entre cada mensagem (anti-bloqueio)",
                  },
                ].map(({ key, label, suffix, hint }) => (
                  <div key={key}>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                      title={hint}
                    >
                      {label}
                    </label>
                    <input
                      type="number"
                      value={(form as any)[key]}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          [key]: Number(e.target.value),
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-hover)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                    <span
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
                    >
                      {suffix}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "-4px",
                  marginBottom: "16px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(245, 200, 66, 0.08)",
                  border: "1px solid rgba(245, 200, 66, 0.18)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                Canais novos em warm-up podem impor caps automaticos no backend,
                mesmo que esta campanha tenha parametros mais altos. Isso evita
                blast acidental em numero novo.
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <input
                  type="checkbox"
                  id="apenas_verificados"
                  checked={form.apenas_verificados}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      apenas_verificados: e.target.checked,
                    }))
                  }
                />
                <label
                  htmlFor="apenas_verificados"
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Enviar apenas para leads com WhatsApp verificado
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={criarCampanha}
                  disabled={
                    saving ||
                    !form.nome ||
                    !form.lista_id ||
                    !form.mensagem_template
                  }
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Salvando..." : "Criar campanha"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Carregando campanhas...
            </div>
          )}

          {!loading && campanhas.length === 0 && !showForm && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                border: "1px dashed var(--border)",
                borderRadius: "12px",
                color: "var(--text-muted)",
              }}
            >
              <Megaphone
                size={32}
                style={{ marginBottom: "12px", opacity: 0.4 }}
              />
              <p style={{ fontSize: "14px" }}>Nenhuma campanha criada</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Crie uma campanha para disparar mensagens para seus leads
              </p>
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {campanhas.map((c) => {
              const st = STATUS_LABEL[c.status] || STATUS_LABEL.rascunho;
              const pctEnv = pct(c.total_enviados, c.total_leads);
              const isDisparando = disparando === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "20px 24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "4px",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                          }}
                        >
                          {c.nome}
                        </h3>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "500",
                            padding: "2px 8px",
                            borderRadius: "99px",
                            color: st.color,
                            background: st.bg,
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <span
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        {c.listas?.nome} ·{" "}
                        {c.total_leads.toLocaleString("pt-BR")} leads · criada
                        em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {["rascunho", "pausada"].includes(c.status) && (
                      <button
                        onClick={() => setConfirmDisparo(c.id)}
                        disabled={isDisparando}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          background: isDisparando
                            ? "var(--bg-hover)"
                            : "#22c55e20",
                          color: isDisparando ? "var(--text-muted)" : "#22c55e",
                          border:
                            "1px solid " +
                            (isDisparando ? "var(--border)" : "#22c55e40"),
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: isDisparando ? "not-allowed" : "pointer",
                        }}
                      >
                        <Zap size={13} />
                        {isDisparando ? "Disparando..." : "Disparar agora"}
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      marginBottom: "12px",
                    }}
                  >
                    {[
                      {
                        label: "Enviados",
                        value: c.total_enviados,
                        color: "#4f7aff",
                      },
                      {
                        label: "Respondidos",
                        value: c.total_respondidos || 0,
                        color: "#22c55e",
                      },
                      {
                        label: "Falhos",
                        value: c.total_falhos || 0,
                        color: "#ef4444",
                      },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <span
                          style={{ fontSize: "18px", fontWeight: "700", color }}
                        >
                          {value}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            display: "block",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {c.total_leads > 0 && (
                    <div
                      style={{
                        height: "4px",
                        borderRadius: "99px",
                        background: "var(--bg-hover)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: pctEnv + "%",
                          background: "var(--accent)",
                          transition: "width 0.4s",
                        }}
                      />
                    </div>
                  )}

                  {c.mensagem_template && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "var(--bg-hover)",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      &quot;{c.mensagem_template.substring(0, 120)}
                      {c.mensagem_template.length > 120 ? "..." : ""}&quot;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Configuração de Disparo */}
      {activeTab === "configuracao" && (
        <div style={{ maxWidth: "600px" }}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "28px",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "20px",
                marginTop: 0,
              }}
            >
              Conexão Twilio
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background:
                    configDisparo.twilio_modo === "producao"
                      ? "#2dd4a020"
                      : "#f5c84220",
                  color:
                    configDisparo.twilio_modo === "producao"
                      ? "#2dd4a0"
                      : "#f5c842",
                }}
              >
                {configDisparo.twilio_modo === "producao"
                  ? "🟢 Produção"
                  : "🟡 Sandbox"}
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Número de origem
              </label>
              <input
                type="text"
                value={configDisparo.twilio_numero_origem}
                placeholder="whatsapp:+14155238886"
                onChange={(e) =>
                  setConfigDisparo((prev) => ({
                    ...prev,
                    twilio_numero_origem: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "DM Sans, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Modo de operação
              </label>
              <select
                value={configDisparo.twilio_modo}
                onChange={(e) =>
                  setConfigDisparo((prev) => ({
                    ...prev,
                    twilio_modo: e.target.value as "sandbox" | "producao",
                  }))
                }
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <option value="sandbox">Sandbox (testes)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "28px",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "20px",
                marginTop: 0,
              }}
            >
              Regras de Disparo
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Horário de início
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={configDisparo.twilio_horario_inicio}
                  onChange={(e) =>
                    setConfigDisparo((prev) => ({
                      ...prev,
                      twilio_horario_inicio: +e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    fontFamily: "DM Sans, sans-serif",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Horário de fim
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={configDisparo.twilio_horario_fim}
                  onChange={(e) =>
                    setConfigDisparo((prev) => ({
                      ...prev,
                      twilio_horario_fim: +e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    fontFamily: "DM Sans, sans-serif",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Limite diário de disparos
              </label>
              <input
                type="number"
                min={1}
                value={configDisparo.twilio_limite_diario}
                onChange={(e) =>
                  setConfigDisparo((prev) => ({
                    ...prev,
                    twilio_limite_diario: +e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "DM Sans, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <button
            onClick={salvarConfigDisparo}
            disabled={savingConfig}
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              fontFamily: "DM Sans, sans-serif",
              cursor: savingConfig ? "not-allowed" : "pointer",
              opacity: savingConfig ? 0.7 : 1,
            }}
          >
            {savingConfig ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      )}

      <CampanhasOnboardingTour />
    </div>
  );
}
