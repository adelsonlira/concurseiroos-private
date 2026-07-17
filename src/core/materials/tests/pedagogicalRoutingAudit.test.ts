import { describe, expect, it } from "vitest";
import type { CanonicalSyllabusTaxonomy } from "../../taxonomy/types";
import type { PrivateStudyMaterial } from "../types";
import { auditPedagogicalRouting } from "../pedagogicalRoutingAudit";

const taxonomy: CanonicalSyllabusTaxonomy = {
  schemaVersion: "1.0.0",
  competitionId: "c1",
  competitionVersion: "1",
  generatedAt: "2026-07-17T00:00:00Z",
  shadowMode: true,
  nodes: [
    { id: "d1", kind: "DISCIPLINE", name: "Disciplina", parentId: null, order: 1, official: true, sourceDocument: "edital", sourceSection: "x", sourcePage: null },
    { id: "t1", kind: "TOPIC", name: "Assunto", parentId: "d1", order: 1, official: true, sourceDocument: "edital", sourceSection: "x", sourcePage: null },
    { id: "s1", kind: "SUBTOPIC", name: "Sub 1", parentId: "t1", order: 1, official: true, sourceDocument: "edital", sourceSection: "x", sourcePage: null },
    { id: "s2", kind: "SUBTOPIC", name: "Sub 2", parentId: "t1", order: 2, official: true, sourceDocument: "edital", sourceSection: "x", sourcePage: null }
  ]
};

const base: Omit<PrivateStudyMaterial, "sections"> = {
  id: "m1", schemaVersion: "1", concursoId: "c1", sourceGroup: "curso",
  sourceFileName: "aula.pdf", sourceRelativePath: "aula.pdf", sourceSha256: "hash",
  sourcePortalCourseId: null, lessonLabel: "01", courseTitle: "Curso", displayTitle: "Curso",
  totalPages: 20, textLayer: "NATIVE_TEXT", disciplineId: "d1", topicId: "t1",
  rights: { classification: "PRIVATE_LICENSED_USER_COPY", sharingAllowed: false, contentExportAllowed: false, metadataExportAllowed: true, containsPersonalWatermark: false, retentionPolicy: "DERIVED_METADATA_ONLY" }
};

it("never routes a sibling subtopic section as fallback", () => {
  const material: PrivateStudyMaterial = {
    ...base,
    sections: [{ ordinal: 1, title: "Sub 1", startPage: 1, endPage: 10, contentKind: "THEORY", questionBank: null, disciplineId: "d1", topicId: "t1", subtopicIds: ["s1"], mappingStatus: "AUTO_HIGH_CONFIDENCE", confidence: 1, matchedTerms: ["sub 1"] }]
  };
  const report = auditPedagogicalRouting({
    taxonomy,
    materials: [material],
    externalQuestionBanks: [{ id: "q", provider: "QCONCURSOS", displayName: "Qconcursos", accessMode: "USER_SUBSCRIPTION", enabled: true }],
    generatedAt: "2026-07-17T00:00:00Z"
  });
  const sibling = report.records.find((record) => record.subtopicId === "s2");
  expect(sibling?.theoryStatus).toBe("MANUAL_LOCATOR_REQUIRED");
  expect(sibling?.diagnosticStatus).toBe("EXTERNAL_BANK_REQUIRED");
  expect(report.counts.unsafeSiblingRoutes).toBe(0);
  expect(report.status).toBe("PASS");
});

it("allows only an explicitly topic-level section as broad fallback", () => {
  const material: PrivateStudyMaterial = {
    ...base,
    sections: [
      { ordinal: 1, title: "Visão geral", startPage: 1, endPage: 10, contentKind: "THEORY", questionBank: null, disciplineId: "d1", topicId: "t1", subtopicIds: [], mappingStatus: "TOPIC_ONLY", confidence: 0.75, matchedTerms: ["AUDITED_TOPIC_WIDE"] }
    ]
  };
  const report = auditPedagogicalRouting({
    taxonomy,
    materials: [material],
    externalQuestionBanks: [{ id: "q", provider: "QCONCURSOS", displayName: "Qconcursos", accessMode: "USER_SUBSCRIPTION", enabled: true }],
    generatedAt: "2026-07-17T00:00:00Z"
  });
  expect(report.records.every((record) => record.theoryStatus === "TOPIC_FALLBACK")).toBe(true);
  expect(report.records.every((record) => record.theoryMaterial?.fallbackNotice)).toBe(true);
});
