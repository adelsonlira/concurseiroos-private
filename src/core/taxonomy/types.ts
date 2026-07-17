export type TaxonomyNodeKind = "DISCIPLINE" | "TOPIC" | "SUBTOPIC";

export interface CanonicalTaxonomyNode {
  id: string;
  kind: TaxonomyNodeKind;
  name: string;
  parentId: string | null;
  order: number;
  official: true;
  sourceDocument: string;
  sourceSection: string;
  sourcePage: number;
  questionCount?: number;
  pointsPerQuestion?: number;
}

export interface CanonicalSyllabusTaxonomy {
  schemaVersion: "1.0.0";
  competitionId: string;
  competitionVersion: string;
  generatedAt: string;
  shadowMode: true;
  nodes: CanonicalTaxonomyNode[];
}

export interface TaxonomyCoverageRecord {
  subtopicId: string;
  materialLocatorCount: number;
  questionEvidenceCount: number;
  humanReviewedQuestionCount: number;
  status: "READY" | "MATERIAL_ONLY" | "QUESTION_ONLY" | "GAP";
}

export interface TaxonomyCoverageSummary {
  totalSubtopics: number;
  ready: number;
  materialOnly: number;
  questionOnly: number;
  gaps: number;
  records: TaxonomyCoverageRecord[];
}
