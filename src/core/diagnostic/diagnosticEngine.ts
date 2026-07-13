import type {
  DiagnosticAttemptInput,
  EvidenceCoverageInput,
  EvidenceCoverageReport,
  EvidenceCoverageState,
  EvidenceRoadmapAction,
  SubtopicEvidenceProfile
} from "./types";

const ALL_STATES: EvidenceCoverageState[] = [
  "NO_LEARNING_EVIDENCE",
  "THEORY_WITHOUT_RETRIEVAL",
  "INITIAL_RETRIEVAL_EVIDENCE",
  "INITIAL_QUESTION_EVIDENCE",
  "REPEATED_RETRIEVAL_EVIDENCE",
  "REPEATED_QUESTION_EVIDENCE",
  "ACTIVE_ERROR",
  "RECOVERY_OBSERVED",
  "RECOVERY_REPEATED"
];

function assertTimestamp(value: string, field: string): void {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} inválido: ${value}`);
}

function latestTimestamp(values: string[]): string | null {
  if (values.length === 0) return null;
  return [...values].sort().at(-1) ?? null;
}

function dateKey(timestamp: string): string {
  assertTimestamp(timestamp, "timestamp");
  return timestamp.slice(0, 10);
}

function analyzeErrors(attempts: DiagnosticAttemptInput[]): {
  lastErrorAt: string | null;
  correctAfterLastError: number;
} {
  const ordered = [...attempts].sort(
    (left, right) =>
      left.respondidaEm.localeCompare(right.respondidaEm) ||
      left.id.localeCompare(right.id)
  );
  const lastError = [...ordered].reverse().find((attempt) => !attempt.acertou);
  if (!lastError) return { lastErrorAt: null, correctAfterLastError: 0 };
  return {
    lastErrorAt: lastError.respondidaEm,
    correctAfterLastError: ordered.filter(
      (attempt) => attempt.acertou && attempt.respondidaEm > lastError.respondidaEm
    ).length
  };
}

function determineState(args: {
  theoryCompleted: boolean;
  attempts: number;
  distinctAttemptDays: number;
  reviewCompletions: number;
  independentRetrievals: number;
  lastErrorAt: string | null;
  correctAfterLastError: number;
}): EvidenceCoverageState {
  if (args.lastErrorAt) {
    if (args.correctAfterLastError === 0) return "ACTIVE_ERROR";
    if (args.correctAfterLastError === 1) return "RECOVERY_OBSERVED";
    return "RECOVERY_REPEATED";
  }
  if (args.attempts > 0) {
    return args.attempts >= 3 && args.distinctAttemptDays >= 2
      ? "REPEATED_QUESTION_EVIDENCE"
      : "INITIAL_QUESTION_EVIDENCE";
  }
  if (args.independentRetrievals >= 2) return "REPEATED_RETRIEVAL_EVIDENCE";
  if (args.reviewCompletions > 0) return "INITIAL_RETRIEVAL_EVIDENCE";
  if (args.theoryCompleted) return "THEORY_WITHOUT_RETRIEVAL";
  return "NO_LEARNING_EVIDENCE";
}

function missingEvidenceFor(profile: Omit<SubtopicEvidenceProfile, "missingEvidence">): string[] {
  const missing: string[] = [];
  if (!profile.theoryCompleted) missing.push("não há confirmação explícita de cobertura teórica");
  if (profile.attempts === 0) missing.push("não há tentativa real de questão classificada no subassunto");
  if (profile.attempts > 0 && profile.distinctAttemptDays < 2) {
    missing.push("as tentativas estão concentradas em um único dia");
  }
  if (profile.reviewCompletions === 0) missing.push("não há recuperação programada registrada");
  return missing;
}

function roadmapRank(state: EvidenceCoverageState): number {
  switch (state) {
    case "ACTIVE_ERROR":
      return 0;
    case "RECOVERY_OBSERVED":
      return 1;
    case "THEORY_WITHOUT_RETRIEVAL":
      return 2;
    case "INITIAL_QUESTION_EVIDENCE":
    case "INITIAL_RETRIEVAL_EVIDENCE":
      return 3;
    case "NO_LEARNING_EVIDENCE":
      return 4;
    case "RECOVERY_REPEATED":
    case "REPEATED_RETRIEVAL_EVIDENCE":
    case "REPEATED_QUESTION_EVIDENCE":
      return 5;
  }
}

function roadmapAction(profile: SubtopicEvidenceProfile): EvidenceRoadmapAction | null {
  const facts = [
    `${profile.attempts} tentativa(s) real(is)`,
    `${profile.reviewCompletions} revisão(ões) registrada(s)`,
    `${profile.correctAfterLastError} acerto(s) após o último erro`
  ];
  switch (profile.state) {
    case "ACTIVE_ERROR":
      return {
        kind: "RECOVERY",
        ...identity(profile),
        state: profile.state,
        reason: "Existe erro real sem acerto posterior; priorizar correção e nova recuperação antes de ampliar o intervalo.",
        evidenceFacts: facts
      };
    case "RECOVERY_OBSERVED":
      return {
        kind: "RECOVERY",
        ...identity(profile),
        state: profile.state,
        reason: "Há apenas um acerto após o último erro; buscar nova recuperação independente em sessão separada.",
        evidenceFacts: facts
      };
    case "THEORY_WITHOUT_RETRIEVAL":
      return {
        kind: "DIAGNOSTIC_QUESTIONS",
        ...identity(profile),
        state: profile.state,
        reason: "A teoria foi confirmada, mas ainda não existe recuperação ou questão real para verificar aplicação.",
        evidenceFacts: facts
      };
    case "INITIAL_QUESTION_EVIDENCE":
    case "INITIAL_RETRIEVAL_EVIDENCE":
      return {
        kind: "DIAGNOSTIC_QUESTIONS",
        ...identity(profile),
        state: profile.state,
        reason: "A evidência existe, mas ainda é inicial ou concentrada; coletar pequena amostra em outro momento.",
        evidenceFacts: facts
      };
    case "NO_LEARNING_EVIDENCE":
      return {
        kind: "NEW_CONTENT",
        ...identity(profile),
        state: profile.state,
        reason: "Não há cobertura teórica confirmada nem evidência de recuperação; tratar como avanço de edital, não como revisão.",
        evidenceFacts: facts
      };
    case "RECOVERY_REPEATED":
    case "REPEATED_RETRIEVAL_EVIDENCE":
    case "REPEATED_QUESTION_EVIDENCE":
      return null;
  }
}

function identity(profile: SubtopicEvidenceProfile) {
  return {
    disciplinaId: profile.disciplinaId,
    disciplinaNome: profile.disciplinaNome,
    assuntoId: profile.assuntoId,
    assuntoNome: profile.assuntoNome,
    subassuntoId: profile.subassuntoId,
    subassuntoNome: profile.subassuntoNome
  };
}

export function buildEvidenceCoverageReport(input: EvidenceCoverageInput): EvidenceCoverageReport {
  assertTimestamp(input.generatedAt, "generatedAt");
  const disciplineById = new Map(input.disciplines.map((item) => [item.id, item]));
  const topicById = new Map(input.topics.map((item) => [item.id, item]));
  const activeSubtopics = input.subtopics.filter((item) => !item.isDeleted);
  const attemptsBySubtopic = new Map<string, DiagnosticAttemptInput[]>();
  for (const attempt of input.attempts) {
    assertTimestamp(attempt.respondidaEm, "respondidaEm");
    if (!attempt.subassuntoId) continue;
    const current = attemptsBySubtopic.get(attempt.subassuntoId) ?? [];
    current.push(attempt);
    attemptsBySubtopic.set(attempt.subassuntoId, current);
  }

  const reviewsBySubtopic = new Map(
    input.reviewSchedules
      .filter((item) => !item.isDeleted && !item.desabilitada)
      .map((item) => [item.subassuntoId, item])
  );

  const profiles = activeSubtopics.map((subtopic): SubtopicEvidenceProfile => {
    const topic = topicById.get(subtopic.assuntoId);
    if (!topic) throw new Error(`Assunto ausente para o subassunto ${subtopic.id}.`);
    const discipline = disciplineById.get(topic.disciplinaId);
    if (!discipline) throw new Error(`Disciplina ausente para o assunto ${topic.id}.`);
    const attempts = attemptsBySubtopic.get(subtopic.id) ?? [];
    const review = reviewsBySubtopic.get(subtopic.id);
    const history = review?.historicoTentativas ?? [];
    for (const item of history) assertTimestamp(item.revisadoEm, "revisadoEm");
    const error = analyzeErrors(attempts);
    const base = {
      disciplinaId: discipline.id,
      disciplinaNome: discipline.nome,
      assuntoId: topic.id,
      assuntoNome: topic.nome,
      subassuntoId: subtopic.id,
      subassuntoNome: subtopic.nome,
      officialDisciplineMaxPoints: discipline.officialMaxPoints,
      theoryCompleted: subtopic.completado,
      attempts: attempts.length,
      correctAttempts: attempts.filter((item) => item.acertou).length,
      observedAccuracy:
        attempts.length > 0
          ? attempts.filter((item) => item.acertou).length / attempts.length
          : null,
      distinctAttemptDays: new Set(attempts.map((item) => dateKey(item.respondidaEm))).size,
      reviewCompletions: history.length,
      independentRetrievals: history.filter(
        (item) => item.recuperacaoIndependente === true && item.usouAjuda !== true
      ).length,
      lastEvidenceAt: latestTimestamp([
        ...attempts.map((item) => item.respondidaEm),
        ...history.map((item) => item.revisadoEm)
      ]),
      lastErrorAt: error.lastErrorAt,
      correctAfterLastError: error.correctAfterLastError,
      state: "NO_LEARNING_EVIDENCE" as EvidenceCoverageState
    };
    base.state = determineState(base);
    return { ...base, missingEvidence: missingEvidenceFor(base) };
  });

  profiles.sort((left, right) =>
    right.officialDisciplineMaxPoints - left.officialDisciplineMaxPoints ||
    (disciplineById.get(left.disciplinaId)?.ordem ?? 0) -
      (disciplineById.get(right.disciplinaId)?.ordem ?? 0) ||
    (topicById.get(left.assuntoId)?.ordem ?? 0) -
      (topicById.get(right.assuntoId)?.ordem ?? 0) ||
    (activeSubtopics.find((item) => item.id === left.subassuntoId)?.ordem ?? 0) -
      (activeSubtopics.find((item) => item.id === right.subassuntoId)?.ordem ?? 0) ||
    left.subassuntoId.localeCompare(right.subassuntoId)
  );

  const countsByState = Object.fromEntries(
    ALL_STATES.map((state) => [state, profiles.filter((item) => item.state === state).length])
  ) as Record<EvidenceCoverageState, number>;

  const disciplines = input.disciplines
    .map((discipline) => {
      const items = profiles.filter((item) => item.disciplinaId === discipline.id);
      return {
        disciplinaId: discipline.id,
        disciplinaNome: discipline.nome,
        officialMaxPoints: discipline.officialMaxPoints,
        totalSubtopics: items.length,
        noLearningEvidence: items.filter((item) => item.state === "NO_LEARNING_EVIDENCE").length,
        theoryConfirmed: items.filter((item) => item.theoryCompleted).length,
        withQuestionEvidence: items.filter((item) => item.attempts > 0).length,
        withRepeatedQuestionEvidence: items.filter(
          (item) => item.state === "REPEATED_QUESTION_EVIDENCE" || item.state === "RECOVERY_REPEATED"
        ).length,
        activeErrorOrRecovery: items.filter(
          (item) => item.state === "ACTIVE_ERROR" || item.state === "RECOVERY_OBSERVED"
        ).length
      };
    })
    .sort((left, right) =>
      right.officialMaxPoints - left.officialMaxPoints ||
      left.disciplinaNome.localeCompare(right.disciplinaNome)
    );

  const roadmap = profiles
    .map((profile) => ({ profile, action: roadmapAction(profile) }))
    .filter((item): item is { profile: SubtopicEvidenceProfile; action: EvidenceRoadmapAction } => Boolean(item.action))
    .sort((left, right) =>
      roadmapRank(left.profile.state) - roadmapRank(right.profile.state) ||
      right.profile.officialDisciplineMaxPoints - left.profile.officialDisciplineMaxPoints ||
      left.profile.subassuntoId.localeCompare(right.profile.subassuntoId)
    )
    .slice(0, Math.max(1, input.maxRoadmapItems ?? 12))
    .map((item) => item.action);

  return {
    generatedAt: input.generatedAt,
    totalSubtopics: profiles.length,
    countsByState,
    descriptiveCoverage: {
      theoryConfirmed: profiles.filter((item) => item.theoryCompleted).length,
      withAnyRetrievalEvidence: profiles.filter(
        (item) => item.attempts > 0 || item.reviewCompletions > 0
      ).length,
      withQuestionEvidence: profiles.filter((item) => item.attempts > 0).length,
      withRepeatedQuestionEvidence: profiles.filter(
        (item) => item.state === "REPEATED_QUESTION_EVIDENCE" || item.state === "RECOVERY_REPEATED"
      ).length,
      activeErrorWithoutRecovery: profiles.filter((item) => item.state === "ACTIVE_ERROR").length
    },
    disciplines,
    profiles,
    roadmap,
    caveats: [
      "Os estados descrevem cobertura de evidências registradas; não representam domínio, nota prevista ou probabilidade de aprovação.",
      "Três tentativas em dois dias são apenas um limiar operacional para distinguir evidência inicial de repetida, não um critério científico universal.",
      "A ordem do roteiro usa risco observado e pontuação oficial da disciplina; dentro de uma disciplina sem distribuição oficial, preserva ordem determinística do edital."
    ]
  };
}
