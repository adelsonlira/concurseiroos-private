export const EXTERNAL_EVIDENCE_ROUTE = "#/registrar-resultado";
export const EXTERNAL_EVIDENCE_ROUTE_ALIASES = [
  "#/registrar-questoes",
  "#/questoes",
  "#/exercises",
] as const;

export function isExternalEvidenceHash(hash: string): boolean {
  return hash === EXTERNAL_EVIDENCE_ROUTE || EXTERNAL_EVIDENCE_ROUTE_ALIASES.includes(hash as typeof EXTERNAL_EVIDENCE_ROUTE_ALIASES[number]);
}
