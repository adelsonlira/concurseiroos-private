import {
  MaterialLocatorRecommendation,
  MaterialRoutingInput,
  PrivateMaterialProvider,
  PrivateMaterialSourceRole,
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

const DIAGNOSTIC_QUESTION_PREFERENCE = [
  "QUESTION_LIST",
  "SIMULATION",
  "COMMENTED_QUESTIONS",
  "THEORY"
] as const;

function preferenceIndex(input: MaterialRoutingInput, kind: string): number {
  const preference =
    input.activity === "questoes" && input.diagnosticPurpose
      ? DIAGNOSTIC_QUESTION_PREFERENCE
      : ACTIVITY_PREFERENCE[input.activity];
  const index = preference.indexOf(kind as never);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function providerFor(material: PrivateStudyMaterial): PrivateMaterialProvider {
  if (material.sourceProvider) return material.sourceProvider;
  if (/estrat[eé]gia/i.test(material.sourceGroup)) return "ESTRATEGIA_CONCURSOS";
  if (/ti\s*total/i.test(material.sourceGroup)) return "TI_TOTAL";
  return "OTHER_PRIVATE";
}

function roleFor(material: PrivateStudyMaterial): PrivateMaterialSourceRole {
  return material.sourceRole ??
    (providerFor(material) === "ESTRATEGIA_CONCURSOS" ? "PRIMARY" : "COMPLEMENTARY");
}

function priorityFor(material: PrivateStudyMaterial): number {
  if (Number.isFinite(material.sourcePriority)) return material.sourcePriority as number;
  return roleFor(material) === "PRIMARY" ? 100 : 50;
}

/**
 * 0 = exact subtopic; 1 = topic-level fallback; null = ineligible.
 * Topic fallback is intentionally allowed so a broad FGV question set can be used
 * when no exact subtopic locator exists. It always loses to an otherwise equivalent
 * exact match.
 */
function mappingTier(
  section: PrivateStudyMaterialSection,
  input: MaterialRoutingInput
): 0 | 1 | null {
  if (section.mappingStatus === "REVIEW_REQUIRED") return null;
  if (input.subtopicId && section.subtopicIds.includes(input.subtopicId)) return 0;
  if (section.topicId === input.topicId) return 1;
  return null;
}

export function routePrivateStudyMaterial(
  catalog: readonly PrivateStudyMaterial[],
  input: MaterialRoutingInput
): MaterialLocatorRecommendation | null {
  const candidates = catalog.flatMap((material) => {
    if (material.concursoId !== input.concursoId) return [];
    if (material.rights.classification !== "PRIVATE_LICENSED_USER_COPY") return [];
    return material.sections.flatMap((section) => {
      const tier = mappingTier(section, input);
      return tier === null ? [] : [{ material, section, tier }];
    });
  });

  candidates.sort((left, right) => {
    const leftPreference = preferenceIndex(input, left.section.contentKind);
    const rightPreference = preferenceIndex(input, right.section.contentKind);
    if (leftPreference !== rightPreference) return leftPreference - rightPreference;

    if (left.tier !== right.tier) return left.tier - right.tier;

    const leftFgvBonus = input.activity === "questoes" && left.section.questionBank === "FGV" ? 1 : 0;
    const rightFgvBonus = input.activity === "questoes" && right.section.questionBank === "FGV" ? 1 : 0;
    if (leftFgvBonus !== rightFgvBonus) return rightFgvBonus - leftFgvBonus;

    const sourcePriorityDifference = priorityFor(right.material) - priorityFor(left.material);
    if (sourcePriorityDifference !== 0) return sourcePriorityDifference;

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
    sourceProvider: providerFor(selected.material),
    sourceRole: roleFor(selected.material),
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
