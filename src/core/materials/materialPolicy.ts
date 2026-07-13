import {
  MaterialLocatorRecommendation,
  MaterialRoutingInput,
  PrivateStudyMaterial,
  PrivateStudyMaterialSection
} from "./types";

const PRIVATE_NOTICE =
  "Material privado da assinatura do usuário. O aplicativo usa apenas localização pedagógica e metadados; não compartilha nem exporta o conteúdo do PDF.";

const ACTIVITY_PREFERENCE: Record<MaterialRoutingInput["activity"], readonly string[]> = {
  teoria: ["THEORY", "SUMMARY", "MIND_MAP", "REFERENCE"],
  questoes: ["COMMENTED_QUESTIONS", "QUESTION_LIST", "SIMULATION", "THEORY"],
  revisao: ["SUMMARY", "MIND_MAP", "THEORY", "COMMENTED_QUESTIONS"],
  flashcards: ["SUMMARY", "MIND_MAP", "THEORY"],
  simulado: ["SIMULATION", "QUESTION_LIST", "COMMENTED_QUESTIONS"]
};

function preferenceIndex(activity: MaterialRoutingInput["activity"], kind: string): number {
  const index = ACTIVITY_PREFERENCE[activity].indexOf(kind);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function isEligibleMapping(section: PrivateStudyMaterialSection, input: MaterialRoutingInput): boolean {
  if (input.subtopicId) {
    return (
      section.subtopicIds.includes(input.subtopicId) &&
      (section.mappingStatus === "AUTO_HIGH_CONFIDENCE" ||
        section.mappingStatus === "AUTO_REVIEWABLE")
    );
  }
  return (
    section.topicId === input.topicId &&
    section.mappingStatus !== "REVIEW_REQUIRED"
  );
}

export function routePrivateStudyMaterial(
  catalog: readonly PrivateStudyMaterial[],
  input: MaterialRoutingInput
): MaterialLocatorRecommendation | null {
  const candidates = catalog.flatMap((material) => {
    if (material.concursoId !== input.concursoId) return [];
    if (material.rights.classification !== "PRIVATE_LICENSED_USER_COPY") return [];
    return material.sections
      .filter((section) => isEligibleMapping(section, input))
      .map((section) => ({ material, section }));
  });

  candidates.sort((left, right) => {
    const leftPreference = preferenceIndex(input.activity, left.section.contentKind);
    const rightPreference = preferenceIndex(input.activity, right.section.contentKind);
    if (leftPreference !== rightPreference) return leftPreference - rightPreference;

    const leftFgvBonus = input.activity === "questoes" && left.section.questionBank === "FGV" ? 1 : 0;
    const rightFgvBonus = input.activity === "questoes" && right.section.questionBank === "FGV" ? 1 : 0;
    if (leftFgvBonus !== rightFgvBonus) return rightFgvBonus - leftFgvBonus;

    if (left.section.confidence !== right.section.confidence) {
      return right.section.confidence - left.section.confidence;
    }
    const materialCompare = left.material.id.localeCompare(right.material.id);
    if (materialCompare !== 0) return materialCompare;
    return left.section.startPage - right.section.startPage;
  });

  const selected = candidates[0];
  if (!selected) return null;

  return {
    materialId: selected.material.id,
    materialTitle: selected.material.displayTitle,
    sourceFileName: selected.material.sourceFileName,
    sectionTitle: selected.section.title,
    startPage: selected.section.startPage,
    endPage: selected.section.endPage,
    contentKind: selected.section.contentKind,
    questionBank: selected.section.questionBank,
    mappingStatus: selected.section.mappingStatus,
    confidence: selected.section.confidence,
    accessMode: "USER_PRIVATE_LOCAL_COPY",
    privacyNotice: PRIVATE_NOTICE,
    strategicUse: "PEDAGOGICAL_ROUTING_ONLY"
  };
}

export function catalogContainsOnlyDerivedPrivateMetadata(
  catalog: readonly PrivateStudyMaterial[]
): boolean {
  const forbiddenKeyPattern = /(textoExtraido|conteudoMarkdown|rawText|pageText|cpf|subscriberName)/i;
  const serialized = JSON.stringify(catalog);
  return (
    !forbiddenKeyPattern.test(serialized) &&
    catalog.every(
      (material) =>
        material.rights.classification === "PRIVATE_LICENSED_USER_COPY" &&
        material.rights.sharingAllowed === false &&
        material.rights.contentExportAllowed === false &&
        material.rights.metadataExportAllowed === true &&
        material.rights.retentionPolicy === "DERIVED_METADATA_ONLY"
    )
  );
}

export function privateMaterialMayAffectStrategicPriority(): false {
  return false;
}
