import type { DailyStudyPrescription, ExecutableStudyPrescription } from "./types";

export interface PrescriptionAuditIssue {
  code: string;
  message: string;
  prescriptionId?: string;
}

export interface PrescriptionAuditResult {
  valid: boolean;
  issues: PrescriptionAuditIssue[];
}

function auditExecutable(prescription: ExecutableStudyPrescription): PrescriptionAuditIssue[] {
  const issues: PrescriptionAuditIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message, prescriptionId: prescription.id });
  if (!Number.isInteger(prescription.durationMinutes) || prescription.durationMinutes <= 0) {
    add("INVALID_DURATION", "A duração deve ser um inteiro positivo.");
  }
  const stepMinutes = prescription.executionSteps.reduce((sum, step) => sum + step.tempoMinutos, 0);
  if (stepMinutes !== prescription.durationMinutes) {
    add("STEP_DURATION_MISMATCH", `Os passos somam ${stepMinutes} minutos, mas a sessão possui ${prescription.durationMinutes}.`);
  }
  if (prescription.objectives.length === 0) add("MISSING_OBJECTIVE", "A sessão precisa de objetivo executável.");
  if (prescription.completionEvidence.length === 0) add("MISSING_COMPLETION_EVIDENCE", "A sessão precisa informar o que registrar.");
  if (!prescription.nextAction.afterCompletion.trim()) add("MISSING_NEXT_ACTION", "A sessão precisa informar a ação após a conclusão.");
  if (prescription.executionReadiness.status === "READY" && prescription.executionReadiness.requiredResource !== "NONE") {
    add("READINESS_CONTRADICTION", "Uma sessão READY não pode declarar recurso obrigatório ausente.");
  }
  if (prescription.executionGate.executionStatus !== "READY" || !prescription.executionPacket) {
    add("MISSING_EXECUTION_PACKET", "Uma prescrição apresentada como executável precisa de pacote operacional completo.");
  } else {
    const packet = prescription.executionPacket;
    if (!packet.contentScope.trim()) add("MISSING_CONTENT_SCOPE", "O pacote precisa informar o conteúdo exato.");
    if (!packet.completionCriterion.trim()) add("MISSING_PACKET_CRITERION", "O pacote precisa informar o critério de conclusão.");
    if (!packet.prompt.trim()) add("MISSING_OPERATIONAL_PROMPT", "O pacote precisa informar a instrução operacional.");
    if (packet.resultCapture.fields.length === 0) add("MISSING_RESULT_CAPTURE", "O pacote precisa informar o que registrar.");
  }
  if (prescription.activity === "questoes") {
    if (!prescription.questionPractice) add("MISSING_QUESTION_TARGET", "Sessão de questões sem alvo calculado.");
    if ((prescription.questionPractice?.targetQuestions ?? 0) <= 0) add("INVALID_QUESTION_TARGET", "O alvo de questões deve ser positivo.");
  }
  if (!prescription.decisionReliability.historicalIncidenceUsed &&
      prescription.decisionReliability.caveats.every((caveat) => !/shadow mode/i.test(caveat))) {
    add("MISSING_SHADOW_MODE_CAVEAT", "A ausência de incidência histórica deve ser explicitada.");
  }
  return issues;
}

export function auditDailyStudyPrescription(daily: DailyStudyPrescription): PrescriptionAuditResult {
  const issues: PrescriptionAuditIssue[] = [];
  if (daily.status === "NO_EXECUTABLE_SESSION") {
    if (daily.current !== null || daily.upcoming.length > 0) {
      issues.push({ code: "NO_SESSION_CONTRADICTION", message: "Status sem sessão contém prescrições executáveis." });
    }
    return { valid: issues.length === 0, issues };
  }
  if (!daily.current) {
    issues.push({ code: "READY_WITHOUT_CURRENT", message: "Status READY exige uma prescrição atual." });
    return { valid: false, issues };
  }
  const all = [daily.current, ...daily.upcoming];
  all.forEach((prescription) => issues.push(...auditExecutable(prescription)));
  all.forEach((prescription, index) => {
    const expected = all[index + 1];
    if (expected && !prescription.nextAction.preview) {
      issues.push({ code: "MISSING_NEXT_PREVIEW", message: "A próxima sessão conhecida deve ser antecipada.", prescriptionId: prescription.id });
    }
  });
  return { valid: issues.length === 0, issues };
}
