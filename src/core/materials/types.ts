import { StudyActivityKind } from "../../types";

export type MaterialMappingStatus =
  | "AUTO_HIGH_CONFIDENCE"
  | "AUTO_REVIEWABLE"
  | "TOPIC_ONLY"
  | "REVIEW_REQUIRED";

export type MaterialContentKind =
  | "THEORY"
  | "SUMMARY"
  | "MIND_MAP"
  | "COMMENTED_QUESTIONS"
  | "QUESTION_LIST"
  | "SIMULATION"
  | "REFERENCE";

export interface PrivateMaterialRights {
  classification: "PRIVATE_LICENSED_USER_COPY";
  sharingAllowed: false;
  contentExportAllowed: false;
  metadataExportAllowed: true;
  containsPersonalWatermark: boolean;
  retentionPolicy: "DERIVED_METADATA_ONLY";
}

export interface PrivateStudyMaterialSection {
  ordinal: number;
  title: string;
  startPage: number;
  endPage: number;
  contentKind: MaterialContentKind;
  questionBank: string | null;
  disciplineId: string | null;
  topicId: string | null;
  subtopicIds: string[];
  mappingStatus: MaterialMappingStatus;
  confidence: number;
  matchedTerms: string[];
}

export type PrivateMaterialProvider =
  | "ESTRATEGIA_CONCURSOS"
  | "TI_TOTAL"
  | "OTHER_PRIVATE";

export type PrivateMaterialSourceRole = "PRIMARY" | "COMPLEMENTARY";

export interface PrivateStudyMaterial {
  id: string;
  schemaVersion: string;
  concursoId: string;
  sourceGroup: string;
  /** Provider metadata only; no licensed content is embedded. */
  sourceProvider?: PrivateMaterialProvider;
  sourceRole?: PrivateMaterialSourceRole;
  /** Higher values are preferred only after pedagogical fit and banca fit. */
  sourcePriority?: number;
  sourceFileName: string;
  sourceRelativePath: string;
  sourceSha256: string;
  sourcePortalCourseId: string | null;
  lessonLabel: string;
  courseTitle: string;
  displayTitle: string;
  totalPages: number;
  textLayer: "NATIVE_TEXT";
  disciplineId: string | null;
  topicId: string | null;
  sections: PrivateStudyMaterialSection[];
  rights: PrivateMaterialRights;
}

export interface MaterialLocatorRecommendation {
  materialId: string;
  materialTitle: string;
  sourceFileName: string;
  sourceProvider: PrivateMaterialProvider;
  sourceRole: PrivateMaterialSourceRole;
  sectionTitle: string;
  startPage: number;
  endPage: number;
  contentKind: MaterialContentKind;
  questionBank: string | null;
  mappingStatus: MaterialMappingStatus;
  confidence: number;
  accessMode: "USER_PRIVATE_LOCAL_COPY";
  privacyNotice: string;
  strategicUse: "PEDAGOGICAL_ROUTING_ONLY";
}

export interface MaterialRoutingInput {
  concursoId: string;
  activity: StudyActivityKind;
  diagnosticPurpose?: boolean;
  disciplineId: string;
  topicId: string;
  subtopicId?: string;
}
