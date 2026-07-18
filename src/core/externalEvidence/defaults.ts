import type {
  ExternalEvidenceConfidence,
  ExternalEvidenceConsultation,
  ExternalEvidenceSource,
} from "./types";

export const EXTERNAL_EVIDENCE_FORM_DEFAULTS: Readonly<{
  source: ExternalEvidenceSource;
  examiningBoard: string;
  consultedMaterial: ExternalEvidenceConsultation;
  perceivedConfidence: ExternalEvidenceConfidence;
}> = {
  source: "qconcursos",
  examiningBoard: "FGV",
  consultedMaterial: "no",
  perceivedConfidence: "not_informed",
};

export interface ExternalEvidencePrefillContext {
  prescriptionId?: string;
  sessionId?: string;
  disciplineId?: string;
  topicId?: string;
  subtopicId?: string;
  sourceReference?: string;
  plannedQuestions?: number;
}

export function buildExternalEvidencePrefill(
  context: ExternalEvidencePrefillContext,
): ExternalEvidencePrefillContext {
  return {
    prescriptionId: context.prescriptionId,
    sessionId: context.sessionId,
    disciplineId: context.disciplineId,
    topicId: context.topicId,
    subtopicId: context.subtopicId,
    sourceReference: context.sourceReference,
    plannedQuestions: context.plannedQuestions,
  };
}
