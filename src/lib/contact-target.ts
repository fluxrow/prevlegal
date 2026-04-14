export const CONTACT_TARGET_OPTIONS = [
  { value: "", label: "Todos os contatos" },
  { value: "titular", label: "Somente titular" },
  { value: "conjuge", label: "Somente cônjuge" },
  { value: "filho", label: "Somente filho" },
  { value: "irmao", label: "Somente irmão" },
] as const

export type ContactTargetType = "titular" | "conjuge" | "filho" | "irmao" | "outro"

export function inferContactTargetType(source: string | null | undefined): ContactTargetType {
  const normalized = String(source || "").trim().toUpperCase()
  if (!normalized) return "titular"
  if (normalized.startsWith("CONJUGE")) return "conjuge"
  if (normalized.startsWith("FILHO")) return "filho"
  if (normalized.startsWith("IRMAO")) return "irmao"
  if (
    normalized.startsWith("CELULAR") ||
    normalized.startsWith("WHATSAPP") ||
    normalized.startsWith("TELEFONE") ||
    normalized.includes("WHATSAPP")
  ) {
    return "titular"
  }
  return "outro"
}

export function getContactTargetLabel(value: string | null | undefined) {
  switch (value) {
    case "titular":
      return "Titular"
    case "conjuge":
      return "Cônjuge"
    case "filho":
      return "Filho"
    case "irmao":
      return "Irmão"
    case "outro":
      return "Outro"
    default:
      return "—"
  }
}
