import { describe, expect, it } from "vitest";
import type { MaterialLocatorRecommendation } from "../../materials/types";
import {
  buildExternalQuestionSourcePlan,
  type ExternalQuestionBankDefinition
} from "../externalQuestionBanks";

const banks: ExternalQuestionBankDefinition[] = [
  {
    id: "qconcursos",
    provider: "QCONCURSOS",
    displayName: "Qconcursos",
    accessMode: "USER_SUBSCRIPTION",
    enabled: true
  },
  {
    id: "estrategia-questoes",
    provider: "ESTRATEGIA_QUESTOES",
    displayName: "Estratégia Questões",
    accessMode: "USER_SUBSCRIPTION",
    enabled: true
  }
];

const material: MaterialLocatorRecommendation = {
  materialId: "m1",
  materialTitle: "Aula",
  sourceFileName: "aula.pdf",
  sourceProvider: "ESTRATEGIA_CONCURSOS",
  sourceRole: "PRIMARY",
  sectionTitle: "Questões FGV",
  startPage: 10,
  endPage: 20,
  contentKind: "COMMENTED_QUESTIONS",
  questionBank: "FGV",
  mappingStatus: "AUTO_HIGH_CONFIDENCE",
  matchScope: "EXACT_SUBTOPIC",
  fallbackNotice: null,
  confidence: 0.98,
  accessMode: "USER_PRIVATE_LOCAL_COPY",
  privacyNotice: "privado",
  strategicUse: "PEDAGOGICAL_ROUTING_ONLY"
};

describe("external question bank planning", () => {
  it("makes subscribed banks the primary source when no local question set exists", () => {
    const result = buildExternalQuestionSourcePlan({
      availableBanks: banks,
      material: null,
      banca: "FGV",
      disciplineName: "Conhecimentos Específicos",
      topicName: "Banco de Dados",
      subtopicName: "Normalização",
      targetQuestions: 12
    });

    expect(result).toMatchObject({
      need: "NO_LOCAL_QUESTION_SET",
      recommendations: [
        { usage: "PRIMARY", targetQuestions: 12 },
        { usage: "PRIMARY", targetQuestions: 12 }
      ]
    });
    expect(result?.recommendations.map((item) => item.displayName)).toEqual([
      "Estratégia Questões",
      "Qconcursos"
    ]);
    expect(result?.recommendations[0].filters).toMatchObject({
      banca: "FGV",
      topic: "Banco de Dados",
      subtopic: "Normalização",
      excludeAnnulled: true
    });
  });

  it("keeps external banks as optional fallback when a local FGV set is mapped", () => {
    const result = buildExternalQuestionSourcePlan({
      availableBanks: banks,
      material,
      banca: "FGV",
      disciplineName: "Conhecimentos Específicos",
      topicName: "Banco de Dados",
      targetQuestions: 8
    });

    expect(result?.need).toBe("OPTIONAL_ADDITIONAL_VOLUME");
    expect(result?.recommendations.every((item) => item.usage === "FALLBACK")).toBe(true);
  });

  it("does not treat commented solutions as a safe primary source for initial diagnosis", () => {
    const result = buildExternalQuestionSourcePlan({
      availableBanks: banks,
      material,
      banca: "FGV",
      disciplineName: "Conhecimentos Específicos",
      topicName: "Banco de Dados",
      targetQuestions: 10,
      diagnosticPurpose: true
    });

    expect(result?.need).toBe("NO_LOCAL_QUESTION_SET");
    expect(result?.recommendations.every((item) => item.usage === "PRIMARY")).toBe(true);
    expect(result?.rationale).toMatch(/comentários ou soluções/i);
  });

  it("returns no plan when the user has no enabled subscription source", () => {
    expect(
      buildExternalQuestionSourcePlan({
        availableBanks: banks.map((item) => ({ ...item, enabled: false })),
        material: null,
        banca: "FGV",
        disciplineName: "TI",
        topicName: "Java",
        targetQuestions: 5
      })
    ).toBeNull();
  });
});
