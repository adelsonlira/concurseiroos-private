import type { LogHistoricoAtividade } from "../../types";
import type { ExternalEvidenceSource } from "../externalEvidence/types";
import type { OptionalStudyRecommendationOption, OptionalStudyResultInput, OptionalStudyResultKind } from "./types";

export function deriveOptionalQuestionSourceAndBoard(
  option: OptionalStudyRecommendationOption,
  result: OptionalStudyResultInput,
): { source: ExternalEvidenceSource; examiningBoard?: string } {
  const source: ExternalEvidenceSource = result.source
    ?? (option.environment === "treino_fgv" ? "treino_fgv" : option.environment === "qconcursos" ? "qconcursos" : result.kind === "simulation" ? "simulado_externo" : "outra");
  const informedBoard = result.examiningBoard?.trim() || undefined;
  if (source === "treino_fgv") return { source, examiningBoard: "FGV" };
  if (option.method === "fgv_questions" && source === "qconcursos") {
    return { source, examiningBoard: informedBoard ?? "FGV" };
  }
  return { source, examiningBoard: informedBoard };
}

export function optionalResultHistoryType(kind: OptionalStudyResultKind): LogHistoricoAtividade["tipoAtividade"] {
  switch (kind) {
    case "questions": return "RESOLUCAO_QUESTAO";
    case "review": return "REVISAO_PROGRAMADA";
    case "simulation": return "SIMULADO";
    case "technical_practice": return "PRATICA_TECNICA";
    case "organization": return "ATIVIDADE_OPERACIONAL";
    case "theory": return "ESTUDO_TEORIA";
  }
}

export function optionalMethodHistoryType(option: OptionalStudyRecommendationOption): LogHistoricoAtividade["tipoAtividade"] {
  if (["fgv_questions", "short_question_batch", "timed_question_batch"].includes(option.method)) return "RESOLUCAO_QUESTAO";
  if (["review_due", "error_review", "active_recall", "flashcards"].includes(option.method)) return "REVISAO_PROGRAMADA";
  if (option.method === "mini_simulation") return "SIMULADO";
  if (option.method === "technical_practice") return "PRATICA_TECNICA";
  if (option.method === "light_organization") return "ATIVIDADE_OPERACIONAL";
  return "ESTUDO_TEORIA";
}

export function optionalResultSummary(result: OptionalStudyResultInput): string {
  if (result.kind === "questions" || result.kind === "simulation") {
    return `${result.correctAnswers ?? 0}/${result.totalQuestions ?? 0} acertos; ${result.blankAnswers ?? 0} em branco`;
  }
  if (result.kind === "review") return `desempenho ${result.reviewPerformance ?? "não informado"}`;
  if (result.kind === "technical_practice") return result.taskCompleted ? "tarefa concluída" : "tarefa não concluída";
  if (result.kind === "organization") return "atividade operacional registrada";
  return result.activeRecallPerformed ? "teoria com recuperação ativa" : "teoria registrada sem inferência de domínio";
}

export function validateOptionalStudyResult(result: OptionalStudyResultInput): string | null {
  if (!Number.isFinite(result.actualMinutes) || result.actualMinutes <= 0) return "O tempo real deve ser positivo.";
  if (result.kind === "questions" || result.kind === "simulation") {
    if (!result.source) return "Informe a plataforma ou origem das questões.";
    const total = result.totalQuestions ?? 0;
    const values = [result.correctAnswers ?? 0, result.wrongAnswers ?? 0, result.blankAnswers ?? 0];
    if (!Number.isInteger(total) || total <= 0 || values.some((value) => !Number.isInteger(value) || value < 0) || values.reduce((sum, value) => sum + value, 0) !== total) {
      return "Acertos, erros e brancos devem ser inteiros não negativos e somar o total realizado.";
    }
  }
  if (result.kind === "technical_practice" && !result.technicalTask?.trim()) return "Informe a tarefa técnica realizada.";
  if (result.kind === "organization" && !result.operationalAction?.trim()) return "Informe a ação operacional realizada.";
  return null;
}
