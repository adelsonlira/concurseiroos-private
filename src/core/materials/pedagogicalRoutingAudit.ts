import type { CanonicalSyllabusTaxonomy } from "../taxonomy/types";
import type { ExternalQuestionBankDefinition } from "../questions/externalQuestionBanks";
import { routePrivateStudyMaterial } from "./materialPolicy";
import type { MaterialLocatorRecommendation, PrivateStudyMaterial } from "./types";

export type TheoryRoutingStatus =
  | "EXACT_LOCAL"
  | "TOPIC_FALLBACK"
  | "MANUAL_LOCATOR_REQUIRED";

export type DiagnosticRoutingStatus =
  | "EXACT_LOCAL_QUESTION_SET"
  | "TOPIC_LOCAL_QUESTION_SET"
  | "EXTERNAL_BANK_REQUIRED"
  | "NO_EXECUTABLE_SOURCE";

export interface PedagogicalRoutingRecord {
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  theoryStatus: TheoryRoutingStatus;
  theoryMaterial: MaterialLocatorRecommendation | null;
  diagnosticStatus: DiagnosticRoutingStatus;
  diagnosticMaterial: MaterialLocatorRecommendation | null;
  externalQuestionBanks: string[];
  requiresManualTheoryLocator: boolean;
}

export interface PedagogicalRoutingAuditReport {
  schemaVersion: "1.0.0";
  competitionId: string;
  generatedAt: string;
  status: "PASS" | "FAIL";
  counts: {
    subtopics: number;
    exactTheory: number;
    topicTheoryFallback: number;
    manualTheoryLocatorRequired: number;
    exactDiagnosticQuestionSet: number;
    topicDiagnosticQuestionSet: number;
    externalDiagnosticFallback: number;
    noExecutableDiagnosticSource: number;
    unsafeSiblingRoutes: number;
  };
  records: PedagogicalRoutingRecord[];
  errors: string[];
  policy: {
    siblingSubtopicFallbackForbidden: true;
    topicFallbackMustBeExplicit: true;
    diagnosticNeverUsesCommentedQuestionsOrTheoryAsFirstAttempt: true;
    materialsDoNotChangeStrategicPriority: true;
  };
}

function namesById(taxonomy: CanonicalSyllabusTaxonomy): Map<string, string> {
  return new Map(taxonomy.nodes.map((node) => [node.id, node.name] as const));
}

function classifyTheory(material: MaterialLocatorRecommendation | null): TheoryRoutingStatus {
  if (!material) return "MANUAL_LOCATOR_REQUIRED";
  return material.matchScope === "EXACT_SUBTOPIC" ? "EXACT_LOCAL" : "TOPIC_FALLBACK";
}

function classifyDiagnostic(
  material: MaterialLocatorRecommendation | null,
  enabledBanks: readonly ExternalQuestionBankDefinition[]
): DiagnosticRoutingStatus {
  if (material?.matchScope === "EXACT_SUBTOPIC") return "EXACT_LOCAL_QUESTION_SET";
  if (material?.matchScope === "TOPIC_FALLBACK") return "TOPIC_LOCAL_QUESTION_SET";
  return enabledBanks.length > 0 ? "EXTERNAL_BANK_REQUIRED" : "NO_EXECUTABLE_SOURCE";
}

export function auditPedagogicalRouting(params: {
  taxonomy: CanonicalSyllabusTaxonomy;
  materials: readonly PrivateStudyMaterial[];
  externalQuestionBanks: readonly ExternalQuestionBankDefinition[];
  generatedAt: string;
}): PedagogicalRoutingAuditReport {
  const nameById = namesById(params.taxonomy);
  const nodeById = new Map(params.taxonomy.nodes.map((node) => [node.id, node] as const));
  const enabledBanks = params.externalQuestionBanks.filter((bank) => bank.enabled);
  const errors: string[] = [];
  let unsafeSiblingRoutes = 0;

  const records = params.taxonomy.nodes
    .filter((node) => node.kind === "SUBTOPIC")
    .map((subtopic): PedagogicalRoutingRecord => {
      const topic = subtopic.parentId ? nodeById.get(subtopic.parentId) : undefined;
      const discipline = topic?.parentId ? nodeById.get(topic.parentId) : undefined;
      if (!topic || !discipline) {
        errors.push(`Taxonomia incompleta para ${subtopic.id}.`);
      }

      const theoryMaterial = topic && discipline
        ? routePrivateStudyMaterial(params.materials, {
            concursoId: params.taxonomy.competitionId,
            activity: "teoria",
            disciplineId: discipline.id,
            topicId: topic.id,
            subtopicId: subtopic.id
          })
        : null;
      const diagnosticMaterial = topic && discipline
        ? routePrivateStudyMaterial(params.materials, {
            concursoId: params.taxonomy.competitionId,
            activity: "questoes",
            diagnosticPurpose: true,
            disciplineId: discipline.id,
            topicId: topic.id,
            subtopicId: subtopic.id
          })
        : null;

      for (const material of [theoryMaterial, diagnosticMaterial]) {
        if (
          material?.matchScope === "TOPIC_FALLBACK" &&
          material.mappingStatus !== "TOPIC_ONLY"
        ) {
          unsafeSiblingRoutes += 1;
          errors.push(`Fallback não explícito detectado em ${subtopic.id}: ${material.materialId}.`);
        }
      }

      const theoryStatus = classifyTheory(theoryMaterial);
      const diagnosticStatus = classifyDiagnostic(diagnosticMaterial, enabledBanks);
      return {
        disciplineId: discipline?.id ?? "UNKNOWN",
        disciplineName: discipline ? nameById.get(discipline.id) ?? discipline.id : "Desconhecida",
        topicId: topic?.id ?? "UNKNOWN",
        topicName: topic ? nameById.get(topic.id) ?? topic.id : "Desconhecido",
        subtopicId: subtopic.id,
        subtopicName: subtopic.name,
        theoryStatus,
        theoryMaterial,
        diagnosticStatus,
        diagnosticMaterial,
        externalQuestionBanks: enabledBanks.map((bank) => bank.displayName),
        requiresManualTheoryLocator: theoryStatus === "MANUAL_LOCATOR_REQUIRED"
      };
    });

  const counts = {
    subtopics: records.length,
    exactTheory: records.filter((record) => record.theoryStatus === "EXACT_LOCAL").length,
    topicTheoryFallback: records.filter((record) => record.theoryStatus === "TOPIC_FALLBACK").length,
    manualTheoryLocatorRequired: records.filter((record) => record.theoryStatus === "MANUAL_LOCATOR_REQUIRED").length,
    exactDiagnosticQuestionSet: records.filter((record) => record.diagnosticStatus === "EXACT_LOCAL_QUESTION_SET").length,
    topicDiagnosticQuestionSet: records.filter((record) => record.diagnosticStatus === "TOPIC_LOCAL_QUESTION_SET").length,
    externalDiagnosticFallback: records.filter((record) => record.diagnosticStatus === "EXTERNAL_BANK_REQUIRED").length,
    noExecutableDiagnosticSource: records.filter((record) => record.diagnosticStatus === "NO_EXECUTABLE_SOURCE").length,
    unsafeSiblingRoutes
  };

  if (counts.noExecutableDiagnosticSource > 0) {
    errors.push(`${counts.noExecutableDiagnosticSource} subassunto(s) sem fonte diagnóstica executável.`);
  }

  return {
    schemaVersion: "1.0.0",
    competitionId: params.taxonomy.competitionId,
    generatedAt: params.generatedAt,
    status: errors.length === 0 ? "PASS" : "FAIL",
    counts,
    records,
    errors,
    policy: {
      siblingSubtopicFallbackForbidden: true,
      topicFallbackMustBeExplicit: true,
      diagnosticNeverUsesCommentedQuestionsOrTheoryAsFirstAttempt: true,
      materialsDoNotChangeStrategicPriority: true
    }
  };
}
