#!/usr/bin/env bash
set -euo pipefail

run() {
  local label="$1"
  shift
  printf '\n[validate] %s\n' "$label"
  "$@"
}

run validate:memory node scripts/validateAiMemory.mjs
run diagnostic:audit node scripts/validatePilotDiagnostic.mjs
run training:build node scripts/buildFgvTrainingCatalog.mjs
run training:audit node scripts/validateFgvTrainingCatalog.mjs
run knowledge:validate-official node scripts/validateOfficialFgvCorpus.mjs
run knowledge:build node scripts/buildKnowledgeCatalog.mjs
run knowledge:build-taxonomy ./node_modules/.bin/tsx scripts/buildDataprevTaxonomy.ts
run knowledge:build-curation ./node_modules/.bin/tsx scripts/buildCurationBacklog.ts
run knowledge:build-classification ./node_modules/.bin/tsx scripts/buildQuestionClassificationProposals.ts
run knowledge:build-routing ./node_modules/.bin/tsx scripts/buildPedagogicalRoutingReport.ts
run learning:audit-error-recovery ./node_modules/.bin/tsx scripts/auditErrorRecoveryContract.ts
run simulation:audit ./node_modules/.bin/tsx scripts/auditSimulationContract.ts
run sde:v2-audit ./node_modules/.bin/tsx scripts/auditSdeV2.ts
run sde:audit ./node_modules/.bin/tsx scripts/auditSdeReliability.ts
run readiness:audit ./node_modules/.bin/tsx scripts/buildProductReadinessReport.ts
run typecheck ./node_modules/.bin/tsc --noEmit
printf '\n[validate] test:run\n'
exec ./node_modules/.bin/vitest run --maxWorkers=2
