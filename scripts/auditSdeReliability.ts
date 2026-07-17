import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildDataprev2026Profile3AppSeed } from "../src/config/concursos/dataprev-2026-perfil-3/index";
import { runDataprevDecisionForDate } from "../src/integrations/sde/dataprevDecisionAdapter";
import { auditStrategicActions } from "../src/core/sde/validation/decisionAudit";
import { buildSDEParameterCatalog } from "../src/core/sde/validation/parameterCatalog";
import { auditDailyStudyPrescription } from "../src/core/prescription/prescriptionAudit";
import packageMetadata from "../package.json";

const referenceDate = "2026-07-13";
const seed = buildDataprev2026Profile3AppSeed();
const snapshot = {
  configuracao: seed.configuracao,
  subassuntos: seed.subassuntos,
  tentativasQuestoes: [],
  sessoesEstudo: [],
  flashcards: [],
  cronogramasRevisao: []
};
const decision = runDataprevDecisionForDate(snapshot, referenceDate);
const actionAudit = auditStrategicActions(decision.actions);
const prescriptionAudit = decision.prescription
  ? auditDailyStudyPrescription(decision.prescription)
  : { valid: decision.status !== "SUCCESS", issues: decision.status === "SUCCESS"
      ? [{ code: "MISSING_PRESCRIPTION", message: "Decisão executável sem prescrição." }]
      : [] };
const parameters = buildSDEParameterCatalog();
const failures = [...actionAudit.issues, ...prescriptionAudit.issues];

const report = {
  schemaVersion: "1.0.0",
  projectVersion: packageMetadata.version,
  referenceDate,
  activeTarget: "DATAPREV 2026 — Analista de Tecnologia da Informação — Perfil 3",
  status: failures.length === 0 ? "PASS" : "FAIL",
  shadowMode: {
    historicalIncidenceEnabled: false,
    rule: "Historical incidence with UNAVAILABLE provenance must contribute zero to score and constitutional tier."
  },
  executableScenario: {
    decisionStatus: decision.status,
    actionCount: decision.actions.length,
    prescriptionStatus: decision.prescription?.status ?? null,
    currentPrescriptionId: decision.prescription?.current?.id ?? null,
    actionAudit,
    prescriptionAudit
  },
  parameterCatalog: {
    count: parameters.length,
    propertyTested: parameters.filter((item) => item.validationStatus === "PROPERTY_TESTED").length,
    scenarioTested: parameters.filter((item) => item.validationStatus === "SCENARIO_TESTED").length,
    pendingCalibration: parameters.filter((item) => item.validationStatus === "PENDING_CALIBRATION").length,
    entries: parameters
  },
  knownLimitations: [
    "Historical FGV incidence remains disabled until question-level extraction, definitive-answer linkage, deduplication and reviewed classification are validated.",
    "Global cutoff risk is not used to rank actions because no prospectively calibrated model exists yet.",
    "Expected causal points per hour remains unavailable until real before/after learning episodes are collected.",
    "The production runtime target is Node.js 24.x; local validation under another major version is informative but not runtime parity."
  ]
};

const output = resolve("data/quality/sde-reliability-report.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`SDE reliability audit PASS: ${decision.actions.length} action(s), ${parameters.length} parameter(s).`);
