import { describe, expect, it } from "vitest";
import {
  REVIEW_POLICY_VERSION,
  addCalendarDays,
  buildErrorTopicSummaries,
  buildInterleavedReviewQueue,
  completeReviewSchedule,
  createOrRefreshReviewSchedule,
  getDueReviewSchedules
} from "../reviewEngine";
import type { AttemptForErrorAnalysis, ReviewScheduleLike } from "../types";

function schedule(overrides: Partial<ReviewScheduleLike> = {}): ReviewScheduleLike {
  return {
    id: "review-sub-1",
    disciplinaId: "disc-1",
    assuntoId: "topic-1",
    subassuntoId: "sub-1",
    passosCicloAtuais: 0,
    historicoTentativas: [],
    proximaRevisaoData: "2026-07-14",
    desabilitada: false,
    createdAt: "2026-07-13T12:00:00.000Z",
    updatedAt: "2026-07-13T12:00:00.000Z",
    ...overrides
  };
}

describe("reviewEngine adaptive exam-oriented policy", () => {
  it("adds calendar days deterministically", () => {
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("creates a near retrieval after a factual trigger and marks error relearning", () => {
    const result = createOrRefreshReviewSchedule({
      identity: {
        id: "review-sub-1",
        disciplinaId: "disc-1",
        assuntoId: "topic-1",
        subassuntoId: "sub-1"
      },
      trigger: "ERRO_QUESTAO",
      triggerTimestamp: "2026-07-13T12:00:00.000Z",
      triggerId: "attempt-1",
      examDate: "2026-10-11"
    });
    expect(result.proximaRevisaoData).toBe("2026-07-14");
    expect(result.politicaVersao).toBe(REVIEW_POLICY_VERSION);
    expect(result.requerReaprendizagemImediata).toBe(true);
    expect(result.modoProximaRevisao).toBe("REAPRENDIZAGEM_IMEDIATA");
  });

  it("manual scheduling places the item in today's queue", () => {
    const result = createOrRefreshReviewSchedule({
      identity: {
        id: "review-sub-1",
        disciplinaId: "disc-1",
        assuntoId: "topic-1",
        subassuntoId: "sub-1"
      },
      trigger: "MANUAL",
      triggerTimestamp: "2026-07-13T12:00:00.000Z"
    });
    expect(result.proximaRevisaoData).toBe("2026-07-13");
  });

  it("resets recovery evidence after a new wrong answer", () => {
    const result = createOrRefreshReviewSchedule({
      existing: schedule({
        passosCicloAtuais: 4,
        recuperacoesIndependentesConsecutivas: 4,
        estabilidadeDias: 20,
        proximaRevisaoData: "2026-08-30"
      }),
      identity: {
        id: "review-sub-1",
        disciplinaId: "disc-1",
        assuntoId: "topic-1",
        subassuntoId: "sub-1"
      },
      trigger: "ERRO_QUESTAO",
      triggerTimestamp: "2026-07-13T12:00:00.000Z"
    });
    expect(result.recuperacoesIndependentesConsecutivas).toBe(0);
    expect(result.estabilidadeDias).toBe(1);
    expect(result.proximaRevisaoData).toBe("2026-07-14");
  });

  it("requires corrective relearning after failed retrieval", () => {
    const result = completeReviewSchedule({
      schedule: schedule({ gatilhoOrigem: "ERRO_QUESTAO", estabilidadeDias: 8 }),
      performance: "HARD",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    expect(result.proximaRevisaoData).toBe("2026-07-15");
    expect(result.recuperacoesIndependentesConsecutivas).toBe(0);
    expect(result.requerReaprendizagemImediata).toBe(true);
    expect(result.falhasRecuperacao).toBe(1);
  });

  it("grows intervals conservatively after effortful and fluent independent retrieval", () => {
    const effortful = completeReviewSchedule({
      schedule: schedule({ estabilidadeDias: 1, gatilhoOrigem: "MANUAL" }),
      performance: "MEDIUM",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    const fluent = completeReviewSchedule({
      schedule: schedule({ estabilidadeDias: 1, gatilhoOrigem: "MANUAL" }),
      performance: "EASY",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11"
    });

    expect(effortful.ultimaDecisaoIntervaloDias).toBe(2);
    expect(fluent.ultimaDecisaoIntervaloDias).toBe(4);
    expect(effortful.historicoTentativas.at(-1)?.recuperacaoIndependente).toBe(true);
    expect(fluent.historicoTentativas.at(-1)?.usouAjuda).toBe(false);
  });

  it("keeps error-origin cycles short until two independent recoveries", () => {
    const first = completeReviewSchedule({
      schedule: schedule({
        gatilhoOrigem: "ERRO_QUESTAO",
        estabilidadeDias: 10,
        recuperacoesIndependentesConsecutivas: 0
      }),
      performance: "EASY",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    expect(first.ultimaDecisaoIntervaloDias).toBe(3);

    const second = completeReviewSchedule({
      schedule: first,
      performance: "EASY",
      reviewedAt: "2026-07-17T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    expect(second.recuperacoesIndependentesConsecutivas).toBe(2);
    expect(second.modoProximaRevisao).toBe("PRATICA_INTERCALADA");
    expect(second.ultimaDecisaoIntervaloDias).toBeGreaterThan(3);
  });

  it("caps the next interval by the exam horizon and never schedules after the exam", () => {
    const result = completeReviewSchedule({
      schedule: schedule({
        estabilidadeDias: 30,
        recuperacoesIndependentesConsecutivas: 4,
        gatilhoOrigem: "MANUAL"
      }),
      performance: "EASY",
      reviewedAt: "2026-10-06T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    expect(result.ultimaDecisaoIntervaloDias).toBe(2);
    expect(result.proximaRevisaoData).toBe("2026-10-08");
    expect(result.racionalUltimoIntervalo?.join(" ")).toContain("horizonte");
  });

  it("migrates legacy fixed policy without discarding history", () => {
    const result = completeReviewSchedule({
      schedule: schedule({
        politicaVersao: "FIXED_1_3_7_14_30_60_V1",
        passosCicloAtuais: 3,
        historicoTentativas: [
          { revisadoEm: "2026-07-01T10:00:00.000Z", desempenhoAutoAvaliado: "MEDIUM" }
        ]
      }),
      performance: "MEDIUM",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    expect(result.politicaVersao).toBe(REVIEW_POLICY_VERSION);
    expect(result.politicaMigradaDe).toBe("FIXED_1_3_7_14_30_60_V1");
    expect(result.historicoTentativas).toHaveLength(2);
  });

  it("returns only enabled reviews due by the reference date", () => {
    const result = getDueReviewSchedules(
      [
        schedule({ id: "b", proximaRevisaoData: "2026-07-13" }),
        schedule({ id: "a", proximaRevisaoData: "2026-07-12" }),
        schedule({ id: "c", proximaRevisaoData: "2026-07-14" }),
        schedule({ id: "d", proximaRevisaoData: "2026-07-10", desabilitada: true })
      ],
      "2026-07-13"
    );
    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("builds a deterministic interleaved queue and prioritizes unresolved errors", () => {
    const schedules = [
      schedule({ id: "a", disciplinaId: "d1", assuntoId: "a1", subassuntoId: "s1", proximaRevisaoData: "2026-07-12" }),
      schedule({ id: "b", disciplinaId: "d1", assuntoId: "a1", subassuntoId: "s2", proximaRevisaoData: "2026-07-11" }),
      schedule({ id: "c", disciplinaId: "d2", assuntoId: "a2", subassuntoId: "s3", proximaRevisaoData: "2026-07-13" })
    ];
    const queue = buildInterleavedReviewQueue({
      schedules,
      referenceDate: "2026-07-13",
      maxItems: 3,
      errorSummaries: [
        {
          disciplinaId: "d1",
          assuntoId: "a1",
          subassuntoId: "s1",
          totalErros: 1,
          ultimoErroEm: "2026-07-12T00:00:00.000Z",
          ultimoRegistroEm: "2026-07-12T00:00:00.000Z",
          acertosAposUltimoErro: 0,
          estadoRecuperacao: "SEM_ACERTO_POSTERIOR",
          causasDeclaradas: {},
          notasRecentes: []
        }
      ]
    });
    expect(queue[0].scheduleId).toBe("a");
    expect(queue[1].disciplinaId).toBe("d2");
    expect(queue.map((item) => item.scheduleId)).toEqual(["a", "c", "b"]);
  });

  it("derives recovery evidence only from later recorded attempts", () => {
    const attempts: AttemptForErrorAnalysis[] = [
      {
        id: "1",
        disciplinaId: "disc",
        assuntoId: "topic",
        subassuntoId: "sub",
        acertou: false,
        respondidaEm: "2026-07-10T10:00:00.000Z",
        erroCausa: "LACUNA_CONTEUDO",
        erroNota: "Confundi JPA com Hibernate."
      },
      {
        id: "2",
        disciplinaId: "disc",
        assuntoId: "topic",
        subassuntoId: "sub",
        acertou: true,
        respondidaEm: "2026-07-11T10:00:00.000Z"
      },
      {
        id: "3",
        disciplinaId: "disc",
        assuntoId: "topic",
        subassuntoId: "sub",
        acertou: true,
        respondidaEm: "2026-07-12T10:00:00.000Z"
      }
    ];

    const [summary] = buildErrorTopicSummaries(attempts);
    expect(summary.estadoRecuperacao).toBe("DOIS_OU_MAIS_ACERTOS_POSTERIORES");
    expect(summary.acertosAposUltimoErro).toBe(2);
    expect(summary.causasDeclaradas.LACUNA_CONTEUDO).toBe(1);
    expect(summary.notasRecentes[0].nota).toContain("JPA");
  });

  it("does not treat a correct answer before the last error as recovery", () => {
    const attempts: AttemptForErrorAnalysis[] = [
      {
        id: "1",
        disciplinaId: "disc",
        assuntoId: "topic",
        subassuntoId: "sub",
        acertou: true,
        respondidaEm: "2026-07-10T10:00:00.000Z"
      },
      {
        id: "2",
        disciplinaId: "disc",
        assuntoId: "topic",
        subassuntoId: "sub",
        acertou: false,
        respondidaEm: "2026-07-11T10:00:00.000Z"
      }
    ];
    expect(buildErrorTopicSummaries(attempts)[0].estadoRecuperacao).toBe(
      "SEM_ACERTO_POSTERIOR"
    );
  });
});

describe("hybrid method learning", () => {
  function methodSchedule(
    id: string,
    subassuntoId: string,
    method: "ADAPTIVE_RETRIEVAL" | "INTERLEAVED_RETRIEVAL",
    outcomes: Array<"HARD" | "MEDIUM" | "EASY">
  ): ReviewScheduleLike {
    const history: ReviewScheduleLike["historicoTentativas"] = [];
    history.push({
      revisadoEm: "2026-06-01T10:00:00.000Z",
      desempenhoAutoAvaliado: "EASY",
      metodoAplicado: method
    });
    outcomes.forEach((performance, index) => {
      history.push({
        revisadoEm: `2026-06-${String(index + 2).padStart(2, "0")}T10:00:00.000Z`,
        desempenhoAutoAvaliado: performance,
        metodoAplicado: method,
        diasDesdeRevisaoAnterior: 1
      });
    });
    return schedule({ id, subassuntoId, historicoTentativas: history });
  }

  it("learns only from delayed outcomes and prefers a method after conservative evidence", async () => {
    const { buildReviewMethodEvidence, selectObservedPreferredReviewMethod } = await import("../reviewEngine");
    const schedules: ReviewScheduleLike[] = [];
    for (let index = 0; index < 4; index += 1) {
      schedules.push(
        methodSchedule(`adaptive-${index}`, `sub-a-${index}`, "ADAPTIVE_RETRIEVAL", ["EASY", "MEDIUM"]),
        methodSchedule(`interleaved-${index}`, `sub-i-${index}`, "INTERLEAVED_RETRIEVAL", ["HARD", "HARD"])
      );
    }
    const evidence = buildReviewMethodEvidence(schedules);
    const decision = selectObservedPreferredReviewMethod(evidence);
    expect(decision.status).toBe("OBSERVED_PREFERENCE");
    expect(decision.preferredMethod).toBe("ADAPTIVE_RETRIEVAL");
    expect(evidence.find((item) => item.method === "ADAPTIVE_RETRIEVAL")?.delayedOutcomes).toBe(8);
  });

  it("adopts the observed preference by default but preserves deterministic exploration", async () => {
    const strongEvidence: ReviewScheduleLike[] = [];
    for (let index = 0; index < 4; index += 1) {
      strongEvidence.push(
        methodSchedule(`evidence-a-${index}`, `ea-${index}`, "ADAPTIVE_RETRIEVAL", ["EASY", "EASY"]),
        methodSchedule(`evidence-i-${index}`, `ei-${index}`, "INTERLEAVED_RETRIEVAL", ["HARD", "HARD"])
      );
    }

    const selected = Array.from({ length: 25 }, (_, index) =>
      completeReviewSchedule({
        schedule: schedule({
          id: `candidate-${index}`,
          subassuntoId: `candidate-sub-${index}`,
          gatilhoOrigem: "MANUAL",
          metodoProximaRevisao: "ADAPTIVE_RETRIEVAL",
          historicoTentativas: [
            {
              revisadoEm: "2026-07-01T10:00:00.000Z",
              desempenhoAutoAvaliado: "EASY",
              metodoAplicado: "ADAPTIVE_RETRIEVAL"
            }
          ],
          recuperacoesIndependentesConsecutivas: 2
        }),
        performance: "EASY",
        reviewedAt: "2026-07-14T10:00:00.000Z",
        examDate: "2026-10-11",
        peerSchedules: strongEvidence
      }).metodoProximaRevisao
    );

    expect(selected.filter((item) => item === "ADAPTIVE_RETRIEVAL").length).toBeGreaterThanOrEqual(18);
    expect(selected).toContain("INTERLEAVED_RETRIEVAL");
  });

  it("never lets an observed preference bypass error-recovery safeguards", () => {
    const result = completeReviewSchedule({
      schedule: schedule({
        gatilhoOrigem: "ERRO_QUESTAO",
        metodoProximaRevisao: "ADAPTIVE_RETRIEVAL",
        recuperacoesIndependentesConsecutivas: 3
      }),
      performance: "HARD",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11"
    });
    expect(result.metodoProximaRevisao).toBe("ERROR_FOCUSED_RELEARNING");
    expect(result.motivoMetodoProximaRevisao).toBe("SAFETY_ERROR_RECOVERY");
  });
});

describe("timed review efficiency", () => {
  it("stores real review duration and rejects invalid durations", () => {
    const timed = completeReviewSchedule({
      schedule: schedule({ metodoProximaRevisao: "ADAPTIVE_RETRIEVAL" }),
      performance: "MEDIUM",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      examDate: "2026-10-11",
      tempoGastoSegundos: 420,
      duracaoFonte: "TIMER"
    });

    expect(timed.historicoTentativas.at(-1)?.tempoGastoSegundos).toBe(420);
    expect(timed.historicoTentativas.at(-1)?.duracaoFonte).toBe("TIMER");
    expect(() =>
      completeReviewSchedule({
        schedule: schedule(),
        performance: "EASY",
        reviewedAt: "2026-07-14T10:00:00.000Z",
        tempoGastoSegundos: 0
      })
    ).toThrow(/tempoGastoSegundos/);
  });

  it("uses efficiency only as a conservative tie-breaker when retention is not lower", async () => {
    const { buildReviewMethodEvidence, selectObservedPreferredReviewMethod } = await import("../reviewEngine");
    const schedules: ReviewScheduleLike[] = [];

    const timedSchedule = (
      id: string,
      subassuntoId: string,
      method: "ADAPTIVE_RETRIEVAL" | "INTERLEAVED_RETRIEVAL",
      seconds: number
    ): ReviewScheduleLike => {
      const history: ReviewScheduleLike["historicoTentativas"] = [];
      for (let index = 0; index < 4; index += 1) {
        history.push({
          revisadoEm: `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
          desempenhoAutoAvaliado: "EASY",
          metodoAplicado: method,
          tempoGastoSegundos: seconds,
          duracaoFonte: "TIMER",
          diasDesdeRevisaoAnterior: index === 0 ? undefined : 1
        });
      }
      return schedule({ id, subassuntoId, historicoTentativas: history });
    };

    for (let index = 0; index < 4; index += 1) {
      schedules.push(
        timedSchedule(`fast-${index}`, `fast-sub-${index}`, "ADAPTIVE_RETRIEVAL", 300),
        timedSchedule(`slow-${index}`, `slow-sub-${index}`, "INTERLEAVED_RETRIEVAL", 600)
      );
    }

    const evidence = buildReviewMethodEvidence(schedules);
    const decision = selectObservedPreferredReviewMethod(evidence);
    const adaptive = evidence.find((item) => item.method === "ADAPTIVE_RETRIEVAL")!;
    const interleaved = evidence.find((item) => item.method === "INTERLEAVED_RETRIEVAL")!;

    expect(adaptive.timedDelayedOutcomes).toBe(12);
    expect(adaptive.efficiencyEligible).toBe(true);
    expect(adaptive.observedIndependentRecoveriesPer10Minutes).toBeGreaterThan(
      interleaved.observedIndependentRecoveriesPer10Minutes ?? 0
    );
    expect(decision.status).toBe("OBSERVED_EFFICIENCY_PREFERENCE");
    expect(decision.preferredMethod).toBe("ADAPTIVE_RETRIEVAL");
    expect(decision.basis).toBe("EFFICIENCY");
  });
});
