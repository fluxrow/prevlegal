export type OperationProfile =
  | "beneficios_previdenciarios"
  | "planejamento_previdenciario";

export const DEFAULT_OPERATION_PROFILE: OperationProfile =
  "beneficios_previdenciarios";

export const OPERATION_PROFILE_OPTIONS: Array<{
  value: OperationProfile;
  label: string;
  shortLabel: string;
}> = [
  {
    value: "beneficios_previdenciarios",
    label: "Captação de Benefícios Previdenciários",
    shortLabel: "Benefícios Previdenciários",
  },
  {
    value: "planejamento_previdenciario",
    label: "Captação de Planejamento Previdenciário",
    shortLabel: "Planejamento Previdenciário",
  },
];

export function normalizeOperationProfile(
  value: string | null | undefined,
): OperationProfile {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "planejamento_previdenciario" ||
    normalized === "ana_planejamento"
  ) {
    return "planejamento_previdenciario";
  }

  return "beneficios_previdenciarios";
}

export function getOperationProfileLabel(
  value: string | null | undefined,
): string {
  const normalized = normalizeOperationProfile(value);
  return (
    OPERATION_PROFILE_OPTIONS.find((option) => option.value === normalized)
      ?.shortLabel || "Benefícios Previdenciários"
  );
}
