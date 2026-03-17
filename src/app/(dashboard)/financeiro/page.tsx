"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface Resumo {
  total_contratado: number;
  total_recebido: number;
  total_pendente: number;
  total_atrasado: number;
  recebido_mes: number;
  previsto_mes: number;
  contratos_ativos: number;
  parcelas_atrasadas: number;
}

interface Contrato {
  id: string;
  tipo_cobranca: "exito" | "fixo" | "misto";
  valor_total: number;
  percentual_exito: number | null;
  descricao: string | null;
  status: string;
  data_inicio: string;
  lead: { id: string; nome: string; cpf: string; status: string } | null;
  parcelas: {
    id: string;
    numero: number;
    valor: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: string;
  }[];
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

const TIPO_COLOR: Record<string, string> = {
  exito: "#a78bfa",
  fixo: "#4f7aff",
  misto: "#2dd4a0",
};

function KPI({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span style={{ color: color ?? "var(--accent)" }}>{icon}</span>
        <p
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
          {label}
        </p>
      </div>
      <p
        style={{
          fontSize: "26px",
          fontWeight: "700",
          color: color ?? "var(--text-primary)",
          fontFamily: "Syne, sans-serif",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "DM Sans, sans-serif",
            margin: "6px 0 0",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export default function FinanceiroPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "pendente" | "atrasado">(
    "todos",
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/financeiro/resumo").then((r) => r.json()),
      fetch("/api/financeiro/contratos").then((r) => r.json()),
    ]).then(([r, c]) => {
      setResumo(r);
      setContratos(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  const parcelasVisiveis = contratos
    .flatMap((c) =>
      c.parcelas
        .filter((p) => {
          if (filtro === "pendente") return p.status === "pendente";
          if (filtro === "atrasado") return p.status === "atrasado";
          return p.status !== "pago";
        })
        .map((p) => ({ ...p, contrato: c })),
    )
    .sort(
      (a, b) =>
        new Date(a.data_vencimento).getTime() -
        new Date(b.data_vencimento).getTime(),
    );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }}>
      {/* Título */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "var(--text-primary)",
            fontFamily: "Syne, sans-serif",
            margin: "0 0 6px",
          }}
        >
          Financeiro
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            fontFamily: "DM Sans, sans-serif",
            margin: 0,
          }}
        >
          Contratos de honorários e parcelas
        </p>
      </div>

      {/* KPIs */}
      {resumo && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
            marginBottom: "28px",
          }}
        >
          <KPI
            icon={<DollarSign size={14} />}
            label="Total contratado"
            value={brl(resumo.total_contratado)}
            sub={`${resumo.contratos_ativos} contrato${resumo.contratos_ativos !== 1 ? "s" : ""} ativo${resumo.contratos_ativos !== 1 ? "s" : ""}`}
          />
          <KPI
            icon={<CheckCircle size={14} />}
            label="Já recebido"
            value={brl(resumo.total_recebido)}
            color="#22c55e"
          />
          <KPI
            icon={<TrendingUp size={14} />}
            label="Este mês"
            value={brl(resumo.recebido_mes)}
            sub={`${brl(resumo.previsto_mes)} previsto`}
            color="#4f7aff"
          />
          <KPI
            icon={<AlertCircle size={14} />}
            label="Em atraso"
            value={brl(resumo.total_atrasado)}
            sub={
              resumo.parcelas_atrasadas > 0
                ? `${resumo.parcelas_atrasadas} parcela${resumo.parcelas_atrasadas !== 1 ? "s" : ""}`
                : undefined
            }
            color={resumo.total_atrasado > 0 ? "#ff5757" : "var(--text-muted)"}
          />
        </div>
      )}

      {/* Parcelas abertas */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={14} color="var(--accent)" />
            <h2
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
              Parcelas a receber
            </h2>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["todos", "pendente", "atrasado"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: filtro === f ? "#fff" : "var(--text-muted)",
                  background: filtro === f ? "var(--accent)" : "transparent",
                  border: `1px solid ${filtro === f ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "6px",
                  padding: "3px 10px",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  textTransform: "capitalize",
                }}
              >
                {f === "todos"
                  ? "Todos"
                  : f === "pendente"
                    ? "Pendentes"
                    : "Atrasadas"}
              </button>
            ))}
          </div>
        </div>

        {parcelasVisiveis.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
              fontFamily: "DM Sans, sans-serif",
              padding: "20px 0",
            }}
          >
            Nenhuma parcela em aberto.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {parcelasVisiveis.map((p) => {
              const isAtrasada = p.status === "atrasado";
              const vencimento = new Date(p.data_vencimento + "T12:00:00");
              const hoje = new Date();
              const diasRestantes = Math.ceil(
                (vencimento.getTime() - hoje.getTime()) / 86400000,
              );

              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: isAtrasada ? "#ff575708" : "var(--bg-card)",
                    border: `1px solid ${isAtrasada ? "#ff575730" : "var(--border)"}`,
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                          fontFamily: "DM Sans, sans-serif",
                          margin: 0,
                        }}
                      >
                        {p.contrato.lead?.nome ?? "—"}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          fontFamily: "DM Sans, sans-serif",
                          margin: "2px 0 0",
                        }}
                      >
                        Parcela #{p.numero} ·{" "}
                        <span
                          style={{
                            color: TIPO_COLOR[p.contrato.tipo_cobranca],
                          }}
                        >
                          {TIPO_LABEL[p.contrato.tipo_cobranca]}
                        </span>
                        {p.contrato.descricao && ` · ${p.contrato.descricao}`}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: isAtrasada ? "#ff5757" : "var(--text-primary)",
                          fontFamily: "Syne, sans-serif",
                          margin: 0,
                        }}
                      >
                        {brl(p.valor)}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: isAtrasada
                            ? "#ff5757"
                            : diasRestantes <= 7
                              ? "#f5c842"
                              : "var(--text-muted)",
                          fontFamily: "DM Sans, sans-serif",
                          margin: "2px 0 0",
                        }}
                      >
                        {isAtrasada
                          ? `${Math.abs(diasRestantes)}d em atraso`
                          : diasRestantes === 0
                            ? "Vence hoje"
                            : diasRestantes > 0
                              ? `${diasRestantes}d restantes`
                              : `${Math.abs(diasRestantes)}d em atraso`}
                      </p>
                    </div>
                    {p.contrato.lead && (
                      <Link
                        href={`/leads/${p.contrato.lead.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Todos os contratos */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <DollarSign size={14} color="var(--accent)" />
          <h2
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
            Todos os contratos ({contratos.length})
          </h2>
        </div>

        {contratos.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
              fontFamily: "DM Sans, sans-serif",
              padding: "20px 0",
            }}
          >
            Nenhum contrato. Abra um lead e clique em &quot;Novo contrato&quot;.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {contratos.map((c) => {
              const parcPagas = c.parcelas.filter(
                (p) => p.status === "pago",
              ).length;
              const totalParc = c.parcelas.length;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--text-primary)",
                        fontFamily: "DM Sans, sans-serif",
                        margin: 0,
                      }}
                    >
                      {c.lead?.nome ?? "Lead removido"}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        fontFamily: "DM Sans, sans-serif",
                        margin: "2px 0 0",
                      }}
                    >
                      <span style={{ color: TIPO_COLOR[c.tipo_cobranca] }}>
                        {TIPO_LABEL[c.tipo_cobranca]}
                      </span>
                      {c.percentual_exito && ` · ${c.percentual_exito}%`}
                      {c.descricao && ` · ${c.descricao}`}
                      {totalParc > 0 &&
                        ` · ${parcPagas}/${totalParc} parcelas pagas`}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "var(--text-primary)",
                        fontFamily: "Syne, sans-serif",
                        margin: 0,
                      }}
                    >
                      {brl(c.valor_total)}
                    </p>
                    {c.lead && (
                      <Link
                        href={`/leads/${c.lead.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
