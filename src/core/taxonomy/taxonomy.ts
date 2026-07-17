import type { CompetitionConfigurationPackage } from "../../config/concursos/types";
import type { PrivateStudyMaterial } from "../materials/types";
import type {
  CanonicalSyllabusTaxonomy,
  CanonicalTaxonomyNode,
  TaxonomyCoverageSummary,
} from "./types";

export function buildCanonicalTaxonomy(params: {
  competition: CompetitionConfigurationPackage;
  generatedAt: string;
}): CanonicalSyllabusTaxonomy {
  const source = params.competition.sources[0];
  if (!source) throw new Error("O pacote precisa declarar ao menos uma fonte oficial.");

  const nodes: CanonicalTaxonomyNode[] = [];
  params.competition.sde.disciplinas.forEach((discipline, disciplineIndex) => {
    nodes.push({
      id: discipline.id,
      kind: "DISCIPLINE",
      name: discipline.nome,
      parentId: null,
      order: disciplineIndex + 1,
      official: true,
      sourceDocument: source.document,
      sourceSection: source.section,
      sourcePage: source.page,
      questionCount: params.competition.officialRules.totalQuestions > 0
        ? params.competition.sde.edital.quantidadeQuestoesProva[discipline.id]
        : undefined,
      pointsPerQuestion: params.competition.sde.edital.pontosPorQuestao[discipline.id],
    });
  });

  params.competition.sde.assuntos.forEach((topic) => {
    const siblings = params.competition.sde.assuntos.filter((item) => item.disciplinaId === topic.disciplinaId);
    nodes.push({
      id: topic.id,
      kind: "TOPIC",
      name: topic.nome,
      parentId: topic.disciplinaId,
      order: siblings.findIndex((item) => item.id === topic.id) + 1,
      official: true,
      sourceDocument: source.document,
      sourceSection: source.section,
      sourcePage: source.page,
    });
  });

  params.competition.sde.subassuntos.forEach((subtopic) => {
    const siblings = params.competition.sde.subassuntos.filter((item) => item.assuntoId === subtopic.assuntoId);
    nodes.push({
      id: subtopic.id,
      kind: "SUBTOPIC",
      name: subtopic.nome,
      parentId: subtopic.assuntoId,
      order: siblings.findIndex((item) => item.id === subtopic.id) + 1,
      official: true,
      sourceDocument: source.document,
      sourceSection: source.section,
      sourcePage: source.page,
    });
  });

  const duplicateIds = nodes.filter((node, index) => nodes.findIndex((candidate) => candidate.id === node.id) !== index);
  if (duplicateIds.length > 0) throw new Error(`IDs duplicados na taxonomia: ${duplicateIds.map((item) => item.id).join(", ")}`);

  return {
    schemaVersion: "1.0.0",
    competitionId: params.competition.id,
    competitionVersion: params.competition.version,
    generatedAt: params.generatedAt,
    shadowMode: true,
    nodes,
  };
}

export function calculateTaxonomyCoverage(params: {
  taxonomy: CanonicalSyllabusTaxonomy;
  materials: readonly PrivateStudyMaterial[];
  questionEvidenceBySubtopic?: Readonly<Record<string, number>>;
  humanReviewedQuestionEvidenceBySubtopic?: Readonly<Record<string, number>>;
}): TaxonomyCoverageSummary {
  const records = params.taxonomy.nodes
    .filter((node) => node.kind === "SUBTOPIC")
    .map((node) => {
      const materialLocatorCount = params.materials.reduce(
        (count, material) => count + material.sections.filter((section) => section.subtopicIds.includes(node.id)).length,
        0,
      );
      const questionEvidenceCount = Math.max(0, params.questionEvidenceBySubtopic?.[node.id] ?? 0);
      const humanReviewedQuestionCount = Math.max(0, params.humanReviewedQuestionEvidenceBySubtopic?.[node.id] ?? 0);
      const status = materialLocatorCount > 0 && humanReviewedQuestionCount > 0
        ? "READY"
        : materialLocatorCount > 0
          ? "MATERIAL_ONLY"
          : questionEvidenceCount > 0
            ? "QUESTION_ONLY"
            : "GAP";
      return { subtopicId: node.id, materialLocatorCount, questionEvidenceCount, humanReviewedQuestionCount, status } as const;
    });

  return {
    totalSubtopics: records.length,
    ready: records.filter((item) => item.status === "READY").length,
    materialOnly: records.filter((item) => item.status === "MATERIAL_ONLY").length,
    questionOnly: records.filter((item) => item.status === "QUESTION_ONLY").length,
    gaps: records.filter((item) => item.status === "GAP").length,
    records,
  };
}
