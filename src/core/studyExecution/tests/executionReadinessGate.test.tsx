import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDataprev2026Profile3AppSeed } from "../../../config/concursos/dataprev-2026-perfil-3/appSeed";
import { DATAPREV_2026_PRIVATE_STUDY_MATERIALS } from "../../../config/concursos/dataprev-2026-perfil-3/privateStudyMaterials";
import StudyExecutionPacketView, { copyStudyExecutionPrompt } from "../../../components/StudyExecutionPacketView";
import { buildDailyStudyPrescription } from "../../prescription/prescriptionEngine";
import type { PlannerResponse, StudySession, StudyActivityType } from "../../sde/planner/plannerTypes";
import { getPlannerActionId } from "../../sde/planner/blockBuilder";
import { ConstitutionalTier, type StrategicAction } from "../../sde/prioritization/types";
import { executionReadinessGate } from "../executionReadinessGate";
import { assessStudyMaterialMatch, studyMaterialMatchLabel } from "../materialMatch";
import { resolveStudyExecutionCapability } from "../registry";
import type { StudyExecutionGateInput, StudyExecutionMaterialCandidate } from "../types";

const seed = buildDataprev2026Profile3AppSeed();
const portuguese = seed.disciplinas.find((item) => item.id === "dp26-p3-portugues")!;
const interpretation = seed.assuntos.find((item) => item.id === "dp26-p3-por-interpretacao")!;
const interpretationSubtopic = seed.subassuntos.find((item) => item.id === "dp26-p3-por-interpretacao-generos")!;
const specific = seed.disciplinas.find((item) => item.id === "dp26-p3-conhecimentos-especificos")!;
const database = seed.assuntos.find((item) => item.id === "dp26-p3-esp-banco-dados")!;
const dbMaterial = DATAPREV_2026_PRIVATE_STUDY_MATERIALS.find((material) =>
  material.sections.some((section) => section.topicId === database.id && section.subtopicIds.length > 0),
)!;
const dbSection = dbMaterial.sections.find((section) => section.topicId === database.id && section.subtopicIds.length > 0)!;
const dbSubtopic = seed.subassuntos.find((item) => item.id === dbSection.subtopicIds[0])!;
const wrongMaterial = DATAPREV_2026_PRIVATE_STUDY_MATERIALS.find((material) => /Noções Iniciais De Ortografia/i.test(material.displayTitle))!;
const wrongSection = wrongMaterial.sections[0];

function candidate(material = dbMaterial, section = dbSection, matchScope: StudyExecutionMaterialCandidate["matchScope"] = "EXACT_SUBTOPIC"): StudyExecutionMaterialCandidate {
  return {
    materialId: material.id,
    materialTitle: material.displayTitle,
    sourceFileName: material.sourceFileName,
    sectionTitle: section.title,
    startPage: section.startPage,
    endPage: section.endPage,
    matchScope,
    contentKind: section.contentKind,
    questionBank: section.questionBank,
  };
}

function baseInput(overrides: Partial<StudyExecutionGateInput> = {}): StudyExecutionGateInput {
  return {
    competitionId: "dataprev-2026-perfil-3",
    context: "mandatory",
    disciplineId: specific.id,
    disciplineName: specific.nome,
    topicId: database.id,
    topicName: database.nome,
    subtopicId: dbSubtopic.id,
    subtopicName: dbSubtopic.nome,
    requestedMethod: "theory_notebooklm",
    requestedEnvironment: "notebooklm",
    durationMinutes: 35,
    objective: "Compreender o recorte prescrito e recuperar os conceitos sem consulta.",
    completionCriterion: "Explicar os conceitos e registrar dúvidas e recuperação ativa.",
    material: candidate(),
    materialCatalog: DATAPREV_2026_PRIVATE_STUDY_MATERIALS,
    sourceDecisionId: "decision-1",
    allowMethodFallback: true,
    ...overrides,
  };
}

function wrongPortugueseInput(overrides: Partial<StudyExecutionGateInput> = {}): StudyExecutionGateInput {
  return baseInput({
    disciplineId: portuguese.id,
    disciplineName: portuguese.nome,
    topicId: interpretation.id,
    topicName: interpretation.nome,
    subtopicId: interpretationSubtopic.id,
    subtopicName: interpretationSubtopic.nome,
    material: candidate(wrongMaterial, wrongSection, "TOPIC_FALLBACK"),
    ...overrides,
  });
}

function action(params: { disciplineId: string; disciplineName: string; topicId: string; topicName: string; subtopicId: string; subtopicName: string; type: StudyActivityType; priority: number }): StrategicAction {
  return {
    prioridade: params.priority,
    score: 100 - params.priority,
    tempoEstimadoMinutos: 30,
    estimatedDurationMinutes: 30,
    disciplinaId: params.disciplineId,
    disciplinaNome: params.disciplineName,
    assuntoId: params.topicId,
    assuntoNome: params.topicName,
    subassuntoId: params.subtopicId,
    subassuntoNome: params.subtopicName,
    tipo: params.type,
    ganhoEsperado: null,
    riscoEvitado: null,
    hitRate: null,
    custoOportunidade: null,
    justificativaXAI: {
      porQue: "Ação do ranking preservado.",
      dadosUtilizados: "Edital e estado atual.",
      beneficioEsperado: null,
      custoIgnorar: "Risco de lacuna.",
      camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL,
      fatosUtilizados: "Assunto previsto.",
      inferencias: "Método sugerido.",
      dadosAusentes: [],
      nivelConfianca: "MEDIA",
      custoOportunidade: "Não calculado.",
      vetosConsiderados: [],
    },
    camadaConstitucional: ConstitutionalTier.EXPANSAO_EDITAL,
    diagnosticPurpose: false,
    reasonCode: "UNSEEN_THEORY",
    decisionEvidence: {
      knowledgeState: "UNKNOWN" as never,
      sampleSize: 0,
      confidenceScore: 0,
      confidenceLevel: "LOW",
      topicWeightSource: "OFFICIAL",
      historicalIncidenceSource: "UNAVAILABLE",
      historicalIncidenceRate: null,
    },
  };
}

function sessionFor(a: StrategicAction, sequence: number): StudySession {
  return {
    id: `session-${sequence}`,
    sequencia: sequence,
    actionId: getPlannerActionId(a),
    strategicPriority: a.prioridade,
    sourceScore: a.score,
    disciplinaId: a.disciplinaId,
    disciplinaNome: a.disciplinaNome,
    assuntoId: a.assuntoId,
    assuntoNome: a.assuntoNome,
    subassuntoId: a.subassuntoId,
    subassuntoNome: a.subassuntoNome,
    tipo: a.tipo,
    tempoMinutos: 30,
    objetivos: [{ descricao: "Executar a sessão com resultado observável.", indicadorMeta: "Registrar resultado" }],
    passosExecucao: a.tipo === "questoes"
      ? [
          { passo: 1, phase: "SETUP", descricao: "Configurar filtros", tempoMinutos: 5 },
          { passo: 2, phase: "QUESTION_PRACTICE", descricao: "Resolver", tempoMinutos: 15 },
          { passo: 3, phase: "CORRECTION", descricao: "Corrigir", tempoMinutos: 10 },
        ]
      : [
          { passo: 1, phase: "ACTIVATION", descricao: "Ativar", tempoMinutos: 5 },
          { passo: 2, phase: "GUIDED_STUDY", descricao: "Estudar", tempoMinutos: 15 },
          { passo: 3, phase: "CLOSED_BOOK_RECALL", descricao: "Recuperar", tempoMinutos: 10 },
        ],
  };
}

describe("v3.35.3 execution readiness gate", () => {
  it("uses the versioned material and result-capture registries", () => {
    const capability = resolveStudyExecutionCapability(specific.id, database.id);
    expect(capability.notebookStatus).toBe("READY_WITH_FGV_EVIDENCE");
    const packet = executionReadinessGate(baseInput()).packet!;
    expect(packet.resultCapture.routeHint).toBe("Sessão guiada");
  });

  it("blocks a packet without a completion criterion", () => {
    const result = executionReadinessGate(baseInput({ completionCriterion: "" }));
    expect(result.executionStatus).toBe("BLOCKED_NO_EXECUTABLE_PATH");
    expect(result.blockedReasons).toContain("MISSING_COMPLETION_CRITERION");
  });

  it("blocks a packet with non-positive duration", () => {
    const result = executionReadinessGate(baseInput({ durationMinutes: 0 }));
    expect(result.executionStatus).toBe("BLOCKED_NO_EXECUTABLE_PATH");
    expect(result.blockedReasons).toContain("INVALID_DURATION");
  });

  it("excludes orthography material and uses the configured Portuguese theory-only notebook", () => {
    const result = executionReadinessGate(wrongPortugueseInput());
    expect(result.executionStatus).toBe("READY");
    expect(result.materialMatch).toBe("INCOMPATIBLE");
    expect(result.packet?.materialTitle).toBeNull();
    expect(result.packet?.environment).toBe("notebooklm");
  });

  it("does not select the first material of a discipline automatically when a compatible notebook path exists", () => {
    const result = executionReadinessGate(wrongPortugueseInput());
    expect(result.packet?.materialTitle).toBeNull();
    expect(result.materialMatch).toBe("INCOMPATIBLE");
  });

  it("registers Portuguese as theory-only while FGV evidence remains pending and style teaching disabled", () => {
    const capability = resolveStudyExecutionCapability(portuguese.id, interpretation.id);
    expect(capability.notebookStatus).toBe("READY_THEORY_ONLY");
    expect(capability.fgvEvidenceStatus).toBe("PENDING");
    expect(capability.fgvStyleTeaching).toBe("DISABLED");
  });

  it("keeps Portuguese FGV-style teaching disabled while evidence is pending", () => {
    const packet = executionReadinessGate(wrongPortugueseInput({ material: null })).packet!;
    expect(packet.notebook).toMatchObject({
      status: "READY_THEORY_ONLY",
      fgvEvidenceStatus: "PENDING",
      fgvStyleTeaching: "DISABLED",
    });
    expect(packet.notebook?.fgvEvidenceBoundary).toMatch(/Não faça afirmações/i);
    expect(packet.prompt).not.toMatch(/No conjunto documental selecionado/i);
  });

  it("allows Banco de Dados to use the configured NotebookLM", () => {
    const result = executionReadinessGate(baseInput());
    expect(result.executionStatus).toBe("READY");
    expect(result.packet?.notebook).toMatchObject({ name: "DATAPREV 2026 — Banco de Dados — Tutor FGV", status: "READY_WITH_FGV_EVIDENCE" });
  });

  it("prioritizes a material exact to the subtopic", () => {
    expect(assessStudyMaterialMatch({ disciplineId: specific.id, topicId: database.id, subtopicId: dbSubtopic.id, candidate: candidate(), materialCatalog: DATAPREV_2026_PRIVATE_STUDY_MATERIALS })).toBe("EXACT_SUBTOPIC");
  });

  it("accepts a material exact to the topic", () => {
    const topicCandidate = candidate(dbMaterial, dbSection, "TOPIC_FALLBACK");
    expect(assessStudyMaterialMatch({ disciplineId: specific.id, topicId: database.id, candidate: topicCandidate })).toBe("EXACT_TOPIC");
  });

  it("keeps an unverified broad material unselected", () => {
    const broad: StudyExecutionMaterialCandidate = { materialId: "broad", materialTitle: "Conhecimentos Específicos — curso completo" };
    expect(assessStudyMaterialMatch({ disciplineId: specific.id, topicId: database.id, subtopicId: dbSubtopic.id, candidate: broad })).toBe("UNVERIFIED");
  });

  it("uses the configured theory-only notebook when a guided theory session has no matching material", () => {
    const result = executionReadinessGate(wrongPortugueseInput({ requestedEnvironment: "guided_session", material: null }));
    expect(result.executionStatus).toBe("READY");
    expect(result.effectiveEnvironment).toBe("notebooklm");
    expect(result.methodChanged).toBe(true);
    expect(result.packet?.notebook).toMatchObject({
      status: "READY_THEORY_ONLY",
      fgvEvidenceStatus: "PENDING",
      fgvStyleTeaching: "DISABLED",
    });
  });

  it("uses an executable alternative environment when NotebookLM is unavailable", () => {
    const result = executionReadinessGate(wrongPortugueseInput({ requestedMethod: "short_question_batch", requestedEnvironment: "qconcursos", material: null, targetQuestions: 5, examiningBoard: "FGV" }));
    expect(result.executionStatus).toBe("READY");
    expect(result.packet?.environment).toBe("qconcursos");
  });

  it("keeps the original Portuguese ranking candidate when its theory-only notebook path is executable", () => {
    const top = action({ disciplineId: portuguese.id, disciplineName: portuguese.nome, topicId: interpretation.id, topicName: interpretation.nome, subtopicId: interpretationSubtopic.id, subtopicName: interpretationSubtopic.nome, type: "teoria", priority: 1 });
    const next = action({ disciplineId: specific.id, disciplineName: specific.nome, topicId: database.id, topicName: database.nome, subtopicId: dbSubtopic.id, subtopicName: dbSubtopic.nome, type: "questoes", priority: 2 });
    const planner: PlannerResponse = {
      status: "SUCCESS",
      plan: {
        id: "plan-gate",
        estrategiaId: "NORMAL",
        estrategiaNome: "Normal",
        tempoDisponivelMinutos: 60,
        tempoTotalPlanejadoMinutos: 60,
        tempoNaoAlocadoMinutos: 0,
        blocos: [{ id: "block", nome: "Plano", tempoTotalMinutos: 60, sessões: [sessionFor(top, 1), sessionFor(next, 2)] }],
        metaGeral: "Executar",
        justificativaEstrategica: "Ranking preservado",
        adjustments: [],
        deferredActions: [],
      },
    };
    const result = buildDailyStudyPrescription({
      concursoId: "dataprev-2026-perfil-3",
      referenceDate: "2026-07-20",
      planner,
      actions: [top, next],
      materialCatalog: DATAPREV_2026_PRIVATE_STUDY_MATERIALS,
      externalQuestionBanks: [{ id: "qconcursos", provider: "QCONCURSOS", displayName: "QConcursos", accessMode: "USER_SUBSCRIPTION", enabled: true }],
      banca: "FGV",
      attempts: [],
      examPacing: { durationMinutes: 240, totalQuestions: 70 },
      questionPolicy: { minimumObservedSamples: 3, mediumConfidenceSamples: 5, highConfidenceSamples: 20, stretchQuestions: 1, diagnosticMinimumQuestions: 5 },
    });
    expect(result.current?.topicId).toBe(interpretation.id);
    expect(result.current?.executionPacket?.environment).toBe("notebooklm");
    expect(result.current?.executionPacket?.notebook).toMatchObject({
      status: "READY_THEORY_ONLY",
      fgvEvidenceStatus: "PENDING",
      fgvStyleTeaching: "DISABLED",
    });
    expect(result.blockedCandidates).toHaveLength(0);
    expect([top.prioridade, next.prioridade]).toEqual([1, 2]);
  });

  it("creates a complete studyExecutionPacket", () => {
    const packet = executionReadinessGate(baseInput()).packet!;
    expect(packet).toMatchObject({ executionId: expect.any(String), disciplineId: specific.id, topicId: database.id, method: "theory_notebooklm", environment: "notebooklm", durationMinutes: 35, objective: expect.any(String), contentScope: expect.any(String), sectionsOrPages: expect.any(String), environmentInstructions: expect.any(Array), selectedSources: expect.any(Array), sourcesToDisable: expect.any(Array), prompt: expect.any(String), completionCriterion: expect.any(String), resultCapture: expect.any(Object), returnInstructions: expect.any(String), confidence: expect.any(String), limitations: expect.any(Array) });
  });

  it("generates a non-empty operational prompt", () => expect(executionReadinessGate(baseInput()).packet?.prompt.trim().length).toBeGreaterThan(100));
  it("shows the exact prescribed content", () => expect(executionReadinessGate(baseInput()).packet?.contentScope).toContain(dbSubtopic.nome));
  it("shows pages when available", () => expect(executionReadinessGate(baseInput()).packet?.sectionsOrPages).toMatch(/Páginas \d+–\d+/));
  it("declares the absence of pages when they do not apply", () => expect(executionReadinessGate(baseInput({ requestedMethod: "short_question_batch", requestedEnvironment: "qconcursos", material: null, targetQuestions: 5 })).packet?.sectionsOrPages).toMatch(/não se aplicam/i));
  it("shows a completion criterion", () => expect(executionReadinessGate(baseInput()).packet?.completionCriterion).toMatch(/Explicar/));
  it("shows the fields to register", () => expect(executionReadinessGate(baseInput()).packet?.resultCapture.fields).toContain("duração real"));
  it("shows NotebookLM mode and response length", () => expect(executionReadinessGate(baseInput()).packet?.notebook).toMatchObject({ mode: "Personalizado", responseLength: "Mais longa" }));
  it("shows active NotebookLM sources", () => expect(executionReadinessGate(baseInput()).packet?.selectedSources).toContain("Edital DATAPREV 2026"));
  it("shows sources disabled by default", () => expect(executionReadinessGate(baseInput()).packet?.sourcesToDisable).toEqual(expect.arrayContaining(["Conversas do Gemini (1)", "Aula 08 — Data Mining", "Aula 11 — Inteligência Artificial"])));
  it("limits FGV claims to the selected documentary set", () => {
    const packet = executionReadinessGate(baseInput({ forceFgvEvidenceUse: true })).packet!;
    expect(packet.selectedSources.join(" ")).toMatch(/Pacote FGV/i);
    expect(packet.notebook?.fgvEvidenceBoundary).toMatch(/No conjunto documental selecionado/i);
    expect(packet.prompt).not.toMatch(/A FGV sempre cobra|A FGV prefere|mais incidente/i);
  });
  it("does not claim FGV patterns without selecting FGV evidence", () => expect(executionReadinessGate(baseInput()).packet?.notebook?.fgvEvidenceBoundary).toMatch(/Não faça afirmações|não faça afirmações/i));
  it("does not treat QConcursos as an examining board", () => {
    const packet = executionReadinessGate(wrongPortugueseInput({ requestedMethod: "short_question_batch", requestedEnvironment: "qconcursos", material: null, targetQuestions: 5, examiningBoard: null })).packet!;
    expect(packet.questionFilters?.source).toBe("QConcursos");
    expect(packet.questionFilters?.examiningBoard).toBeNull();
  });
  it("keeps question filters structured", () => expect(executionReadinessGate(baseInput({ requestedMethod: "short_question_batch", requestedEnvironment: "qconcursos", material: null, targetQuestions: 5, examiningBoard: "FGV" })).packet?.questionFilters).toMatchObject({ source: "QConcursos", examiningBoard: "FGV", excludeAnnulled: true, excludeOutdated: true, targetQuestions: 5 }));
  it("varies result capture by method", () => {
    expect(executionReadinessGate(baseInput()).packet?.resultCapture.kind).toBe("theory");
    expect(executionReadinessGate(baseInput({ requestedMethod: "short_question_batch", requestedEnvironment: "qconcursos", material: null, targetQuestions: 5 })).packet?.resultCapture.kind).toBe("questions");
  });
  it("copies the complete prompt through the supplied clipboard", async () => {
    let copied = "";
    await copyStudyExecutionPrompt("prompt operacional", { writeText: async (value) => { copied = value; } });
    expect(copied).toBe("prompt operacional");
  });

  it("renders user-facing material correspondence without internal tokens", () => {
    const packet = executionReadinessGate(baseInput()).packet!;
    const html = renderToStaticMarkup(<StudyExecutionPacketView packet={packet} />);
    expect(html).toContain("Correspondência do material");
    expect(html).toContain(studyMaterialMatchLabel("EXACT_SUBTOPIC"));
    expect(html).not.toContain("Confiança do vínculo: topic");
    expect(html).toContain("Copiar prompt");
    expect(html).toContain('href="#/registrar-resultado"');
  });
});
