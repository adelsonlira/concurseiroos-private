import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'knowledge');
const read = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const documents = read('documentos.json');
const contests = read('concursos.json');
const declaredDuplicates = read('duplicatas.json');
const officialCorpusQuality = read('official-corpus-quality.json');

const errors = [];
const ids = new Set();
const hashes = new Map();
for (const doc of documents) {
  if (ids.has(doc.document_id)) errors.push(`duplicate document_id:${doc.document_id}`);
  ids.add(doc.document_id);
  if (!/^[a-f0-9]{64}$/.test(doc.sha256)) errors.push(`invalid sha256:${doc.document_id}`);
  if (!Number.isInteger(doc.size_bytes) || doc.size_bytes <= 0) errors.push(`invalid size:${doc.document_id}`);
  if (hashes.has(doc.sha256)) errors.push(`duplicate canonical hash:${hashes.get(doc.sha256)}/${doc.document_id}`);
  hashes.set(doc.sha256, doc.document_id);
}

const grouped = Object.groupBy(documents, doc => doc.contest_id);
const links = [];
for (const [contestId, group] of Object.entries(grouped)) {
  const notices = group.filter(doc => doc.document_type === 'edital');
  const exams = group.filter(doc => doc.document_type === 'prova');
  const keys = group.filter(doc => doc.document_type === 'gabarito');
  const finalKeys = keys.filter(doc => doc.gabarito_status === 'definitivo');
  for (const exam of exams) {
    const score = notices.length && finalKeys.length ? 0.95 : notices.length || keys.length ? 0.65 : 0.25;
    links.push({
      id: `${contestId}:${exam.document_id}`,
      contestId,
      examDocumentId: exam.document_id,
      noticeDocumentIds: notices.map(doc => doc.document_id),
      answerKeyDocumentIds: keys.map(doc => doc.document_id),
      confidence: { score, status: score >= .9 ? 'CONFIRMED' : score >= .5 ? 'INFERRED' : 'INSUFFICIENT' },
      incidenceEligible: Boolean(exam.usable_for_incidence_analysis && notices.length && finalKeys.length),
      shadowMode: true,
    });
  }
}

const summary = {
  schemaVersion: '1.0.0', generatedAt: new Date().toISOString(), shadowMode: true,
  counts: {
    documents: documents.length, contests: contests.length, declaredLogicalDuplicates: declaredDuplicates.length,
    links: links.length, incidenceEligibleLinks: links.filter(link => link.incidenceEligible).length,
    confirmedLinks: links.filter(link => link.confidence.status === 'CONFIRMED').length,
    inferredLinks: links.filter(link => link.confidence.status === 'INFERRED').length,
    insufficientLinks: links.filter(link => link.confidence.status === 'INSUFFICIENT').length,
  },
  integrity: { valid: errors.length === 0, errors },
  questionCorpus: {
    extractedQuestions: officialCorpusQuality.counts.questionsExtracted,
    canonicalQuestions: officialCorpusQuality.counts.uniqueCanonicalQuestions,
    definitiveAnswerLinks: officialCorpusQuality.counts.questionsLinkedToDefinitiveAnswerKey,
    reviewQueueItems: officialCorpusQuality.counts.reviewQueueItems,
    status: 'EXTRACTED_SHADOW_REVIEW_REQUIRED',
    eligibleForSDEHistoricalIncidence: false,
  },
  policy: 'Historical incidence is not connected to the SDE. Document links are package-level evidence only.',
};
const stable = JSON.stringify({ documents, contests, declaredDuplicates, links, officialCorpusQuality });
summary.catalogSha256 = crypto.createHash('sha256').update(stable).digest('hex');
fs.writeFileSync(path.join(dataDir, 'audit-links.json'), JSON.stringify(links, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'quality-report.json'), JSON.stringify(summary, null, 2) + '\n');
if (errors.length) process.exitCode = 1;
console.log(JSON.stringify(summary, null, 2));
