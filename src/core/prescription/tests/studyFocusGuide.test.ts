import { describe, expect, it } from "vitest";
import { buildStudyFocusGuide, type CompetitionStudyGuidance } from "../studyFocusGuide";

const guidance: CompetitionStudyGuidance = {
  version: "1.0.0",
  sourceLabel: "Prova oficial de referência",
  sourceScope: "Uma prova",
  banca: "FGV",
  evidenceStatus: "DESCRIPTIVE_REFERENCE_ONLY",
  questionStyleCounts: { CONCEPT_COMPARISON: 2 },
  topicSignals: [
    {
      topicId: "bd",
      subtopicId: "avaliacao",
      referenceLabel: "avaliação de modelos",
      observedFocus: ["comparar critérios de qualidade de modelos"],
      attentionPoints: ["Separar nível lógico de nível físico."],
      questionStyles: ["CONCEPT_COMPARISON"],
      referenceQuestionCount: 1
    }
  ],
  limitations: ["Amostra descritiva."]
};

describe("study focus guide", () => {
  it("orienta primeiro contato e aceita ainda não sei antes da leitura", () => {
    const result = buildStudyFocusGuide({
      activity: "teoria",
      topicId: "bd",
      topicName: "Banco de Dados",
      subtopicId: "avaliacao",
      subtopicName: "Avaliação de modelos de dados",
      siblingSubtopicNames: ["Modelagem conceitual", "Modelagem lógica"],
      guidance
    });
    expect(result?.mode).toBe("FIRST_CONTACT");
    expect(result?.instruction).toContain("ainda não sei");
    expect(result?.questions.length).toBeGreaterThanOrEqual(5);
    expect(result?.questions.length).toBeLessThanOrEqual(10);
    expect(result?.successCriteria.join(" ")).toContain("sem consultar");
  });

  it("usa foco observado sem transformá-lo em frequência histórica", () => {
    const result = buildStudyFocusGuide({
      activity: "teoria",
      topicId: "bd",
      topicName: "Banco de Dados",
      subtopicId: "avaliacao",
      subtopicName: "Avaliação de modelos de dados",
      guidance
    });
    expect(result?.questions.join(" ")).toContain("comparar critérios");
    expect(result?.title).toContain("Questões-guia de prova");
    expect(result?.evidenceLabel).toContain("avaliação de modelos");
    expect(result?.limitations.join(" ")).toContain("não altera sozinho");
  });

  it("não cria guia de teoria para bateria de questões", () => {
    expect(buildStudyFocusGuide({
      activity: "questoes",
      topicId: "bd",
      topicName: "Banco de Dados",
      guidance
    })).toBeNull();
  });
});
