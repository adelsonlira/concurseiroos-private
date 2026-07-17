import { describe, expect, it } from "vitest";
import {
  applyErrorRecoveryEpisode,
  buildLegacyErrorRecoveryCases,
  deriveErrorRecoveryCaseState,
  ERROR_RECOVERY_CONFIRMATIONS_REQUIRED,
  getErrorRecoveryProtocol,
  recordErrorCorrection,
} from "../errorRecovery";

const wrongEpisode = {
  disciplinaId: "d1",
  assuntoId: "a1",
  subassuntoId: "s1",
  attemptIds: ["t1"],
  recordedAt: "2026-07-17T10:00:00.000Z",
  correct: false,
  declaredCause: "LACUNA_CONTEUDO" as const,
};

describe("error recovery evidence", () => {
  it("requires explicit correction before a correct answer can verify recovery", () => {
    const opened = applyErrorRecoveryEpisode([], wrongEpisode);
    expect(deriveErrorRecoveryCaseState(opened[0]).status).toBe("PENDING_CORRECTION");

    const earlyCorrect = applyErrorRecoveryEpisode(opened, {
      ...wrongEpisode,
      attemptIds: ["t2"],
      recordedAt: "2026-07-17T10:10:00.000Z",
      correct: true,
      confidence: "ALTA",
      consultedMaterial: false,
    });
    expect(deriveErrorRecoveryCaseState(earlyCorrect[0]).verificationPasses).toBe(0);
  });

  it("stabilizes only after two independent verification episodes and reopens on a later error", () => {
    const opened = applyErrorRecoveryEpisode([], wrongEpisode);
    const correction = recordErrorCorrection(opened, opened[0].id, {
      cause: "LACUNA_CONTEUDO",
      correctionSummary: "A normalização elimina dependências inadequadas de acordo com a forma normal.",
      preventionRule: "Antes de marcar, identificar dependência funcional e chave candidata.",
      recordedAt: "2026-07-17T10:05:00.000Z",
    });
    expect(correction.error).toBeUndefined();
    expect(deriveErrorRecoveryCaseState(correction.cases[0]).status).toBe("READY_FOR_VERIFICATION");

    const first = applyErrorRecoveryEpisode(correction.cases, {
      ...wrongEpisode,
      attemptIds: ["t2"],
      recordedAt: "2026-07-17T10:10:00.000Z",
      correct: true,
      confidence: "MEDIA",
      consultedMaterial: false,
    });
    expect(deriveErrorRecoveryCaseState(first[0]).status).toBe("RECOVERED_PROVISIONALLY");
    expect(deriveErrorRecoveryCaseState(first[0]).verificationPasses).toBe(1);

    const second = applyErrorRecoveryEpisode(first, {
      ...wrongEpisode,
      attemptIds: ["t3"],
      recordedAt: "2026-07-18T10:10:00.000Z",
      correct: true,
      confidence: "ALTA",
      consultedMaterial: false,
    });
    expect(ERROR_RECOVERY_CONFIRMATIONS_REQUIRED).toBe(2);
    expect(deriveErrorRecoveryCaseState(second[0]).status).toBe("STABILIZED");

    const reopened = applyErrorRecoveryEpisode(second, {
      ...wrongEpisode,
      attemptIds: ["t4"],
      recordedAt: "2026-07-19T10:10:00.000Z",
      correct: false,
      declaredCause: "INTERPRETACAO",
    });
    const state = deriveErrorRecoveryCaseState(reopened[0]);
    expect(state.status).toBe("PENDING_CORRECTION");
    expect(state.activeCause).toBe("INTERPRETACAO");
    expect(state.verificationPasses).toBe(0);
  });

  it("does not count consultation or low confidence as independent recovery", () => {
    const opened = applyErrorRecoveryEpisode([], wrongEpisode);
    const correction = recordErrorCorrection(opened, opened[0].id, {
      cause: "LACUNA_CONTEUDO",
      correctionSummary: "Corrigi a regra conceitual exata.",
      preventionRule: "Recuperar a regra antes de avaliar alternativas.",
      recordedAt: "2026-07-17T10:05:00.000Z",
    });
    const result = applyErrorRecoveryEpisode(correction.cases, {
      ...wrongEpisode,
      attemptIds: ["t2"],
      recordedAt: "2026-07-17T10:10:00.000Z",
      correct: true,
      confidence: "BAIXA",
      consultedMaterial: true,
    });
    const state = deriveErrorRecoveryCaseState(result[0]);
    expect(state.status).toBe("READY_FOR_VERIFICATION");
    expect(state.verificationPasses).toBe(0);
  });

  it("provides cause-specific protocols without inferring the cause", () => {
    expect(getErrorRecoveryProtocol("INTERPRETACAO").steps.join(" ")).toContain("comando");
    expect(getErrorRecoveryProtocol("DESCONHECIDA").objective).toContain("Classificar");
  });
  it("migrates only the latest legacy error without treating old correct answers as recovery", () => {
    const cases = buildLegacyErrorRecoveryCases([
      { ...wrongEpisode, id: "legacy-error", subassuntoId: "s1", acertou: false, respondidaEm: "2026-07-10T10:00:00.000Z", erroCausa: "MEMORIA" },
      { id: "legacy-correct", disciplinaId: "d1", assuntoId: "a1", subassuntoId: "s1", acertou: true, respondidaEm: "2026-07-11T10:00:00.000Z" }
    ]);
    expect(cases).toHaveLength(1);
    expect(deriveErrorRecoveryCaseState(cases[0])).toMatchObject({
      status: "PENDING_CORRECTION",
      activeCause: "MEMORIA",
      verificationPasses: 0
    });
  });

});
