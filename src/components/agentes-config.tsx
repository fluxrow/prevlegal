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
} from "lucide-react";

interface Agente {
  id: string;
  nome_interno: string;
  nome_publico: string;
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

const AGENTE_VAZIO: Omit<Agente, "id" | "created_at"> = {
  nome_interno: "",
  nome_publico: "",
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
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
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
            placeholder="Ex: Ana — Triagem"
          />
        </div>
        <div>
          <label style={labelStyle}>Nome público</label>
          <input
            style={inputStyle}
            value={form.nome_publico}
            onChange={(e) => set("nome_publico", e.target.value)}
            placeholder="Ex: Ana"
          />
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
            <label style={labelStyle}>WhatsApp Number ID padrão</label>
            <input
              style={inputStyle}
              value={form.whatsapp_number_id_default || ""}
              onChange={(e) =>
                set("whatsapp_number_id_default", e.target.value)
              }
              placeholder="ID do número no Twilio/Meta"
            />
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

export default function AgentesConfig() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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

  useEffect(() => {
    fetchAgentes();
  }, [fetchAgentes]);

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
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
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
