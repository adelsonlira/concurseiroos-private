import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DATAPREV_2026_PROFILE_3_PACKAGE } from "../src/config/concursos/dataprev-2026-perfil-3/officialData";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../src/config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";
import { getDefaultCompetitionRuntimeDefinition } from "../src/config/concursos/registry";
import { auditPedagogicalRouting } from "../src/core/materials/pedagogicalRoutingAudit";
import { buildCanonicalTaxonomy } from "../src/core/taxonomy";

const generatedAt = new Date().toISOString();
const taxonomy = buildCanonicalTaxonomy({
  competition: DATAPREV_2026_PROFILE_3_PACKAGE,
  generatedAt
});
const runtime = getDefaultCompetitionRuntimeDefinition();
const report = auditPedagogicalRouting({
  taxonomy,
  materials: DATAPREV_2026_PRIVATE_STUDY_MATERIALS,
  externalQuestionBanks: runtime.externalQuestionBanks,
  generatedAt
});

const output = resolve("data/quality/pedagogical-routing-report.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.status, ...report.counts }, null, 2));
if (report.status !== "PASS") process.exit(1);
