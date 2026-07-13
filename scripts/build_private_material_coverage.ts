import fs from "node:fs";
import path from "node:path";
import { DATAPREV_2026_PROFILE_3_PACKAGE } from "../src/config/concursos/dataprev-2026-perfil-3/officialData";
import catalog from "../data/evidence/dataprev-2026-perfil-3/private-study-materials/strategy-private-material-catalog.json";

const outputDir = path.resolve(
  "data/evidence/dataprev-2026-perfil-3/private-study-materials"
);
const materials = catalog.materials;
const names = DATAPREV_2026_PROFILE_3_PACKAGE.sde.names;
const subtopics = DATAPREV_2026_PROFILE_3_PACKAGE.sde.subassuntos;
const subtopicToTopic = DATAPREV_2026_PROFILE_3_PACKAGE.sde.subassuntoToAssunto;
const topicToDiscipline = DATAPREV_2026_PROFILE_3_PACKAGE.sde.assuntoToDisciplina;

const rows = subtopics.map((subtopic) => {
  const sections = materials.flatMap((material) =>
    material.sections
      .filter((section) => section.subtopicIds.includes(subtopic.id))
      .map((section) => ({ material, section }))
  );
  const topicId = subtopicToTopic[subtopic.id];
  const disciplineId = topicToDiscipline[topicId];
  const kinds = Object.fromEntries(
    ["THEORY", "SUMMARY", "MIND_MAP", "COMMENTED_QUESTIONS", "QUESTION_LIST", "SIMULATION", "REFERENCE"]
      .map((kind) => [kind, sections.filter(({ section }) => section.contentKind === kind).length])
  );
  return {
    disciplineId,
    disciplineName: names.disciplinas[disciplineId],
    topicId,
    topicName: names.assuntos[topicId],
    subtopicId: subtopic.id,
    subtopicName: names.subassuntos[subtopic.id],
    materialCount: new Set(sections.map(({ material }) => material.id)).size,
    sectionCount: sections.length,
    highConfidenceSectionCount: sections.filter(({ section }) => section.mappingStatus === "AUTO_HIGH_CONFIDENCE").length,
    reviewableSectionCount: sections.filter(({ section }) => section.mappingStatus === "AUTO_REVIEWABLE").length,
    theorySections: kinds.THEORY,
    summarySections: kinds.SUMMARY,
    mindMapSections: kinds.MIND_MAP,
    commentedQuestionSections: kinds.COMMENTED_QUESTIONS,
    questionListSections: kinds.QUESTION_LIST,
    simulationSections: kinds.SIMULATION,
    referenceSections: kinds.REFERENCE,
    coverageStatus: sections.length === 0 ? "NO_MATERIAL_LOCATED" : "MATERIAL_LOCATED"
  };
});

const summary = {
  schemaVersion: "1.0.0",
  concursoId: DATAPREV_2026_PROFILE_3_PACKAGE.id,
  officialSubtopicCount: rows.length,
  coveredSubtopicCount: rows.filter((row) => row.sectionCount > 0).length,
  uncoveredSubtopicCount: rows.filter((row) => row.sectionCount === 0).length,
  coveredWithTheoryCount: rows.filter((row) => row.theorySections > 0).length,
  coveredWithQuestionPracticeCount: rows.filter(
    (row) => row.commentedQuestionSections + row.questionListSections + row.simulationSections > 0
  ).length,
  limitations: [
    "Coverage means that a metadata section was located, not that the material is complete or correct.",
    "Course emphasis and page count do not change strategic priority or historical incidence.",
    "Mappings marked reviewable remain hypotheses until manual inspection during actual study."
  ],
  uncoveredSubtopics: rows
    .filter((row) => row.sectionCount === 0)
    .map((row) => ({
      disciplineId: row.disciplineId,
      disciplineName: row.disciplineName,
      topicId: row.topicId,
      topicName: row.topicName,
      subtopicId: row.subtopicId,
      subtopicName: row.subtopicName
    }))
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "private-material-coverage.json"),
  `${JSON.stringify({ summary, rows }, null, 2)}\n`
);
const headers = Object.keys(rows[0]);
const escape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
fs.writeFileSync(
  path.join(outputDir, "private-material-coverage.csv"),
  [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(","))].join("\n") + "\n"
);
console.log(JSON.stringify(summary, null, 2));
