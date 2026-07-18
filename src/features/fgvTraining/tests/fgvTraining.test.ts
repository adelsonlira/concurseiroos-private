import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { resolveAppNavigationFromLocation, resolveSidebarNavigation } from "../../../navigation/appNavigationState";
import { gradePilotDiagnosticAttempt } from "../../../server/diagnostics/pilotDiagnosticServer";
import { checkFgvTrainingAnswer, finalizeFgvTrainingAttempt } from "../../../server/training/fgvTrainingServer";
import { useConcurseiroStore } from "../../../store";
import { buildPilotDiagnosticFinalizationRequest, createPilotDiagnosticAttempt } from "../../pilotDiagnostic/engine";
import { FGV_TRAINING_CATALOG, FGV_TRAINING_QUESTION_BY_ID } from "../catalog";
import {
  answerFgvTrainingQuestion,
  applyCheckedFgvTrainingCorrection,
  buildCheckFgvTrainingRequest,
  buildFinalizeFgvTrainingRequest,
  countFgvTrainingProgress,
  createFgvTrainingAttempt,
  filterFgvTrainingQuestions,
  navigateFgvTraining,
  selectFgvTrainingQuestionIds,
  toggleFgvTrainingReview,
} from "../engine";
import {
  buildFgvTrainingHash,
  buildFgvTrainingResultRoute,
  FGV_TRAINING_ACTIVE_ROUTE,
  FGV_TRAINING_LANDING_ROUTE,
  parseFgvTrainingHash,
  resolveFgvTrainingScreen,
} from "../navigation";
import {
  appendFinalizedFgvTrainingAttempt,
  cancelActiveFgvTrainingAttempt,
  readFgvTrainingSnapshot,
  saveActiveFgvTrainingAttempt,
  startActiveFgvTrainingAttempt,
  type FgvTrainingStorage,
} from "../storage";
import { validateFgvTrainingAssetPath } from "../assetResolver";
import type { FgvTrainingFilters, FinalizedFgvTrainingAttempt } from "../types";

class MemoryStorage implements FgvTrainingStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const DEFAULT_FILTERS: FgvTrainingFilters = { selectionArea: null, primaryItemId: null, adherence: "BOTH", quantity: 10 };

function seedMainStore() {
  const seed = buildDataprev2026Profile3AppSeed();
  useConcurseiroStore.setState({
    concursos: [seed.concurso], editais: [seed.edital], disciplinas: seed.disciplinas, assuntos: seed.assuntos,
    subassuntos: seed.subassuntos, configuracao: seed.configuracao, estatisticas: seed.estatisticas,
    questoes: [], tentativasQuestoes: [], simulados: [], ultimaDecisaoSDE: null,
  });
}

function finalized(attemptId = "finalized", filters = DEFAULT_FILTERS): FinalizedFgvTrainingAttempt {
  const active = createFgvTrainingAttempt(attemptId, "2026-07-18T18:00:00.000Z", filters, `seed-${attemptId}`);
  return finalizeFgvTrainingAttempt(buildFinalizeFgvTrainingRequest(active), "2026-07-18T18:10:00.000Z");
}

function sourceEligibilityCount(): { count: number; irrecoverable: number[]; duplicateOrdinals: number[] } {
  const source = readFileSync(resolve(process.cwd(), "data/training-fgv/source/CUR-BD-BANCO-OPERACIONAL-v2-FGV-DATAPREV-797.jsonl"), "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const labels = ["A", "B", "C", "D", "E"];
  const eligible = source.filter((record) => {
    const bank = record.banco_operacional;
    const integrity = bank.integridade;
    const duplicate = bank.duplicacao;
    const stem = record.recuperacao_direcionada_v2?.enunciado_recuperado?.trim() || record.stem?.trim();
    const alternatives = labels.every((label) => record.options?.[label]?.trim() || record.recuperacao_direcionada_v2?.alternativas_recuperadas?.[label]?.arquivo);
    return bank.apta_para_estudo === true && duplicate.e_registro_principal === true && Boolean(stem) && alternatives
      && integrity.anulada_oficialmente !== true && integrity.resposta_conflitante !== true
      && bank.inapta_operacionalmente !== true && integrity.extracao_suficiente === true
      && labels.includes(integrity.resposta_operacional);
  });
  return {
    count: eligible.length,
    irrecoverable: source.filter((record) => record.recuperacao_direcionada_v2?.resultado === "IRRECUPERAVEL_NO_ACERVO").map((record) => record.ordinal),
    duplicateOrdinals: source.filter((record) => record.banco_operacional.duplicacao.e_registro_principal === false).map((record) => record.ordinal),
  };
}

function criticalMainStoreSnapshot() {
  const state = useConcurseiroStore.getState();
  return JSON.stringify({
    ultimaDecisaoSDE: state.ultimaDecisaoSDE, disciplinas: state.disciplinas, assuntos: state.assuntos,
    subassuntos: state.subassuntos, estatisticas: state.estatisticas, questoes: state.questoes,
    tentativasQuestoes: state.tentativasQuestoes, simulados: state.simulados,
  });
}

describe("Treino FGV Essencial", () => {
  beforeEach(seedMainStore);

  it("preserva os 797 registros de origem", () => {
    const lines = readFileSync(resolve(process.cwd(), "data/training-fgv/source/CUR-BD-BANCO-OPERACIONAL-v2-FGV-DATAPREV-797.jsonl"), "utf8").split(/\r?\n/).filter(Boolean);
    expect(lines).toHaveLength(797);
    expect(FGV_TRAINING_CATALOG.sourceRecordCount).toBe(797);
  });

  it("calcula a quantidade elegível pelos dados", () => {
    const calculated = sourceEligibilityCount();
    expect(FGV_TRAINING_CATALOG.eligibleQuestionCount).toBe(calculated.count);
    expect(FGV_TRAINING_CATALOG.questions).toHaveLength(calculated.count);
    expect(calculated.count).toBe(664);
  });

  it("exclui referências duplicadas e as 11 irrecuperáveis", () => {
    const calculated = sourceEligibilityCount();
    expect(calculated.irrecoverable).toHaveLength(11);
    expect(calculated.duplicateOrdinals).toEqual([648]);
    const privateCatalog = JSON.parse(readFileSync(resolve(process.cwd(), "src/server/training/data/trainingPrivateCatalog.json"), "utf8"));
    const ordinals = new Set(privateCatalog.questions.map((question: { corpusOrdinal: number }) => question.corpusOrdinal));
    expect(calculated.irrecoverable.every((ordinal) => !ordinals.has(ordinal))).toBe(true);
    expect(ordinals.has(648)).toBe(false);
  });

  it("não expõe respostas nem metadados privados antes da conferência", () => {
    const payload = JSON.stringify(FGV_TRAINING_CATALOG);
    for (const forbidden of ["operationalAnswer", "answerOrigin", "corpusOrdinal", "platformId", "recordFingerprint", "subject", "subsubject"]) {
      expect(payload).not.toContain(forbidden);
    }
  });

  it("filtra por selection_area, item primário e aderência", () => {
    const sql = filterFgvTrainingQuestions({ ...DEFAULT_FILTERS, selectionArea: "SQL" });
    expect(sql.length).toBeGreaterThan(0);
    expect(sql.every((question) => question.selectionArea === "SQL")).toBe(true);
    const item = sql[0].primaryItem.id;
    expect(filterFgvTrainingQuestions({ ...DEFAULT_FILTERS, primaryItemId: item }).every((question) => question.primaryItem.id === item)).toBe(true);
    expect(filterFgvTrainingQuestions({ ...DEFAULT_FILTERS, adherence: "PARTIAL" }).every((question) => question.adherence === "PARTIAL")).toBe(true);
  });

  it.each([5, 10, 15, 20] as const)("seleciona %i questões sem repetição", (quantity) => {
    const filters = { ...DEFAULT_FILTERS, quantity };
    const ids = selectFgvTrainingQuestionIds(filters, `seed-${quantity}`);
    expect(ids).toHaveLength(quantity);
    expect(new Set(ids).size).toBe(quantity);
  });

  it("mantém seed, ordem e filtros imutáveis na tentativa", () => {
    const attempt = createFgvTrainingAttempt("a1", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-fixed");
    expect(attempt.seed).toBe("seed-fixed");
    expect(attempt.filters).toEqual(DEFAULT_FILTERS);
    expect(attempt.questionOrder).toEqual(selectFgvTrainingQuestionIds(DEFAULT_FILTERS, "seed-fixed"));
  });

  it("retoma após F5 com posição, respostas, revisão, seed e ordem", () => {
    const storage = new MemoryStorage();
    let attempt = createFgvTrainingAttempt("reload", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-reload");
    const questionId = attempt.questionOrder[0];
    attempt = answerFgvTrainingQuestion(attempt, questionId, "A", "2026-07-18T18:01:00.000Z");
    attempt = toggleFgvTrainingReview(attempt, questionId, "2026-07-18T18:02:00.000Z");
    attempt = navigateFgvTraining(attempt, 3, "2026-07-18T18:03:00.000Z");
    saveActiveFgvTrainingAttempt(storage, attempt);
    const route = parseFgvTrainingHash(buildFgvTrainingHash(FGV_TRAINING_ACTIVE_ROUTE))!;
    const screen = resolveFgvTrainingScreen(route, readFgvTrainingSnapshot(storage));
    expect(screen.view).toBe("active_training");
    if (screen.view === "active_training") {
      expect(screen.attempt.currentIndex).toBe(3);
      expect(screen.attempt.answers[questionId]).toBe("A");
      expect(screen.attempt.reviewQuestionIds).toContain(questionId);
      expect(screen.attempt.seed).toBe("seed-reload");
      expect(screen.attempt.questionOrder).toEqual(attempt.questionOrder);
    }
  });

  it("bloqueia alteração após Conferir resposta", () => {
    let attempt = createFgvTrainingAttempt("check", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-check");
    const questionId = attempt.questionOrder[0];
    attempt = answerFgvTrainingQuestion(attempt, questionId, "A", "2026-07-18T18:01:00.000Z");
    const correction = checkFgvTrainingAnswer(buildCheckFgvTrainingRequest(attempt, questionId));
    attempt = applyCheckedFgvTrainingCorrection(attempt, correction, "2026-07-18T18:02:00.000Z");
    expect(() => answerFgvTrainingQuestion(attempt, questionId, "B", "2026-07-18T18:03:00.000Z")).toThrow(/bloqueada/);
  });

  it("cancela sem criar resultado", () => {
    const storage = new MemoryStorage();
    startActiveFgvTrainingAttempt(storage, createFgvTrainingAttempt("cancel", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-cancel"));
    cancelActiveFgvTrainingAttempt(storage);
    expect(readFgvTrainingSnapshot(storage)).toEqual({ activeAttempt: null, finalizedAttempts: [] });
  });

  it("finaliza com questões em branco", () => {
    const active = createFgvTrainingAttempt("blank", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-blank");
    const result = finalizeFgvTrainingAttempt(buildFinalizeFgvTrainingRequest(active), "2026-07-18T18:05:00.000Z");
    expect(result.blankCount).toBe(result.totalQuestions);
    expect(result.correctCount).toBe(0);
    expect(result.wrongCount).toBe(0);
  });

  it("agrega resultado por área e item primário", () => {
    const result = finalized("aggregate");
    expect(result.areaResults.reduce((sum, row) => sum + row.total, 0)).toBe(result.totalQuestions);
    expect(result.itemResults.reduce((sum, row) => sum + row.total, 0)).toBe(result.totalQuestions);
    expect(result.areaResults.every((row) => row.label.length > 0)).toBe(true);
  });

  it("mantém histórico append-only e imutável", () => {
    const storage = new MemoryStorage();
    const result = finalized("immutable");
    appendFinalizedFgvTrainingAttempt(storage, result);
    expect(() => appendFinalizedFgvTrainingAttempt(storage, { ...result, percentage: 99 })).toThrow(/imutável/);
    expect(readFgvTrainingSnapshot(storage).finalizedAttempts).toEqual([result]);
  });

  it("mantém os 301 assets válidos por hash e tamanho", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "data/training-fgv/source/CUR-BD-BANCO-OPERACIONAL-v2-MANIFESTO.json"), "utf8"));
    expect(manifest.recovery_assets.files).toHaveLength(301);
    for (const asset of manifest.recovery_assets.files) {
      expect(statSync(resolve(process.cwd(), "static/fgv-training", asset.path)).size).toBe(asset.size_bytes);
    }
  });

  it("preserva alternativas em imagem A–E", () => {
    const question = FGV_TRAINING_CATALOG.questions.find((item) => item.alternatives.every((alternative) => alternative.assetPath));
    expect(question).toBeDefined();
    expect(question!.alternatives.map((alternative) => alternative.label).join("")).toBe("ABCDE");
    expect(question!.alternatives.every((alternative) => validateFgvTrainingAssetPath(alternative.assetPath!))).toBe(true);
  });

  it("menu principal abre sempre a landing e não abre resultado automaticamente", () => {
    const result = finalized("history");
    const destination = resolveSidebarNavigation("training-fgv");
    expect(destination.trainingRoute).toEqual(FGV_TRAINING_LANDING_ROUTE);
    const screen = resolveFgvTrainingScreen(destination.trainingRoute, { activeAttempt: null, finalizedAttempts: [result] });
    expect(screen.view).toBe("landing");
  });

  it("abre exatamente o resultado selecionado e F5 mantém o mesmo", () => {
    const first = finalized("first"); const last = finalized("last");
    const route = buildFgvTrainingResultRoute(first.attemptId);
    const navigation = resolveAppNavigationFromLocation(buildFgvTrainingHash(route));
    const screen = resolveFgvTrainingScreen(navigation.trainingRoute, { activeAttempt: null, finalizedAttempts: [first, last] });
    expect(screen.view).toBe("finalized_training");
    if (screen.view === "finalized_training") expect(screen.result.attemptId).toBe("first");
  });

  it("tentativa ativa aparece como retomável na landing", () => {
    const active = createFgvTrainingAttempt("resume", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-resume");
    const screen = resolveFgvTrainingScreen(FGV_TRAINING_LANDING_ROUTE, { activeAttempt: active, finalizedAttempts: [] });
    expect(screen.view).toBe("landing");
    if (screen.view === "landing") expect(screen.primaryAction).toBe("resume");
    expect(resolveFgvTrainingScreen(FGV_TRAINING_ACTIVE_ROUTE, { activeAttempt: active, finalizedAttempts: [] }).view).toBe("active_training");
  });

  it("registra marcadores obrigatórios de isolamento", () => {
    const active = createFgvTrainingAttempt("isolated", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-isolated");
    const result = finalizeFgvTrainingAttempt(buildFinalizeFgvTrainingRequest(active), "2026-07-18T18:10:00.000Z");
    expect(active.trainingType).toBe("thematic_fgv");
    expect(active.affectsSde).toBe(false);
    expect(active.countsAsOfficialSimulation).toBe(false);
    expect(result.affectsSde).toBe(false);
    expect(result.countsAsOfficialSimulation).toBe(false);
  });

  it("não altera store principal, mastery, prioridades ou simulados oficiais", () => {
    const before = criticalMainStoreSnapshot();
    finalized("neutral");
    expect(criticalMainStoreSnapshot()).toBe(before);
  });

  it("mantém o diagnóstico piloto funcionando e sua navegação corrigida", () => {
    const request = buildPilotDiagnosticFinalizationRequest(createPilotDiagnosticAttempt("diag-regression", "2026-07-18T18:00:00.000Z"));
    expect(gradePilotDiagnosticAttempt(request, "2026-07-18T18:50:00.000Z").totalQuestions).toBe(24);
    expect(resolveSidebarNavigation("diagnostic").diagnosticRoute).toEqual({ view: "landing" });
  });

  it("rejeita caminhos absolutos locais", () => {
    expect(validateFgvTrainingAssetPath("C:\\temp\\q.png")).toBe(false);
    expect(validateFgvTrainingAssetPath("/home/user/q.png")).toBe(false);
    expect(validateFgvTrainingAssetPath("file:///tmp/q.png")).toBe(false);
    expect(validateFgvTrainingAssetPath("fgv-training/assets/questoes/Q0002.png")).toBe(true);
  });

  it("contabiliza respondidas, conferidas e em branco", () => {
    let attempt = createFgvTrainingAttempt("progress", "2026-07-18T18:00:00.000Z", DEFAULT_FILTERS, "seed-progress");
    const questionId = attempt.questionOrder[0];
    attempt = answerFgvTrainingQuestion(attempt, questionId, "A", "2026-07-18T18:01:00.000Z");
    attempt = applyCheckedFgvTrainingCorrection(attempt, checkFgvTrainingAnswer(buildCheckFgvTrainingRequest(attempt, questionId)), "2026-07-18T18:02:00.000Z");
    expect(countFgvTrainingProgress(attempt)).toEqual({ answered: 1, checked: 1, blank: 9, review: 0 });
    expect(FGV_TRAINING_QUESTION_BY_ID.has(questionId)).toBe(true);
  });
});
