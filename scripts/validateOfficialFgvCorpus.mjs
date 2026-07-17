import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'knowledge');
const readJson = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const manifests = readJson('official-exam-manifest.json');
const sections = readJson('official-answer-key-sections.json');
const reviewQueue = readJson('official-review-queue.json');
const quality = readJson('official-corpus-quality.json');
const errors = [];

const unique = (records, field, label) => {
  const seen = new Set();
  for (const record of records) {
    const value = record[field];
    if (seen.has(value)) errors.push(`duplicate ${label}:${value}`);
    seen.add(value);
  }
  return seen;
};

const examIds = unique(manifests, 'examDocumentId', 'examDocumentId');
const sectionIds = unique(sections, 'id', 'answerKeySectionId');
unique(reviewQueue, 'id', 'reviewQueueId');

for (const exam of manifests) {
  if (!/^[a-f0-9]{64}$/.test(exam.sourceSha256)) errors.push(`invalid exam source hash:${exam.examDocumentId}`);
  if (exam.shadowMode !== true || exam.incidenceEligible !== false) errors.push(`exam escaped shadow mode:${exam.examDocumentId}`);
  if (!exam.sourceVerified) errors.push(`unverified source:${exam.examDocumentId}`);
  if (exam.examKind === 'DISCURSIVE_ONLY' && exam.extractionStatus !== 'EXCLUDED_DISCURSIVE_ONLY') {
    errors.push(`discursive exam not excluded:${exam.examDocumentId}`);
  }
  if (exam.answerKeyLink?.sectionId && !sectionIds.has(exam.answerKeyLink.sectionId)) {
    errors.push(`missing linked answer-key section:${exam.examDocumentId}`);
  }
}

for (const section of sections) {
  if (!/^[a-f0-9]{64}$/.test(section.source.sha256)) errors.push(`invalid answer-key source hash:${section.id}`);
  if (section.questionCount !== Object.keys(section.answers).length) errors.push(`answer count mismatch:${section.id}`);
  const numbers = Object.keys(section.answers).map(Number).sort((a, b) => a - b);
  if (numbers.length > 0 && (numbers[0] !== 1 || numbers.at(-1) !== numbers.length)) {
    errors.push(`non-contiguous answer-key section:${section.id}`);
  }
  for (const answer of Object.values(section.answers)) {
    if (!['A', 'B', 'C', 'D', 'E', '*'].includes(answer)) errors.push(`invalid answer:${section.id}:${answer}`);
  }
}

const questions = [];
const questionIds = new Set();
const questionsByExam = new Map();
const corpusPath = path.join(dataDir, 'official-question-corpus.ndjson');
const input = fs.createReadStream(corpusPath, 'utf8');
const reader = readline.createInterface({ input, crlfDelay: Infinity });
for await (const line of reader) {
  if (!line.trim()) continue;
  const question = JSON.parse(line);
  questions.push(question);
  if (questionIds.has(question.id)) errors.push(`duplicate question id:${question.id}`);
  questionIds.add(question.id);
  if (!examIds.has(question.examDocumentId)) errors.push(`unknown exam for question:${question.id}`);
  if (!/^[a-f0-9]{64}$/.test(question.contentFingerprint)) errors.push(`invalid question fingerprint:${question.id}`);
  if (!/^[a-f0-9]{64}$/.test(question.source.sha256)) errors.push(`invalid question source hash:${question.id}`);
  if (question.shadowMode !== true || question.incidenceEligible !== false) errors.push(`question escaped shadow mode:${question.id}`);
  if (typeof question.excerpt !== 'string' || Array.from(question.excerpt).length > 280) errors.push(`invalid excerpt:${question.id}`);
  if ('statement' in question || 'alternatives' in question) errors.push(`full question content embedded:${question.id}`);
  if (question.answerKey.status === 'AUTO_LINKED_HIGH_CONFIDENCE') {
    if (!['A', 'B', 'C', 'D', 'E', '*'].includes(question.answerKey.answer)) errors.push(`invalid linked answer:${question.id}`);
    if (!sectionIds.has(question.answerKey.sectionId)) errors.push(`unknown answer section:${question.id}`);
  }
  const group = questionsByExam.get(question.examDocumentId) ?? [];
  group.push(question);
  questionsByExam.set(question.examDocumentId, group);
}

for (const exam of manifests) {
  const records = questionsByExam.get(exam.examDocumentId) ?? [];
  if ((exam.extractedQuestionCount ?? 0) !== records.length) errors.push(`manifest question count mismatch:${exam.examDocumentId}`);
  if (exam.sequenceComplete) {
    const numbers = records.map(record => record.questionNumber).sort((a, b) => a - b);
    if (numbers.length === 0 || numbers[0] !== 1 || numbers.at(-1) !== numbers.length) {
      errors.push(`non-contiguous complete exam:${exam.examDocumentId}`);
    }
  }
}

for (const question of questions) {
  if (!questionIds.has(question.deduplication.canonicalQuestionId)) {
    errors.push(`missing canonical question:${question.id}`);
  }
}

const dataprevDevelopment = manifests.find(exam =>
  exam.contestId === 'dataprev_2024' && exam.organizedPath.includes('desenvolvimento-de-software')
);
if (!dataprevDevelopment) {
  errors.push('missing DATAPREV 2024 development reference exam');
} else {
  const referenceQuestions = questionsByExam.get(dataprevDevelopment.examDocumentId) ?? [];
  if (referenceQuestions.length !== 70) errors.push(`DATAPREV reference count:${referenceQuestions.length}`);
  if (dataprevDevelopment.answerKeyLink?.status !== 'AUTO_LINKED_HIGH_CONFIDENCE') {
    errors.push('DATAPREV reference answer key is not high-confidence linked');
  }
  if (referenceQuestions.some(question => question.answerKey.answerKeyStatus !== 'definitivo')) {
    errors.push('DATAPREV reference contains non-definitive answer links');
  }
  const question13 = referenceQuestions.find(question => question.questionNumber === 13);
  if (!question13?.answerKey.annulled) errors.push('DATAPREV reference question 13 annulment was not preserved');
}

const expectedCounts = quality.counts;
if (expectedCounts.questionsExtracted !== questions.length) errors.push('quality question count mismatch');
if (expectedCounts.catalogExamDocuments !== manifests.length) errors.push('quality exam count mismatch');
if (expectedCounts.answerKeySectionsParsed !== sections.length) errors.push('quality key-section count mismatch');
if (quality.shadowMode !== true || quality.eligibleForSDEHistoricalIncidence !== false) {
  errors.push('quality report escaped shadow-mode policy');
}
if (!quality.sourceIntegrity?.valid) errors.push('source integrity is not valid');

const serializedPaths = [
  fs.readFileSync(path.join(dataDir, 'official-exam-manifest.json'), 'utf8'),
  fs.readFileSync(path.join(dataDir, 'official-answer-key-sections.json'), 'utf8'),
  fs.readFileSync(path.join(dataDir, 'official-review-queue.json'), 'utf8'),
  fs.readFileSync(path.join(dataDir, 'official-corpus-quality.json'), 'utf8'),
];
if (serializedPaths.some(content => content.includes('/mnt/data/') || content.includes('\\mnt\\data\\'))) {
  errors.push('generated canonical data contains a machine-specific absolute path');
}

const corpusSha256 = crypto.createHash('sha256').update(fs.readFileSync(corpusPath)).digest('hex');
const result = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  exams: manifests.length,
  questions: questions.length,
  answerKeySections: sections.length,
  reviewQueueItems: reviewQueue.length,
  corpusSha256,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
