import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3";
import { useConcurseiroStore } from "../../../store";
import {
  gradePilotDiagnosticAttempt,
  validateInternalPilotDiagnosticCatalog,
} from "../../../server/diagnostics/pilotDiagnosticServer";
import { PILOT_DIAGNOSTIC_ASSET_URLS } from "../assetRegistry";
import { PILOT_DIAGNOSTIC_CATALOG } from "../catalog";
import {
  answerPilotDiagnosticQuestion,
  buildPilotDiagnosticFinalizationRequest,
  createPilotDiagnosticAttempt,
  navigatePilotDiagnostic,
} from "../engine";
import {
  appendFinalizedPilotDiagnosticAttempt,
  cancelActivePilotDiagnosticAttempt,
  readPilotDiagnosticSnapshot,
  saveActivePilotDiagnosticAttempt,
  startActivePilotDiagnosticAttempt,
  type DiagnosticStorage,
} from "../storage";
import type { DiagnosticOptionLabel, FinalizePilotDiagnosticRequest } from "../types";

class MemoryStorage implements DiagnosticStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function blankRequest(attemptId = "attempt-1"): FinalizePilotDiagnosticRequest {
  const attempt = createPilotDiagnosticAttempt(attemptId, "2026-07-18T15:00:00.000Z");
  return buildPilotDiagnosticFinalizationRequest(attempt);
}

function seedMainStore() {
  const seed = buildDataprev2026Profile3AppSeed();
  useConcurseiroStore.setState({
    concursos: [seed.concurso],
    editais: [seed.edital],
    disciplinas: seed.disciplinas,
    assuntos: seed.assuntos,
    subassuntos: seed.subassuntos,
    configuracao: seed.configuracao,
    estatisticas: seed.estatisticas,
    questoes: [],
    tentativasQuestoes: [],
    simulados: [],
    ultimaDecisaoSDE: null,
  });
}

describe("diagnóstico piloto FGV-DATAPREV — Banco de Dados", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T15:50:00.000Z"));
    seedMainStore();
  });

  it("carrega exatamente 24 questões", () => {
    expect(PILOT_DIAGNOSTIC_CATALOG.questionCount).toBe(24);
    expect(PILOT_DIAGNOSTIC_CATALOG.questions).toHaveLength(24);
  });

  it("preserva a ordem fixa de 1 a 24", () => {
    expect(PILOT_DIAGNOSTIC_CATALOG.questions.map((question) => question.position)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    );
    expect(PILOT_DIAGNOSTIC_CATALOG.fixedOrder).toBe(true);
  });

  it("mantém os seis assets relativos disponíveis", () => {
    expect(Object.keys(PILOT_DIAGNOSTIC_ASSET_URLS)).toHaveLength(6);
    for (const assetKey of Object.keys(PILOT_DIAGNOSTIC_ASSET_URLS)) {
      expect(assetKey).toMatch(/^assets\/[a-z0-9-]+\.png$/);
      const source = resolve(process.cwd(), "src/features/pilotDiagnostic", assetKey);
      expect(statSync(source).size).toBeGreaterThan(0);
    }
  });

  it("não expõe resposta nem metadados internos antes da finalização", () => {
    const publicPayload = JSON.stringify(PILOT_DIAGNOSTIC_CATALOG);
    for (const forbidden of [
      "answer_key", "operationalAnswer", "traceability", "corpus_ordinal", "platform_id",
      "answer_origin", "subject", "subsubject", "primary_edital_item", "principal_record",
    ]) {
      expect(publicPayload).not.toContain(forbidden);
    }
  });

  it("cancela a tentativa ativa sem gerar resultado", () => {
    const storage = new MemoryStorage();
    const active = createPilotDiagnosticAttempt("cancel-me", "2026-07-18T15:00:00.000Z");
    saveActivePilotDiagnosticAttempt(storage, active);
    cancelActivePilotDiagnosticAttempt(storage);
    expect(readPilotDiagnosticSnapshot(storage)).toEqual({ activeAttempt: null, finalizedAttempts: [] });
  });

  it("registra questões em branco separadamente", () => {
    const request = blankRequest();
    request.answers[0].selectedAnswer = "D";
    const result = gradePilotDiagnosticAttempt(request, "2026-07-18T15:50:00.000Z");
    expect(result.blankCount).toBe(23);
    expect(result.blankQuestionIds).toHaveLength(23);
    expect(result.wrongCount + result.correctCount).toBe(1);
    expect(result.answers.filter((answer) => answer.selectedAnswer === null)).toHaveLength(23);
  });

  it("agrega o relatório exclusivamente por selection_area", () => {
    const result = gradePilotDiagnosticAttempt(blankRequest(), "2026-07-18T15:50:00.000Z");
    const names = result.areaResults.map((area) => area.selectionArea);
    expect(names).toContain("Dados estruturados, não estruturados ou Big Data");
    expect(names).toContain("Correspondências parciais interdisciplinares adicionais");
    expect(names).not.toContain("Programação");
    expect(result.areaResults.reduce((sum, area) => sum + area.total, 0)).toBe(24);
  });

  it("não altera o SDE", () => {
    const before = structuredClone(useConcurseiroStore.getState().ultimaDecisaoSDE);
    gradePilotDiagnosticAttempt(blankRequest(), "2026-07-18T15:50:00.000Z");
    expect(useConcurseiroStore.getState().ultimaDecisaoSDE).toEqual(before);
  });

  it("não altera mastery ou evidências de aprendizagem", () => {
    const before = JSON.stringify({
      subassuntos: useConcurseiroStore.getState().subassuntos,
      tentativas: useConcurseiroStore.getState().tentativasQuestoes,
      estatisticas: useConcurseiroStore.getState().estatisticas,
    });
    gradePilotDiagnosticAttempt(blankRequest(), "2026-07-18T15:50:00.000Z");
    expect(JSON.stringify({
      subassuntos: useConcurseiroStore.getState().subassuntos,
      tentativas: useConcurseiroStore.getState().tentativasQuestoes,
      estatisticas: useConcurseiroStore.getState().estatisticas,
    })).toBe(before);
  });

  it("não altera prioridades ou simulados existentes", () => {
    const before = JSON.stringify({
      assuntos: useConcurseiroStore.getState().assuntos,
      disciplinas: useConcurseiroStore.getState().disciplinas,
      simulados: useConcurseiroStore.getState().simulados,
    });
    gradePilotDiagnosticAttempt(blankRequest(), "2026-07-18T15:50:00.000Z");
    expect(JSON.stringify({
      assuntos: useConcurseiroStore.getState().assuntos,
      disciplinas: useConcurseiroStore.getState().disciplinas,
      simulados: useConcurseiroStore.getState().simulados,
    })).toBe(before);
  });

  it("mantém os controles 14 e 53 presentes", () => {
    expect(validateInternalPilotDiagnosticCatalog().controls).toEqual([14, 53]);
  });

  it("preserva resposta e posição ao recarregar a tentativa ativa", () => {
    const storage = new MemoryStorage();
    let active = createPilotDiagnosticAttempt("reload", "2026-07-18T15:00:00.000Z");
    active = answerPilotDiagnosticQuestion(active, "fgv-bd-0147", "D", "2026-07-18T15:01:00.000Z");
    active = navigatePilotDiagnostic(active, 8, "2026-07-18T15:02:00.000Z");
    saveActivePilotDiagnosticAttempt(storage, active);
    const reloaded = readPilotDiagnosticSnapshot(storage).activeAttempt;
    expect(reloaded?.currentPosition).toBe(8);
    expect(reloaded?.answers["fgv-bd-0147"]).toBe("D");
  });

  it("impede modificar ou sobrescrever tentativa finalizada", () => {
    const storage = new MemoryStorage();
    const result = gradePilotDiagnosticAttempt(blankRequest("immutable"), "2026-07-18T15:50:00.000Z");
    appendFinalizedPilotDiagnosticAttempt(storage, result);
    expect(() => appendFinalizedPilotDiagnosticAttempt(storage, { ...result, percentage: 99 })).toThrow(/imutável/);
    expect(readPilotDiagnosticSnapshot(storage).finalizedAttempts[0].percentage).toBe(result.percentage);
  });

  it("rejeita caminhos absolutos locais", () => {
    const source = JSON.parse(readFileSync(
      resolve(process.cwd(), "data/diagnostics/diag-fgv-dataprev-bd-v1/diagnostic-v1.internal.json"),
      "utf8",
    ));
    source.questions[18].statement_assets = ["C:\\Users\\teste\\q14.png"];
    expect(() => validateInternalPilotDiagnosticCatalog(source)).toThrow(/Caminho de asset inválido/);
  });

  it("impede segunda tentativa enquanto outra está ativa", () => {
    const storage = new MemoryStorage();
    startActivePilotDiagnosticAttempt(storage, createPilotDiagnosticAttempt("first", "2026-07-18T15:00:00.000Z"));
    expect(() => startActivePilotDiagnosticAttempt(
      storage,
      createPilotDiagnosticAttempt("second", "2026-07-18T15:01:00.000Z"),
    )).toThrow(/Já existe uma tentativa ativa/);
  });

  it("mantém a nota total independente da aderência parcial", () => {
    const request = blankRequest("coverage");
    const selected = new Map<string, DiagnosticOptionLabel>();
    for (const answer of request.answers.slice(0, 2)) selected.set(answer.questionId, "A");
    request.answers = request.answers.map((answer) => ({
      ...answer,
      selectedAnswer: selected.get(answer.questionId) ?? null,
    }));
    const result = gradePilotDiagnosticAttempt(request, "2026-07-18T15:50:00.000Z");
    expect(result.percentage).toBeCloseTo((result.correctCount / 24) * 100, 2);
    expect(result.coverage.principal.total).toBe(20);
    expect(result.coverage.complementary.total).toBe(4);
    expect(result.affectsSde).toBe(false);
  });
});
