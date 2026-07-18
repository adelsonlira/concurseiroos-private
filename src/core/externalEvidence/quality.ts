import type {
  ExternalEvidenceInput,
  ExternalEvidenceQuality,
} from "./types";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateExternalEvidenceQuality(
  input: ExternalEvidenceInput,
): ExternalEvidenceQuality {
  const total = Math.max(0, input.totalQuestions ?? input.actualQuestions ?? 0);

  let authorityScore = 1;
  if (input.source === "qconcursos" || input.source === "treino_fgv") authorityScore = 2;
  if (input.source === "simulado_externo") authorityScore = 2;
  if (input.source === "notebooklm") authorityScore = 0;
  if (input.examiningBoard?.trim().toLocaleUpperCase("pt-BR") === "FGV") authorityScore += 1;
  if (input.prescriptionId || input.sessionId) authorityScore += 0.5;

  const authority = authorityScore >= 2.5 ? "high" : authorityScore >= 1.5 ? "medium" : "low";

  let strengthScore = 0;
  const hasObjectiveResult =
    Number.isInteger(input.totalQuestions) &&
    Number.isInteger(input.correctAnswers) &&
    Number.isInteger(input.wrongAnswers) &&
    Number.isInteger(input.blankAnswers);

  if (hasObjectiveResult) strengthScore += 1;
  if (input.granularity === "individual") strengthScore += 1;
  if (total >= 20) strengthScore += 2;
  else if (total >= 10) strengthScore += 1;
  else if (total >= 5) strengthScore += 0.5;
  if (input.consultedMaterial === "occasionally") strengthScore -= 0.75;
  if (input.consultedMaterial === "yes") strengthScore -= 1.5;
  if (input.source === "notebooklm") strengthScore -= 3;

  const measurementStrength =
    strengthScore >= 3 ? "high" : strengthScore >= 1.5 ? "medium" : "low";

  const consultationFactor =
    input.consultedMaterial === "no" || input.consultedMaterial === "not_applicable"
      ? 1
      : input.consultedMaterial === "occasionally"
        ? 0.7
        : 0.4;
  const sourceFactor = input.source === "notebooklm" ? 0.25 : 1;
  const effectiveSampleSize = Math.round(clamp(total * consultationFactor * sourceFactor, 0, total) * 10) / 10;

  return { authority, measurementStrength, effectiveSampleSize };
}
