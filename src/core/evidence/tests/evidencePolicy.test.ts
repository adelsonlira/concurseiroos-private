/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import {
  buildHistoricalIncidenceMap,
  canSourceInfluenceHistoricalIncidence,
  isIncidenceEvidenceActivatable,
  resolveHistoricalIncidence,
  validateEvidenceActivationPolicy
} from "../evidencePolicy";
import {
  StrategicEvidencePackage,
  StrategicEvidenceSource,
  TopicIncidenceEvidence
} from "../types";

const policy = {
  minimumManuallyReviewedQuestionsPerTopic: 20,
  requireDeduplication: true,
  requireReproducibleInclusionCriteria: true,
  requireReproducibleExclusionCriteria: true
};

const validatedSource: StrategicEvidenceSource = {
  id: "validated-corpus",
  title: "Corpus validado",
  kind: "OFFICIAL_QUESTION_CORPUS",
  validationStatus: "VALIDATED",
  allowedUses: ["QUESTION_STYLE", "TOPIC_CANDIDATE_DISCOVERY", "SDE_HISTORICAL_INCIDENCE"],
  forbiddenUses: [],
  notes: []
};

const validatedEvidence: TopicIncidenceEvidence = {
  id: "topic-a-incidence",
  topicId: "topic-a",
  sourceIds: [validatedSource.id],
  status: "VALIDATED",
  matchedQuestionCount: 30,
  eligibleCorpusQuestionCount: 100,
  incidenceRate: 0.3,
  manuallyReviewedQuestionCount: 100,
  deduplicated: true,
  inclusionCriteria: ["Questão aderente ao conteúdo programático do tópico."],
  exclusionCriteria: ["Questão de cargo ou conteúdo sem aderência temática."],
  notes: []
};

function buildPackage(
  source: StrategicEvidenceSource = validatedSource,
  evidence: TopicIncidenceEvidence = validatedEvidence
): StrategicEvidencePackage {
  return {
    version: "test",
    sources: [source],
    incidenceEvidence: [evidence],
    externalEstimates: [],
    activationPolicy: policy
  };
}

describe("Strategic evidence activation policy", () => {
  it("mantém prior neutro quando não existe evidência validada", () => {
    const pkg: StrategicEvidencePackage = {
      version: "test",
      sources: [],
      incidenceEvidence: [],
      externalEstimates: [],
      activationPolicy: policy
    };

    expect(resolveHistoricalIncidence("topic-a", pkg)).toEqual({
      value: 0.5,
      source: "UNAVAILABLE",
      evidenceId: null,
      note: expect.stringContaining("prior neutro")
    });
  });

  it("estudo secundário não pode alimentar incidência histórica", () => {
    const source: StrategicEvidenceSource = {
      ...validatedSource,
      kind: "SECONDARY_ANALYSIS",
      validationStatus: "VALIDATED"
    };

    expect(canSourceInfluenceHistoricalIncidence(source)).toBe(false);
    expect(resolveHistoricalIncidence("topic-a", buildPackage(source)).source).toBe("UNAVAILABLE");
  });

  it("síntese de IA não pode alimentar incidência histórica", () => {
    const source: StrategicEvidenceSource = {
      ...validatedSource,
      kind: "AI_SYNTHESIS",
      validationStatus: "VALIDATED"
    };

    expect(canSourceInfluenceHistoricalIncidence(source)).toBe(false);
  });

  it("vídeo de especialista não pode alimentar incidência histórica", () => {
    const source: StrategicEvidenceSource = {
      ...validatedSource,
      kind: "EXPERT_VIDEO",
      validationStatus: "VALIDATED"
    };

    expect(canSourceInfluenceHistoricalIncidence(source)).toBe(false);
  });

  it("corpus bruto não curado não pode alimentar incidência histórica", () => {
    const source: StrategicEvidenceSource = {
      ...validatedSource,
      validationStatus: "RAW_UNCURATED"
    };

    expect(canSourceInfluenceHistoricalIncidence(source)).toBe(false);
  });

  it("corpus validado e autorizado pode alimentar incidência histórica", () => {
    expect(canSourceInfluenceHistoricalIncidence(validatedSource)).toBe(true);
    expect(resolveHistoricalIncidence("topic-a", buildPackage())).toMatchObject({
      value: 0.3,
      source: "EMPIRICAL",
      evidenceId: validatedEvidence.id
    });
  });

  it("evidência não deduplicada permanece inativa", () => {
    const evidence = { ...validatedEvidence, deduplicated: false };
    expect(isIncidenceEvidenceActivatable(evidence, [validatedSource], policy)).toBe(false);
  });

  it("evidência com revisão manual insuficiente permanece inativa", () => {
    const evidence = { ...validatedEvidence, manuallyReviewedQuestionCount: 19 };
    expect(isIncidenceEvidenceActivatable(evidence, [validatedSource], policy)).toBe(false);
  });

  it("evidência sem critérios reproduzíveis permanece inativa", () => {
    const evidence = { ...validatedEvidence, inclusionCriteria: [] };
    expect(isIncidenceEvidenceActivatable(evidence, [validatedSource], policy)).toBe(false);
  });

  it("taxa fora do intervalo é rejeitada", () => {
    const evidence = { ...validatedEvidence, incidenceRate: 1.2 };
    expect(() => isIncidenceEvidenceActivatable(evidence, [validatedSource], policy)).toThrow(
      /entre 0 e 1/
    );
  });

  it("política de ativação inválida é rejeitada", () => {
    expect(() =>
      validateEvidenceActivationPolicy({
        ...policy,
        minimumManuallyReviewedQuestionsPerTopic: 0
      })
    ).toThrow(/inteiro positivo/);
  });

  it("gera mapa completo sem converter ausência em frequência empírica", () => {
    const map = buildHistoricalIncidenceMap(["topic-a", "topic-b"], buildPackage());
    expect(map["topic-a"].source).toBe("EMPIRICAL");
    expect(map["topic-b"]).toMatchObject({ value: 0.5, source: "UNAVAILABLE" });
  });

  it("uso proibido prevalece sobre uso permitido", () => {
    const source: StrategicEvidenceSource = {
      ...validatedSource,
      forbiddenUses: ["SDE_HISTORICAL_INCIDENCE"]
    };
    expect(canSourceInfluenceHistoricalIncidence(source)).toBe(false);
  });
});
