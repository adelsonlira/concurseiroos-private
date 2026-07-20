import type { MaterialLocatorRecommendation, PrivateStudyMaterial } from "../materials/types";
import { studyExecutionRegistry } from "./registry";
import type {
  StudyExecutionMaterialCandidate,
  StudyExecutionMaterialMatch,
  StudyExecutionRegistry,
} from "./types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesTerm(text: string, term: string): boolean {
  return text.includes(normalize(term));
}

function candidateText(candidate: StudyExecutionMaterialCandidate): string {
  return normalize([
    candidate.materialTitle,
    candidate.sectionTitle,
    candidate.sourceFileName,
  ].filter(Boolean).join(" "));
}

export function toStudyExecutionMaterialCandidate(
  material: MaterialLocatorRecommendation | StudyExecutionMaterialCandidate,
): StudyExecutionMaterialCandidate {
  if ("sectionTitle" in material && "materialTitle" in material && "matchScope" in material) {
    return {
      materialId: material.materialId,
      materialTitle: material.materialTitle,
      sectionTitle: material.sectionTitle,
      startPage: material.startPage,
      endPage: material.endPage,
      sourceFileName: material.sourceFileName,
      matchScope: material.matchScope,
      contentKind: material.contentKind,
      questionBank: material.questionBank,
    };
  }
  return { ...material };
}

export function assessStudyMaterialMatch(params: {
  disciplineId: string;
  topicId: string;
  subtopicId?: string;
  candidate: StudyExecutionMaterialCandidate | null | undefined;
  materialCatalog?: readonly PrivateStudyMaterial[];
  registry?: StudyExecutionRegistry;
}): StudyExecutionMaterialMatch {
  const candidate = params.candidate;
  if (!candidate) return "UNVERIFIED";
  const registry = params.registry ?? studyExecutionRegistry;
  const rule = registry.materialSemanticRules.find((item) => item.topicId === params.topicId);
  const text = candidateText(candidate);
  if (rule) {
    const incompatible = rule.incompatibleAny.some((term) => includesTerm(text, term));
    const supportsTopic = rule.requiredAny.some((term) => includesTerm(text, term));
    if (incompatible && !supportsTopic) return "INCOMPATIBLE";
  }

  const catalogMaterial = params.materialCatalog?.find((item) => item.id === candidate.materialId);
  if (catalogMaterial) {
    const exactSection = catalogMaterial.sections.find((section) =>
      params.subtopicId ? section.subtopicIds.includes(params.subtopicId) : false,
    );
    if (exactSection) return "EXACT_SUBTOPIC";
    const topicSections = catalogMaterial.sections.filter((section) => section.topicId === params.topicId);
    const crossMapped = topicSections.some((section) =>
      section.subtopicIds.length > 0 &&
      params.subtopicId !== undefined &&
      !section.subtopicIds.includes(params.subtopicId),
    );
    if (crossMapped && candidate.matchScope !== "EXACT_SUBTOPIC") return "INCOMPATIBLE";
    if (topicSections.some((section) => section.subtopicIds.length === 0 || section.matchedTerms.includes("AUDITED_TOPIC_WIDE"))) {
      return "EXACT_TOPIC";
    }
  }

  if (candidate.matchScope === "EXACT_SUBTOPIC") return "EXACT_SUBTOPIC";
  if (candidate.matchScope === "TOPIC_FALLBACK") return "EXACT_TOPIC";
  return "UNVERIFIED";
}

export function studyMaterialMatchLabel(match: StudyExecutionMaterialMatch): string {
  switch (match) {
    case "EXACT_SUBTOPIC": return "Material específico do subassunto";
    case "EXACT_TOPIC": return "Material específico do assunto";
    case "DISCIPLINE_LEVEL": return "Material amplo da disciplina";
    case "INCOMPATIBLE": return "Material incompatível com o assunto";
    default: return "Correspondência ainda não validada";
  }
}
