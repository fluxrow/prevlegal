"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Parcela {
  id: string;
  numero: number;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "atrasado";
  observacao: string | null;
}

interface Contrato {
  id: string;
  tipo_cobranca: "exito" | "fixo" | "misto";
  valor_total: number;
  percentual_exito: number | null;
  descricao: string | null;
  status: "ativo" | "encerrado" | "cancelado";
  data_inicio: string;
  parcelas: Parcela[];
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

const TIPO_LABEL: Record<string, string> = {
  exito: "Êxito",
  fixo: "Fixo",
  misto: "Misto",
};

const STATUS_PARCELA: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendente: {
    label: "Pendente",
    color: "#f5c842",
    icon: <Clock size={12} />,
  },
  pago: {
    label: "Pago",
    color: "#22c55e",
    icon: <CheckCircle size={12} />,
  },
  atrasado: {
    label: "Atrasado",
    color: "#ff5757",
    icon: <AlertCircle size={12} />,
  },
};

const inputSt: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: "13px",
  fontFamily: "DM Sans, sans-serif",
  boxSizing: "border-box",
};

const selectSt: React.CSSProperties = { ...inputSt };

export default function ContratoLead({ leadId }: { leadId: string }) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tipo_cobranca: "exito",
    valor_total: "",
    percentual_exito: "",
    num_parcelas: "1",
    descricao: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchContratos();
  }, [leadId]);

  async function fetchContratos() {
    const res = await fetch(`/api/financeiro/contratos?lead_id=${leadId}`);
    if (res.ok) setContratos(await res.json());
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.valor_total) return;
    setSaving(true);
    const res = await fetch("/api/financeiro/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: leadId,
        tipo_cobranca: form.tipo_cobranca,
        valor_total: parseFloat(form.valor_total),
        percentual_exito: form.percentual_exito
          ? parseFloat(form.percentual_exito)
          : null,
        num_parcelas:
          form.tipo_cobranca !== "exito" ? parseInt(form.num_parcelas) : 0,
        descricao: form.descricao || null,
        data_inicio: form.data_inicio,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        tipo_cobranca: "exito",
        valor_total: "",
        percentual_exito: "",
        num_parcelas: "1",
        descricao: "",
        data_inicio: format(new Date(), "yyyy-MM-dd"),
      });
      fetchContratos();
    }
    setSaving(false);
  }

  async function handleParcela(parcelaId: string, status: string) {
    const res = await fetch(`/api/financeiro/parcelas/${parcelaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchContratos();
  }

  async function handleDeleteContrato(id: string) {
    if (!confirm("Remover este contrato e todas as parcelas?")) return;
    await fetch(`/api/financeiro/contratos/${id}`, { method: "DELETE" });
    fetchContratos();
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <DollarSign size={14} color="var(--accent)" />
          <h3
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "DM Sans, sans-serif",
              margin: 0,
            }}
          >
            Honorários ({contratos.length})
          </h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#fff",
            background: "var(--accent)",
            border: "none",
            borderRadius: "8px",
            padding: "7px 14px",
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <Plus size={12} /> Novo contrato
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Tipo de cobrança
              </label>
              <select
                style={selectSt}
                value={form.tipo_cobranca}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo_cobranca: e.target.value }))
                }
              >
                <option value="exito">Êxito (% sobre ganho)</option>
                <option value="fixo">Fixo (parcelas mensais)</option>
                <option value="misto">Misto (fixo + êxito)</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Valor total (R$)
              </label>
              <input
                type="number"
                style={inputSt}
                placeholder="0,00"
                value={form.valor_total}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valor_total: e.target.value }))
                }
              />
            </div>

            {(form.tipo_cobranca === "exito" ||
              form.tipo_cobranca === "misto") && (
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontFamily: "DM Sans, sans-serif",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  % de êxito
                </label>
                <input
                  type="number"
                  style={inputSt}
                  placeholder="30"
                  value={form.percentual_exito}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, percentual_exito: e.target.value }))
                  }
                />
              </div>
            )}

            {form.tipo_cobranca !== "exito" && (
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontFamily: "DM Sans, sans-serif",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Nº de parcelas
                </label>
                <input
                  type="number"
                  style={inputSt}
                  min="1"
                  value={form.num_parcelas}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, num_parcelas: e.target.value }))
                  }
                />
              </div>
            )}

            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Data de início
              </label>
              <input
                type="date"
                style={inputSt}
                value={form.data_inicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data_inicio: e.target.value }))
                }
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Descrição (opcional)
              </label>
              <input
                type="text"
                style={inputSt}
                placeholder="Ex: Honorário de êxito — revisão de benefício"
                value={form.descricao}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descricao: e.target.value }))
                }
              />
            </div>
          </div>

          <div
            style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
          >
            <button
              onClick={() => setShowForm(false)}
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.valor_total}
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#fff",
                background: saving ? "var(--text-muted)" : "var(--accent)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 20px",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {saving ? "Salvando..." : "Criar contrato"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de contratos */}
      {loading ? (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Carregando...
        </p>
      ) : contratos.length === 0 ? (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            fontFamily: "DM Sans, sans-serif",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          Nenhum contrato de honorário ainda.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {contratos.map((c) => {
            const expanded = expandedId === c.id;
            const pago = c.parcelas
              .filter((p) => p.status === "pago")
              .reduce((s, p) => s + Number(p.valor), 0);
            const atrasado = c.parcelas
              .filter((p) => p.status === "atrasado")
              .reduce((s, p) => s + Number(p.valor), 0);

            return (
              <div
                key={c.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {/* Cabeçalho do contrato */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color:
                          c.tipo_cobranca === "exito"
                            ? "#a78bfa"
                            : c.tipo_cobranca === "fixo"
                              ? "#4f7aff"
                              : "#2dd4a0",
                        background:
                          c.tipo_cobranca === "exito"
                            ? "#a78bfa20"
                            : c.tipo_cobranca === "fixo"
                              ? "#4f7aff20"
                              : "#2dd4a020",
                        border: `1px solid ${c.tipo_cobranca === "exito" ? "#a78bfa40" : c.tipo_cobranca === "fixo" ? "#4f7aff40" : "#2dd4a040"}`,
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {TIPO_LABEL[c.tipo_cobranca]}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                          fontFamily: "Syne, sans-serif",
                          margin: 0,
                        }}
                      >
                        {brl(c.valor_total)}
                        {c.percentual_exito && (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "400",
                              color: "var(--text-muted)",
                              marginLeft: "6px",
                            }}
                          >
                            ({c.percentual_exito}%)
                          </span>
                        )}
                      </p>
                      {c.descricao && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            fontFamily: "DM Sans, sans-serif",
                            margin: "2px 0 0",
                          }}
                        >
                          {c.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {pago > 0 && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#22c55e",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {brl(pago)} recebido
                      </span>
                    )}
                    {atrasado > 0 && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#ff5757",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {brl(atrasado)} atrasado
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContrato(c.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "4px",
                        display: "flex",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    {expanded ? (
                      <ChevronUp size={16} color="var(--text-muted)" />
                    ) : (
                      <ChevronDown size={16} color="var(--text-muted)" />
                    )}
                  </div>
                </div>

                {/* Parcelas expandidas */}
                {expanded && c.parcelas.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      padding: "12px 16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: "DM Sans, sans-serif",
                        margin: "0 0 10px",
                      }}
                    >
                      Parcelas
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {c.parcelas
                        .sort((a, b) => a.numero - b.numero)
                        .map((p) => {
                          const st = STATUS_PARCELA[p.status];
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                background: "var(--bg-surface)",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-muted)",
                                    fontFamily: "DM Sans, sans-serif",
                                    minWidth: "24px",
                                  }}
                                >
                                  #{p.numero}
                                </span>
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "var(--text-primary)",
                                    fontFamily: "DM Sans, sans-serif",
                                  }}
                                >
                                  {brl(p.valor)}
                                </span>
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--text-muted)",
                                    fontFamily: "DM Sans, sans-serif",
                                  }}
                                >
                                  vence{" "}
                                  {format(
                                    new Date(p.data_vencimento + "T12:00:00"),
                                    "dd/MM/yyyy",
                                    { locale: ptBR },
                                  )}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: st.color,
                                    background: `${st.color}20`,
                                    border: `1px solid ${st.color}40`,
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontFamily: "DM Sans, sans-serif",
                                  }}
                                >
                                  {st.icon} {st.label}
                                </span>
                                {p.status !== "pago" && (
                                  <button
                                    onClick={() => handleParcela(p.id, "pago")}
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      color: "#22c55e",
                                      background: "#22c55e10",
                                      border: "1px solid #22c55e40",
                                      borderRadius: "6px",
                                      padding: "2px 8px",
                                      cursor: "pointer",
                                      fontFamily: "DM Sans, sans-serif",
                                    }}
                                  >
                                    Baixar
                                  </button>
                                )}
                                {p.status === "pendente" && (
                                  <button
                                    onClick={() =>
                                      handleParcela(p.id, "atrasado")
                                    }
                                    style={{
                                      fontSize: "11px",
                                      color: "#ff5757",
                                      background: "#ff575710",
                                      border: "1px solid #ff575740",
                                      borderRadius: "6px",
                                      padding: "2px 8px",
                                      cursor: "pointer",
                                      fontFamily: "DM Sans, sans-serif",
                                    }}
                                  >
                                    Atrasar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {expanded && c.tipo_cobranca === "exito" && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      padding: "12px 16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        fontFamily: "DM Sans, sans-serif",
                        margin: 0,
                      }}
                    >
                      Honorário de êxito — será registrado ao ganhar a ação.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
