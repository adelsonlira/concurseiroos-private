import type {
  PrivateMaterialProvider,
  PrivateMaterialSourceRole
} from "./types";

export function privateMaterialProviderLabel(provider: PrivateMaterialProvider): string {
  switch (provider) {
    case "ESTRATEGIA_CONCURSOS":
      return "Estratégia Concursos";
    case "TI_TOTAL":
      return "TI Total";
    default:
      return "Material privado";
  }
}

export function privateMaterialSourceRoleLabel(role: PrivateMaterialSourceRole): string {
  return role === "PRIMARY" ? "Fonte principal" : "Fonte complementar";
}
