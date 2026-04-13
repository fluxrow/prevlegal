import AgentesConfig from "@/components/agentes-config";
import { Bot, Sparkles, Route, ShieldCheck } from "lucide-react";

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            background: "var(--accent-glow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        {text}
      </p>
    </div>
  );
}

export default function AgentePage() {
  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1180px",
        display: "grid",
        gap: "24px",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "28px",
            fontWeight: "700",
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            margin: "0 0 6px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Bot size={24} color="var(--accent)" /> Agentes IA
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Esta agora é a superfície canônica de multiagentes do escritório.
          Aqui você cria personas distintas para triagem, reativação,
          confirmação, documentos e fechamento, e também pode começar por um
          modelo pronto mais alinhado ao tipo de operação do escritório.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "14px",
        }}
      >
        <InfoCard
          icon={<Sparkles size={16} />}
          title="Templates operacionais"
          text="Use os modelos PrevLegal para subir a base inicial do escritório com poucos cliques. Agora existem dois kits canônicos: um para benefícios previdenciários e outro para planejamento previdenciário."
        />
        <InfoCard
          icon={<Route size={16} />}
          title="Roteamento real"
          text="Os agentes já podem ser usados por campanha, por estágio e em automações. O papel de fechamento entra nesta rodada pelo tipo follow-up comercial."
        />
        <InfoCard
          icon={<ShieldCheck size={16} />}
          title="Fallback legado preservado"
          text="Se um tenant ainda não tiver agentes configurados, o responder continua com fallback para a configuração global anterior, sem quebrar a operação."
        />
      </div>

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <AgentesConfig />
      </div>
    </div>
  );
}
