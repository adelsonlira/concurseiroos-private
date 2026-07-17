import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import reviewQueue from "../data/knowledge/official-review-queue.json";
import examManifest from "../data/knowledge/official-exam-manifest.json";
import { prioritizeReviewQueue, type ReviewQueueCandidate } from "../src/core/curation";

interface RawReviewItem {
  id: string;
  type: "EXAM_EXTRACTION" | "ANSWER_KEY_LINK" | "QUESTION_DEDUPLICATION";
  examDocumentId?: string;
  canonicalQuestionId?: string;
  memberQuestionIds?: string[];
  reason: string;
}

interface RawExamManifest {
  contestId: string;
  examDocumentId: string;
  year: number;
  bookletLabel: string;
}

const exams = examManifest as RawExamManifest[];
const examByDocument = new Map(exams.map((exam) => [exam.examDocumentId, exam]));

function documentIdFromQuestionId(value?: string): string | null {
  const match = value?.match(/^question:([^:]+):/);
  return match?.[1] ?? null;
}

function technicalProximity(exam: RawExamManifest | undefined): ReviewQueueCandidate["technicalProximity"] {
  if (!exam) return "UNKNOWN";
  const text = `${exam.contestId} ${exam.bookletLabel}`.toLocaleLowerCase("pt-BR");
  if (text.includes("dataprev") && exam.year === 2024) return "TARGET";
  if (/(desenvolvimento|software|sistemas|tecnologia da informa|ti\b|dados)/.test(text)) return "HIGH";
  if (/(analista|informática|computação|digital)/.test(text)) return "MEDIUM";
  return "LOW";
}

const candidates = (reviewQueue as RawReviewItem[]).map((item): ReviewQueueCandidate => {
  const documentId = item.examDocumentId
    ?? documentIdFromQuestionId(item.canonicalQuestionId)
    ?? documentIdFromQuestionId(item.memberQuestionIds?.[0])
    ?? undefined;
  const exam = documentId ? examByDocument.get(documentId) : undefined;
  const issueKinds: ReviewQueueCandidate["issueKinds"] = item.type === "ANSWER_KEY_LINK"
    ? ["ANSWER_KEY"]
    : item.type === "EXAM_EXTRACTION"
      ? ["EXTRACTION"]
      : ["DUPLICATE"];
  return {
    id: item.id,
    targetKind: item.type === "ANSWER_KEY_LINK"
      ? "ANSWER_KEY_LINK"
      : item.type === "EXAM_EXTRACTION"
        ? "QUESTION_EXTRACTION"
        : "DUPLICATE_GROUP",
    targetId: item.canonicalQuestionId ?? item.examDocumentId ?? item.id,
    contestSlug: exam?.contestId ?? null,
    examYear: exam?.year ?? null,
    roleLabel: exam?.bookletLabel ?? null,
    issueKinds,
    technicalProximity: technicalProximity(exam),
    unresolvedCount: item.memberQuestionIds?.length ?? 1,
  };
});

const prioritized = prioritizeReviewQueue(candidates);
const artifact = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-07-16T10:27:00-03:00",
  shadowMode: true,
  policy: "Prioritization organizes human review only; it does not alter SDE ranking or historical incidence.",
  counts: {
    total: prioritized.length,
    p0Target: prioritized.filter((item) => item.priorityBand === "P0_TARGET").length,
    p1High: prioritized.filter((item) => item.priorityBand === "P1_HIGH").length,
    p2Medium: prioritized.filter((item) => item.priorityBand === "P2_MEDIUM").length,
    p3Backlog: prioritized.filter((item) => item.priorityBand === "P3_BACKLOG").length,
  },
  items: prioritized,
};
const output = resolve("data/knowledge/official-curation-backlog.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", ...artifact.counts }, null, 2));
