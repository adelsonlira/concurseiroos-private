import q14ModelagemDimensional from "./assets/q14-modelagem-dimensional.png";
import q185AlternativaA from "./assets/q185-alternativa-a.png";
import q185AlternativaB from "./assets/q185-alternativa-b.png";
import q185AlternativaC from "./assets/q185-alternativa-c.png";
import q185AlternativaD from "./assets/q185-alternativa-d.png";
import q185AlternativaE from "./assets/q185-alternativa-e.png";

export const PILOT_DIAGNOSTIC_ASSET_URLS = {
  "assets/q14-modelagem-dimensional.png": q14ModelagemDimensional,
  "assets/q185-alternativa-a.png": q185AlternativaA,
  "assets/q185-alternativa-b.png": q185AlternativaB,
  "assets/q185-alternativa-c.png": q185AlternativaC,
  "assets/q185-alternativa-d.png": q185AlternativaD,
  "assets/q185-alternativa-e.png": q185AlternativaE,
} as const;

export type PilotDiagnosticAssetKey = keyof typeof PILOT_DIAGNOSTIC_ASSET_URLS;

export function resolvePilotDiagnosticAsset(assetKey: string): string | null {
  return PILOT_DIAGNOSTIC_ASSET_URLS[assetKey as PilotDiagnosticAssetKey] ?? null;
}
