import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { proposeRuleBasedClassification } from "../src/core/classification";

interface QuestionRecord {
  id: string;
  excerpt: string;
  page: number | null;
  contestId: string;
  bookletLabel: string;
  source: { documentId: string };
  extraction: { status: string };
  deduplication: { canonicalQuestionId: string };
}

const input = resolve("data/knowledge/official-question-corpus.ndjson");
const output = resolve("data/knowledge/question-classification-proposals.ndjson");
const summaryOutput = resolve("data/knowledge/question-classification-proposals-summary.json");
mkdirSync(dirname(output), { recursive: true });
const proposals: string[] = [];
let processed = 0;
let skippedDuplicates = 0;
const byTarget: Record<string, number> = {};

const reader = createInterface({ input: createReadStream(input, "utf8"), crlfDelay: Infinity });
for await (const line of reader) {
  if (!line.trim()) continue;
  const question = JSON.parse(line) as QuestionRecord;
  processed += 1;
  if (question.deduplication.canonicalQuestionId !== question.id) {
    skippedDuplicates += 1;
    continue;
  }
  const proposal = proposeRuleBasedClassification({
    questionId: question.id,
    text: `${question.bookletLabel ?? ""}\n${question.excerpt ?? ""}`,
    evidenceSourceId: question.source.documentId,
    evidencePage: question.page,
  });
  if (!proposal) continue;
  proposals.push(JSON.stringify(proposal));
  byTarget[proposal.targetTaxonomyNodeId!] = (byTarget[proposal.targetTaxonomyNodeId!] ?? 0) + 1;
}

proposals.sort();
writeFileSync(output, `${proposals.join("\n")}${proposals.length ? "\n" : ""}`, "utf8");
const summary = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-07-16T10:27:00-03:00",
  shadowMode: true,
  processedQuestions: processed,
  skippedNonCanonicalDuplicates: skippedDuplicates,
  proposedClassifications: proposals.length,
  humanApprovedClassifications: 0,
  incidenceEligibleClassifications: 0,
  policy: "Rule-based proposals support the curation queue only. They do not define source taxonomy, target equivalence or SDE incidence.",
  byTarget,
};
writeFileSync(summaryOutput, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", ...summary }, null, 2));
