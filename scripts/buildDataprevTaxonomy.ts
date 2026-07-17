import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DATAPREV_2026_PROFILE_3_PACKAGE } from "../src/config/concursos/dataprev-2026-perfil-3/officialData";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../src/config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";
import { buildCanonicalTaxonomy, calculateTaxonomyCoverage } from "../src/core/taxonomy";

const generatedAt = "2026-07-16T10:27:00-03:00";
const taxonomy = buildCanonicalTaxonomy({
  competition: DATAPREV_2026_PROFILE_3_PACKAGE,
  generatedAt,
});
const coverage = calculateTaxonomyCoverage({
  taxonomy,
  materials: DATAPREV_2026_PRIVATE_STUDY_MATERIALS,
  questionEvidenceBySubtopic: {},
  humanReviewedQuestionEvidenceBySubtopic: {},
});

const artifact = {
  ...taxonomy,
  coverage,
  policy: {
    officialTaxonomyDefinesScope: true,
    pedagogicalMaterialsMayRouteStudy: true,
    pedagogicalMaterialsMayChangePriority: false,
    historicalQuestionsMayChangePriority: false,
    reason: "Question classification and target equivalence remain under human-review gates.",
  },
};

const output = resolve("data/knowledge/dataprev-2026-taxonomy.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: "PASS",
  nodes: taxonomy.nodes.length,
  subtopics: coverage.totalSubtopics,
  materialOnly: coverage.materialOnly,
  gaps: coverage.gaps,
  shadowMode: taxonomy.shadowMode,
}, null, 2));
