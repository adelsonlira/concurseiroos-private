import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { getCompetitionRuntimeDefinition } from "../../../config/concursos/registry";
import { assessKnowledgeState } from "../knowledgeState";
import { calculateHierarchicalNodeWeights, sumTopicParticipationsByDiscipline } from "../hierarchicalWeights";
import { prerequisiteStateForTaxonomyNode, validateKnowledgeGraph } from "../knowledgeGraph";
import { DATAPREV_KNOWLEDGE_GRAPH_V2 } from "../config";
import type { KnowledgeStateAssessment, NormalizedEvidence, VersionedKnowledgeGraph } from "../types";

function evidence(overrides: Partial<NormalizedEvidence> = {}): NormalizedEvidence {
  return {
    evidenceId: "e1", disciplineId: "d1", topicId: "t1", subtopicId: "s1", sourceType: "test",
    granularity: "aggregate", totalItems: 10, correctItems: 7, wrongItems: 3, blankItems: 0,
    occurredAt: "2026-07-18T12:00:00.000Z", ageInDays: 0, consultedMaterial: false,
    authorityWeight: 1, measurementWeight: 1, recencyWeight: 1, effectiveSampleSize: 10,
    errorCauses: [], decisionEligible: true, eligibilityReason: "test", ...overrides,
  };
}

function state(nodeId: string, value: KnowledgeStateAssessment["state"]): KnowledgeStateAssessment {
  return {
    nodeId, state: value, weightedAccuracy: null, effectiveSampleSize: 0, lastEvidenceAt: null, ageInDays: null,
    consultedEvidenceRatio: 0, trend: "UNKNOWN", confidence: "LOW", primaryErrorCause: null,
    theoryCoverage: "NONE", reviewPending: false, evidenceIds: [], reasons: [],
  };
}

describe("SDE v2 knowledge state", () => {
  it("classifies no evidence as UNSEEN", () => expect(assessKnowledgeState("s1", []).state).toBe("UNSEEN"));
  it("classifies theory without objective measurement as LEARNING", () => {
    expect(assessKnowledgeState("s1", [evidence({ effectiveSampleSize: 0, totalItems: undefined, correctItems: undefined, wrongItems: undefined, blankItems: undefined, granularity: "session", theoryCompleted: true })]).state).toBe("LEARNING");
  });
  it("classifies a minimum but non-stable sample as PRACTICING", () => expect(assessKnowledgeState("s1", [evidence()]).state).toBe("PRACTICING"));
  it("classifies low weighted performance as CRITICAL", () => expect(assessKnowledgeState("s1", [evidence({ correctItems: 3, wrongItems: 7 })]).state).toBe("CRITICAL"));
  it("classifies a strong fresh sample as STABLE", () => expect(assessKnowledgeState("s1", [evidence({ totalItems: 30, correctItems: 27, wrongItems: 3, effectiveSampleSize: 30 })]).state).toBe("STABLE"));
  it("classifies strong but stale evidence as DECAYING", () => expect(assessKnowledgeState("s1", [evidence({ totalItems: 30, correctItems: 27, wrongItems: 3, effectiveSampleSize: 30, ageInDays: 60 })]).state).toBe("DECAYING"));
  it("classifies incompatible counts as INVALID", () => expect(assessKnowledgeState("s1", [evidence({ totalItems: 10, correctItems: 8, wrongItems: 8 })]).state).toBe("INVALID"));
  it("records worsening trend and primary error cause", () => {
    const result = assessKnowledgeState("s1", [
      evidence({ evidenceId: "old", occurredAt: "2026-07-01T12:00:00Z", correctItems: 9, wrongItems: 1, errorCauses: ["interpretation"] }),
      evidence({ evidenceId: "new", occurredAt: "2026-07-18T12:00:00Z", correctItems: 4, wrongItems: 6, errorCauses: ["application"] }),
    ]);
    expect(result.trend).toBe("WORSENING");
    expect(result.primaryErrorCause).toBeTruthy();
  });
});

describe("SDE v2 hierarchical weights and graph", () => {
  it("distributes each discipline participation to a total of one", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    const weights = calculateHierarchicalNodeWeights({ edital: getCompetitionRuntimeDefinition(seed.concurso.id).package.sde.edital, disciplinas: seed.disciplinas, assuntos: seed.assuntos, subassuntos: seed.subassuntos });
    const sums = sumTopicParticipationsByDiscipline(weights);
    for (const value of Object.values(sums)) expect(value).toBeCloseTo(1, 8);
  });

  it("does not repeat the full discipline weight on each subtopic", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    const weights = calculateHierarchicalNodeWeights({ edital: getCompetitionRuntimeDefinition(seed.concurso.id).package.sde.edital, disciplinas: seed.disciplinas, assuntos: seed.assuntos, subassuntos: seed.subassuntos });
    for (const weight of Object.values(weights)) expect(weight.effectiveNodeWeight).toBeLessThan(weight.officialDisciplineWeight);
  });

  it("rejects configured topic participations that do not sum to one", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    expect(() => calculateHierarchicalNodeWeights({
      edital: getCompetitionRuntimeDefinition(seed.concurso.id).package.sde.edital, disciplinas: seed.disciplinas, assuntos: seed.assuntos, subassuntos: seed.subassuntos,
      configuredTopicParticipation: Object.fromEntries(seed.assuntos.map((item) => [item.id, 0.5])),
    })).toThrow(/somar 1/i);
  });

  it("validates the approved DATAPREV graph and relation count", () => {
    const seed = buildDataprev2026Profile3AppSeed();
    const result = validateKnowledgeGraph(DATAPREV_KNOWLEDGE_GRAPH_V2, new Set(seed.subassuntos.map((item) => item.id)));
    expect(result.valid).toBe(true);
    expect(DATAPREV_KNOWLEDGE_GRAPH_V2.edges).toHaveLength(20);
  });

  it("rejects required-prerequisite cycles", () => {
    const graph: VersionedKnowledgeGraph = {
      version: "test", nodes: [
        { nodeId: "a", taxonomyNodeId: "ta", label: "A" },
        { nodeId: "b", taxonomyNodeId: "tb", label: "B" },
      ], edges: [
        { fromNodeId: "a", toNodeId: "b", relation: "required_prerequisite", strength: 1, rationale: "A antes de B", version: "1" },
        { fromNodeId: "b", toNodeId: "a", relation: "required_prerequisite", strength: 1, rationale: "B antes de A", version: "1" },
      ],
    };
    expect(validateKnowledgeGraph(graph).valid).toBe(false);
  });

  it("blocks an advanced node when a distinct required prerequisite is unseen", () => {
    const graph: VersionedKnowledgeGraph = {
      version: "test", nodes: [
        { nodeId: "base", taxonomyNodeId: "base-tax", label: "Base" },
        { nodeId: "advanced", taxonomyNodeId: "advanced-tax", label: "Avançado" },
      ], edges: [{ fromNodeId: "base", toNodeId: "advanced", relation: "required_prerequisite", strength: 1, rationale: "base obrigatória", version: "1" }],
    };
    const result = prerequisiteStateForTaxonomyNode({ graph, taxonomyNodeId: "advanced-tax", knowledgeStates: { "base-tax": state("base-tax", "UNSEEN") }, acceptableRequiredStates: ["PRACTICING", "STABLE"] });
    expect(result.requiredBlocked).toBe(true);
    expect(result.blockingNodeIds).toEqual(["base-tax"]);
  });

  it("records recommended prerequisites without blocking", () => {
    const graph: VersionedKnowledgeGraph = {
      version: "test", nodes: [
        { nodeId: "base", taxonomyNodeId: "base-tax", label: "Base" },
        { nodeId: "advanced", taxonomyNodeId: "advanced-tax", label: "Avançado" },
      ], edges: [{ fromNodeId: "base", toNodeId: "advanced", relation: "recommended_prerequisite", strength: 0.8, rationale: "base recomendada", version: "1" }],
    };
    const result = prerequisiteStateForTaxonomyNode({ graph, taxonomyNodeId: "advanced-tax", knowledgeStates: { "base-tax": state("base-tax", "LEARNING") }, acceptableRequiredStates: ["PRACTICING", "STABLE"] });
    expect(result.requiredBlocked).toBe(false);
    expect(result.recommendedNodeIds).toEqual(["base-tax"]);
  });

  it("calculates a bounded transfer bonus", () => {
    const graph: VersionedKnowledgeGraph = {
      version: "test", nodes: [
        { nodeId: "base", taxonomyNodeId: "base-tax", label: "Base" },
        { nodeId: "a", taxonomyNodeId: "a-tax", label: "A" },
        { nodeId: "b", taxonomyNodeId: "b-tax", label: "B" },
      ], edges: [
        { fromNodeId: "base", toNodeId: "a", relation: "transfer", strength: 0.8, rationale: "transfer A", version: "1" },
        { fromNodeId: "base", toNodeId: "b", relation: "transfer", strength: 0.6, rationale: "transfer B", version: "1" },
      ],
    };
    expect(prerequisiteStateForTaxonomyNode({ graph, taxonomyNodeId: "base-tax", knowledgeStates: {}, acceptableRequiredStates: [] }).transferValue).toBeCloseTo(0.7);
  });
});
