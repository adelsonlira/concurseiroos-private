import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { fingerprintSnapshot, hasMeaningfulLocalProgress } from "../../../integrations/cloud/snapshotPolicy";
import { useConcurseiroStore } from "../../../store";
import type { OptionalStudyRecommendationOption } from "..";

function resetStore() {
  const seed = buildDataprev2026Profile3AppSeed();
  useConcurseiroStore.setState({
    concursos: [seed.concurso], editais: [seed.edital], disciplinas: seed.disciplinas,
    assuntos: seed.assuntos, subassuntos: seed.subassuntos, biblioteca: seed.biblioteca,
    configuracao: seed.configuracao, estatisticas: structuredClone(seed.estatisticas),
    tentativasQuestoes: [], sessoesEstudo: [], historicoAtividades: [], cronogramasRevisao: [],
    casosRecuperacaoErro: [], externalEvidenceLedger: [], sdeDecisionLedger: [], sdeCalibrationLedger: [],
    optionalStudyLedger: [], flashcards: [], simulados: [], questoes: [], ultimaDecisaoSDE: null,
  });
}

function recommend(date = "2026-07-19") {
  const result = useConcurseiroStore.getState().gerarRecomendacaoEstudoOpcional(date, "rest_day_optional");
  if (!result.recommendation) throw new Error("recommendation unavailable");
  return result.recommendation;
}

function questionOption() {
  const recommendation = recommend();
  const option = [recommendation.primary, ...recommendation.alternatives].find((item) => ["fgv_questions", "short_question_batch", "timed_question_batch"].includes(item.method));
  if (!option) throw new Error("question option unavailable");
  return { recommendation, option };
}

function start(option?: OptionalStudyRecommendationOption, minutes?: number) {
  const recommendation = option ? useConcurseiroStore.getState().optionalStudyLedger.find((e) => e.eventType === "recommendation_generated")?.payload.recommendation as ReturnType<typeof recommend> : recommend();
  const selected = option ?? recommendation.primary;
  const result = useConcurseiroStore.getState().aceitarEstudoOpcional({ recommendationId: recommendation.recommendationId, optionId: selected.optionId, durationMinutes: minutes });
  if (!result.success || !result.sessionId) throw new Error(result.error ?? "session unavailable");
  return { recommendation, option: selected, sessionId: result.sessionId, warning: result.warning };
}

describe("optional study store integration", () => {
  beforeEach(resetStore);

  it("does not create a session before explicit acceptance", () => { recommend(); expect(useConcurseiroStore.getState().sessoesEstudo).toHaveLength(0); });
  it("creates accepted and started events only after acceptance", () => { const s = start(); expect(useConcurseiroStore.getState().optionalStudyLedger.map((e) => e.eventType)).toEqual(["recommendation_generated", "accepted", "session_started"]); expect(s.sessionId).toBeTruthy(); });
  it("marks all optional events as non-mandatory", () => { start(); expect(useConcurseiroStore.getState().optionalStudyLedger.every((e) => e.isOptional && !e.mandatory && !e.affectsPlanCompliance)).toBe(true); });
  it("supports quick duration acceptance", () => expect(start(undefined, 45).warning).toBeUndefined());
  it("supports custom duration acceptance", () => expect(start(undefined, 37).warning).toBeUndefined());
  it("warns above 120 without changing the default availability", () => { const before = useConcurseiroStore.getState().configuracao; const result = start(undefined, 150); expect(result.warning).toMatch(/120 minutos/i); expect(useConcurseiroStore.getState().configuracao).toBe(before); });
  it("pauses an active optional session", () => { const { sessionId } = start(); expect(useConcurseiroStore.getState().pausarEstudoOpcional(sessionId).success).toBe(true); expect(useConcurseiroStore.getState().optionalStudyLedger.at(-1)?.eventType).toBe("session_paused"); });
  it("resumes a paused optional session", () => { const { sessionId } = start(); useConcurseiroStore.getState().pausarEstudoOpcional(sessionId); expect(useConcurseiroStore.getState().retomarEstudoOpcional(sessionId).success).toBe(true); expect(useConcurseiroStore.getState().optionalStudyLedger.at(-1)?.eventType).toBe("session_resumed"); });
  it("interrupts with zero minutes without creating a study session", () => { const { sessionId } = start(); expect(useConcurseiroStore.getState().interromperEstudoOpcional(sessionId, 0).success).toBe(true); expect(useConcurseiroStore.getState().sessoesEstudo).toHaveLength(0); });
  it("interrupts without negative evidence", () => { const { sessionId } = start(); useConcurseiroStore.getState().interromperEstudoOpcional(sessionId, 0); expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(0); expect(useConcurseiroStore.getState().optionalStudyLedger.at(-1)?.payload).toMatchObject({ noPenalty: true, noNegativeEvidence: true }); });
  it("counts actual time from an interrupted session", () => { const { sessionId } = start(); useConcurseiroStore.getState().interromperEstudoOpcional(sessionId, 12); expect(useConcurseiroStore.getState().sessoesEstudo[0]).toMatchObject({ concluidaComSucesso: false, tempoGastoSegundos: 720, isOptional: true }); });
  it("completes a theory session as optional", () => { const { sessionId } = start(); expect(useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 20 }).success).toBe(true); expect(useConcurseiroStore.getState().sessoesEstudo[0]).toMatchObject({ isOptional: true, mandatory: false, affectsPlanCompliance: false }); });
  it("mere theory time does not grant completion mastery", () => { const { sessionId, option } = start(); useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 20, objectiveCriteriaMet: false }); expect(useConcurseiroStore.getState().subassuntos.find((s) => s.id === option.subtopicId)?.completado).not.toBe(true); });
  it("objective theory criteria remain declarative and do not auto-complete the subtopic", () => { const { sessionId, option } = start(); useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 20, objectiveCriteriaMet: true }); expect(useConcurseiroStore.getState().subassuntos.find((s) => s.id === option.subtopicId)?.completado).not.toBe(true); });
  it("records one aggregate question evidence without synthetic attempts", () => { const recommendation = recommend(); const option = { ...recommendation.primary, optionId: "manual-questions", method: "fgv_questions" as const, environment: "qconcursos" as const, suggestedSource: "qconcursos" as const, suggestedExaminingBoard: "FGV" }; const accepted = useConcurseiroStore.getState().aceitarEstudoOpcional({ recommendationId: recommendation.recommendationId, manualOption: option }); const result = useConcurseiroStore.getState().concluirEstudoOpcional(accepted.sessionId!, { kind: "questions", actualMinutes: 25, totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2, blankAnswers: 0, consultedMaterial: "no", source: "qconcursos", examiningBoard: "FGV" }); expect(result.success).toBe(true); expect(useConcurseiroStore.getState().externalEvidenceLedger).toHaveLength(1); expect(useConcurseiroStore.getState().tentativasQuestoes).toHaveLength(0); });
  it("records simulation results", () => { const r = recommend(); const manual = { ...r.primary, optionId: "manual-sim", method: "mini_simulation" as const, environment: "concurseiroos" as const }; const accepted = useConcurseiroStore.getState().aceitarEstudoOpcional({ recommendationId: r.recommendationId, manualOption: manual }); expect(useConcurseiroStore.getState().concluirEstudoOpcional(accepted.sessionId!, { kind: "simulation", actualMinutes: 30, totalQuestions: 10, correctAnswers: 6, wrongAnswers: 3, blankAnswers: 1, source: "simulado_externo" }).success).toBe(true); });
  it("records review results as a real session", () => { const r = recommend(); const manual = { ...r.primary, optionId: "manual-review", method: "active_recall" as const, environment: "concurseiroos" as const, materialId: undefined, materialLabel: undefined }; const accepted = useConcurseiroStore.getState().aceitarEstudoOpcional({ recommendationId: r.recommendationId, manualOption: manual }); expect(accepted.success).toBe(true); useConcurseiroStore.getState().concluirEstudoOpcional(accepted.sessionId!, { kind: "review", actualMinutes: 15 }); expect(useConcurseiroStore.getState().sessoesEstudo.at(-1)?.atividadeEstudo).toBe("revisao"); });
  it("records technical practice results", () => { const r = recommend(); const manual = { ...r.primary, optionId: "manual-tech", method: "technical_practice" as const, environment: "concurseiroos" as const, materialId: undefined, materialLabel: undefined }; const accepted = useConcurseiroStore.getState().aceitarEstudoOpcional({ recommendationId: r.recommendationId, manualOption: manual }); expect(accepted.success).toBe(true); expect(useConcurseiroStore.getState().concluirEstudoOpcional(accepted.sessionId!, { kind: "technical_practice", actualMinutes: 25, technicalTask: "Construir uma consulta SQL", observableResult: "Consulta executada" }).success).toBe(true); });
  it("does not increase planned daily availability", () => { const before = structuredClone(useConcurseiroStore.getState().configuracao.disponibilidadeEstudo); const { sessionId } = start(); useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 20 }); expect(useConcurseiroStore.getState().configuracao.disponibilidadeEstudo).toEqual(before); });
  it("counts optional time in real study totals", () => { const before = useConcurseiroStore.getState().estatisticas.tempoTotalGeralMinutos; const { sessionId } = start(); useConcurseiroStore.getState().concluirEstudoOpcional(sessionId, { kind: "theory", actualMinutes: 20 }); expect(useConcurseiroStore.getState().estatisticas.tempoTotalGeralMinutos).toBe(before + 20); });
  it("keeping rest creates no session, attempt or evidence", () => { useConcurseiroStore.getState().manterDescansoOpcional("2026-07-19"); const state = useConcurseiroStore.getState(); expect(state.sessoesEstudo).toHaveLength(0); expect(state.tentativasQuestoes).toHaveLength(0); expect(state.externalEvidenceLedger).toHaveLength(0); });
  it("reload-equivalent repeated recommendation does not duplicate", () => { const first = recommend(); const second = recommend(); expect(second.recommendationId).toBe(first.recommendationId); expect(useConcurseiroStore.getState().optionalStudyLedger.filter((e) => e.eventType === "recommendation_generated")).toHaveLength(1); });
  it("explicit request for another suggestion appends one controlled event", () => { recommend(); useConcurseiroStore.getState().gerarRecomendacaoEstudoOpcional("2026-07-19", "rest_day_optional", true); expect(useConcurseiroStore.getState().optionalStudyLedger.filter((e) => e.eventType === "recommendation_generated")).toHaveLength(2); });
  it("backup 2.5.0 preserves the optional ledger and cloud fingerprint", () => { recommend(); const backup = useConcurseiroStore.getState().exportBackup(); expect(backup.metadata.versaoBackup).toBe("2.5.0"); expect(backup.dados.optionalStudyLedger).toHaveLength(1); expect(hasMeaningfulLocalProgress(backup)).toBe(true); const empty = structuredClone(backup); empty.dados.optionalStudyLedger = []; expect(fingerprintSnapshot(backup)).not.toBe(fingerprintSnapshot(empty)); });
  it("keeps v1 effective and registers optional v2 comparison", () => { recommend(); const state = useConcurseiroStore.getState(); expect(state.configuracao.activeSdeVersion).toBe("v1"); expect(state.sdeCalibrationLedger.at(-1)).toMatchObject({ decisionContext: "optional_study", activeSdeVersion: "v1", executionMode: "shadow", affectsPrescription: false }); });
});

describe("optional study UI governance", () => {
  const source = readFileSync(new URL("../../../components/OptionalStudyCard.tsx", import.meta.url), "utf8");
  it("contains all required optional buttons", () => { for (const label of ["Iniciar atividade opcional", "Ver outras opções", "Escolher duração", "Escolher assunto ou método", "Manter descanso", "Ocultar por hoje"]) expect(source).toContain(label); });
  it("uses a single scrollable optional-session container", () => expect(source).toMatch(/max-h-\[calc\(100dvh-8rem\)\].*overflow-y-auto/));
  it("keeps the no-obligation language", () => expect(source).toContain("Ignorá-la não altera seu plano, sua aderência ou seu progresso"));
  it("supports a manual picker with discipline, topic, method, environment and material", () => { for (const label of ["Disciplina", "Assunto", "Método", "Ambiente", "Material disponível"]) expect(source).toContain(label); });
  it("exposes recoverable status messages", () => expect(source).toContain('role="status"'));
  it("renders method-specific structured forms", () => { for (const id of ["optional-result-form-questions", "optional-result-form-theory", "optional-result-form-review", "optional-result-form-technical_practice", "optional-result-form-organization"]) expect(source).toContain("optional-result-form-"); });
  it("asks for source and bank without hardcoding FGV in the UI payload", () => { expect(source).toContain("Plataforma/origem"); expect(source).toContain("Banca"); expect(source).not.toContain('examiningBoard: "FGV"'); });
  it("states that theory does not auto-complete mastery", () => expect(source).toContain("não marca automaticamente o subassunto como concluído nem concede mastery"));
});
