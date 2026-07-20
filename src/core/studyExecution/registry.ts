import registryJson from "../../../data/study-execution/study-execution-registry-v1.json";
import type {
  StudyExecutionDisciplineCapability,
  StudyExecutionFgvEvidenceStatus,
  StudyExecutionFgvStyleTeaching,
  StudyExecutionNotebookStatus,
  StudyExecutionRegistry,
  StudyExecutionTopicCapability,
} from "./types";

export const studyExecutionRegistry = registryJson as StudyExecutionRegistry;

export interface ResolvedStudyExecutionCapability {
  discipline: StudyExecutionDisciplineCapability | null;
  topic: StudyExecutionTopicCapability | null;
  notebookStatus: StudyExecutionNotebookStatus;
  notebookName: string | null;
  notebookUrl: string | null;
  fgvEvidenceStatus: StudyExecutionFgvEvidenceStatus;
  fgvStyleTeaching: StudyExecutionFgvStyleTeaching;
  approvedSources: StudyExecutionTopicCapability["approvedSources"];
  sourcesToDisableByDefault: string[];
  notebookConfiguration: StudyExecutionTopicCapability["notebookConfiguration"] | null;
  environments: StudyExecutionTopicCapability["environments"];
  coverageStatus: "FULL" | "PARTIAL";
  limitations: string[];
}

export function resolveStudyExecutionCapability(
  disciplineId: string,
  topicId: string,
  registry: StudyExecutionRegistry = studyExecutionRegistry,
): ResolvedStudyExecutionCapability {
  const discipline = registry.disciplines.find((item) => item.disciplineId === disciplineId) ?? null;
  const topic = discipline?.topicOverrides.find((item) => item.topicId === topicId) ?? null;
  return {
    discipline,
    topic,
    notebookStatus: topic?.notebookStatus ?? discipline?.notebookStatus ?? registry.defaultNotebookStatus,
    notebookName: topic?.notebookName ?? discipline?.notebookName ?? null,
    notebookUrl: topic?.notebookUrl ?? discipline?.notebookUrl ?? null,
    fgvEvidenceStatus: topic?.fgvEvidenceStatus ?? discipline?.fgvEvidenceStatus ?? "NOT_AVAILABLE",
    fgvStyleTeaching: topic?.fgvStyleTeaching ?? discipline?.fgvStyleTeaching ?? "DISABLED",
    approvedSources: topic?.approvedSources ?? discipline?.approvedSources ?? [],
    sourcesToDisableByDefault: topic?.sourcesToDisableByDefault ?? [],
    notebookConfiguration: topic?.notebookConfiguration ?? null,
    coverageStatus: topic?.coverageStatus ?? "FULL",
    limitations: topic?.limitations ?? [],
    environments: topic?.environments ?? registry.globalEnvironments
      .filter((item) => item.status !== "UNAVAILABLE")
      .map((item) => item.environment),
  };
}

export function notebookIsReady(status: StudyExecutionNotebookStatus): boolean {
  return status === "READY_THEORY_ONLY" || status === "READY_WITH_FGV_EVIDENCE";
}
