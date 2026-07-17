import type { AnswerConfidence } from "../review/types";

export const INITIAL_DIAGNOSTIC_POLICY = {
  minimumQuestions: 10,
  theoryBypassHitRate: 0.85,
  acceptedConfidence: ["MEDIA", "ALTA"] as readonly AnswerConfidence[]
} as const;

export interface DiagnosticPlacementAttempt {
  acertou: boolean;
  diagnosticoInicial?: boolean;
  nivelConfianca?: AnswerConfidence;
  respostaEmBranco?: boolean;
  consultouMaterial?: boolean;
}

export type DiagnosticPlacementStatus =
  | "NOT_STARTED"
  | "INSUFFICIENT_SAMPLE"
  | "THEORY_REQUIRED"
  | "THEORY_BYPASS_ELIGIBLE";

export interface DiagnosticPlacementAssessment {
  status: DiagnosticPlacementStatus;
  sampleSize: number;
  correctAnswers: number;
  hitRate: number | null;
  confidentCorrectAnswers: number;
  hasConsultation: boolean;
  hasBlankAnswer: boolean;
  hasUncertainAnswer: boolean;
  missingQuestions: number;
  rationale: string[];
}

export function assessDiagnosticPlacement(
  attempts: readonly DiagnosticPlacementAttempt[]
): DiagnosticPlacementAssessment {
  const diagnosticAttempts = attempts.filter((attempt) => attempt.diagnosticoInicial === true);
  const sampleSize = diagnosticAttempts.length;
  const correctAnswers = diagnosticAttempts.filter((attempt) => attempt.acertou).length;
  const hitRate = sampleSize > 0 ? correctAnswers / sampleSize : null;
  const hasConsultation = diagnosticAttempts.some((attempt) => attempt.consultouMaterial === true);
  const hasBlankAnswer = diagnosticAttempts.some((attempt) => attempt.respostaEmBranco === true);
  const hasUncertainAnswer = diagnosticAttempts.some(
    (attempt) =>
      attempt.acertou &&
      (!attempt.nivelConfianca || !INITIAL_DIAGNOSTIC_POLICY.acceptedConfidence.includes(attempt.nivelConfianca))
  );
  const confidentCorrectAnswers = diagnosticAttempts.filter(
    (attempt) =>
      attempt.acertou &&
      !attempt.respostaEmBranco &&
      !attempt.consultouMaterial &&
      Boolean(attempt.nivelConfianca) &&
      INITIAL_DIAGNOSTIC_POLICY.acceptedConfidence.includes(attempt.nivelConfianca!)
  ).length;
  const missingQuestions = Math.max(0, INITIAL_DIAGNOSTIC_POLICY.minimumQuestions - sampleSize);
  const rationale: string[] = [];

  if (sampleSize === 0) {
    return {
      status: "NOT_STARTED",
      sampleSize,
      correctAnswers,
      hitRate,
      confidentCorrectAnswers,
      hasConsultation,
      hasBlankAnswer,
      hasUncertainAnswer,
      missingQuestions: INITIAL_DIAGNOSTIC_POLICY.minimumQuestions,
      rationale: ["Nenhuma questão foi registrada como diagnóstico inicial."]
    };
  }

  if (sampleSize < INITIAL_DIAGNOSTIC_POLICY.minimumQuestions) {
    rationale.push(`Amostra incompleta: faltam ${missingQuestions} questão(ões) para a decisão.`);
    return {
      status: "INSUFFICIENT_SAMPLE",
      sampleSize,
      correctAnswers,
      hitRate,
      confidentCorrectAnswers,
      hasConsultation,
      hasBlankAnswer,
      hasUncertainAnswer,
      missingQuestions,
      rationale
    };
  }

  if (hasConsultation) rationale.push("Houve consulta a material, solução ou gabarito durante o diagnóstico.");
  if (hasBlankAnswer) rationale.push("Houve questão deixada em branco.");
  if (hasUncertainAnswer) rationale.push("Existe resposta sem confiança média/alta explicitamente declarada.");
  if ((hitRate ?? 0) < INITIAL_DIAGNOSTIC_POLICY.theoryBypassHitRate) {
    rationale.push(`A taxa de acerto ficou abaixo de ${INITIAL_DIAGNOSTIC_POLICY.theoryBypassHitRate * 100}%.`);
  }

  const bypassEligible =
    (hitRate ?? 0) >= INITIAL_DIAGNOSTIC_POLICY.theoryBypassHitRate &&
    !hasConsultation &&
    !hasBlankAnswer &&
    !hasUncertainAnswer;

  if (!bypassEligible) {
    return {
      status: "THEORY_REQUIRED",
      sampleSize,
      correctAnswers,
      hitRate,
      confidentCorrectAnswers,
      hasConsultation,
      hasBlankAnswer,
      hasUncertainAnswer,
      missingQuestions: 0,
      rationale
    };
  }

  return {
    status: "THEORY_BYPASS_ELIGIBLE",
    sampleSize,
    correctAnswers,
    hitRate,
    confidentCorrectAnswers,
    hasConsultation,
    hasBlankAnswer,
    hasUncertainAnswer,
    missingQuestions: 0,
    rationale: [
      `Conhecimento prévio demonstrado provisoriamente em ${sampleSize} questões, sem consulta e com confiança média/alta.`
    ]
  };
}
