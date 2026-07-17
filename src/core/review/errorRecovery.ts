import type {
  AnswerConfidence,
  ErrorCause,
  ErrorCorrectionInput,
  ErrorRecoveryCase,
  ErrorRecoveryCaseState,
  ErrorRecoveryEpisode,
  ErrorRecoveryEvent,
  ErrorRecoveryProtocol,
  LegacyErrorRecoveryAttempt,
} from "./types";

export const ERROR_RECOVERY_POLICY_VERSION = "ERROR_RECOVERY_EVIDENCE_V1";

/**
 * Two independent successful verification episodes are required before a case
 * becomes stable. This reuses the product's existing two-success recovery
 * semantics and never means permanent mastery.
 */
export const ERROR_RECOVERY_CONFIRMATIONS_REQUIRED = 2;

const PROTOCOLS: Record<ErrorCause, ErrorRecoveryProtocol> = {
  LACUNA_CONTEUDO: {
    cause: "LACUNA_CONTEUDO",
    label: "Lacuna de conteúdo",
    objective: "Reconstruir o conceito exato que faltou, sem reler todo o assunto.",
    steps: [
      "Identifique a definição, regra ou distinção exata que faltou.",
      "Consulte somente o trecho necessário e feche o material.",
      "Explique a regra com suas palavras e registre um critério de decisão.",
      "Resolva outra questão equivalente sem consulta.",
    ],
  },
  INTERPRETACAO: {
    cause: "INTERPRETACAO",
    label: "Interpretação do enunciado",
    objective: "Tornar explícito o comando e os qualificadores ignorados.",
    steps: [
      "Reescreva o que a questão realmente pediu em uma frase curta.",
      "Liste negações, exceções, escopo e palavras absolutas relevantes.",
      "Explique por que a alternativa escolhida não respondia ao comando.",
      "Resolva outra questão equivalente aplicando o mesmo checklist.",
    ],
  },
  APLICACAO: {
    cause: "APLICACAO",
    label: "Aplicação do conhecimento",
    objective: "Transformar conhecimento declarativo em passos de decisão.",
    steps: [
      "Registre a regra que você conhecia, mas não conseguiu aplicar.",
      "Escreva a sequência de decisão usada no cenário da questão.",
      "Identifique o ponto exato em que a aplicação desviou.",
      "Resolva uma variação do cenário sem consultar a solução.",
    ],
  },
  MEMORIA: {
    cause: "MEMORIA",
    label: "Falha de recuperação da memória",
    objective: "Criar uma pista de recuperação e provar lembrança sem consulta.",
    steps: [
      "Defina uma pista curta para recuperar a informação esquecida.",
      "Feche o material e escreva a resposta de memória.",
      "Compare com a fonte e corrija somente o que faltou.",
      "Recupere novamente em outra questão ou revisão posterior.",
    ],
  },
  "DISTRAÇÃO": {
    cause: "DISTRAÇÃO",
    label: "Distração",
    objective: "Criar uma barreira operacional contra o mesmo descuido.",
    steps: [
      "Nomeie o detalhe objetivo que foi ignorado.",
      "Defina uma verificação curta antes de marcar a resposta.",
      "Refaça a questão verificando enunciado, alternativa e comando.",
      "Use o mesmo checklist em outra questão sem aumentar o tempo excessivamente.",
    ],
  },
  PRESSAO_TEMPO: {
    cause: "PRESSAO_TEMPO",
    label: "Pressão de tempo",
    objective: "Separar falta de conhecimento de execução lenta ou precipitada.",
    steps: [
      "Resolva novamente sem limite de tempo e registre o raciocínio correto.",
      "Identifique a etapa que consumiu tempo ou foi abreviada indevidamente.",
      "Defina um ponto de corte para avançar ou retornar à questão.",
      "Resolva outra questão equivalente cronometrada e compare o processo.",
    ],
  },
  DESCONHECIDA: {
    cause: "DESCONHECIDA",
    label: "Causa ainda não confirmada",
    objective: "Classificar a causa com base no que aconteceu, sem inferência automática.",
    steps: [
      "Compare seu raciocínio com a solução e localize o primeiro desvio.",
      "Escolha a causa que melhor descreve esse desvio.",
      "Registre a correção específica e uma regra preventiva.",
      "Somente então faça uma nova tentativa sem consulta.",
    ],
  },
};

export function getErrorRecoveryProtocol(cause: ErrorCause): ErrorRecoveryProtocol {
  return PROTOCOLS[cause];
}

function eventId(caseId: string, type: ErrorRecoveryEvent["type"], recordedAt: string, suffix: number): string {
  return `${caseId}-${type.toLowerCase()}-${recordedAt.replace(/\D/g, "")}-${suffix}`;
}

function appendEvent(caseItem: ErrorRecoveryCase, event: Omit<ErrorRecoveryEvent, "id">): ErrorRecoveryCase {
  return {
    ...caseItem,
    updatedAt: event.recordedAt,
    events: [
      ...caseItem.events,
      { ...event, id: eventId(caseItem.id, event.type, event.recordedAt, caseItem.events.length + 1) },
    ],
  };
}

function latestValue<T>(events: readonly ErrorRecoveryEvent[], pick: (event: ErrorRecoveryEvent) => T | undefined): T | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = pick(events[index]);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function deriveErrorRecoveryCaseState(caseItem: ErrorRecoveryCase): ErrorRecoveryCaseState {
  const lastReopenIndex = caseItem.events.reduce(
    (result, event, index) =>
      event.type === "OPENED" || event.type === "ERROR_RECORDED" || event.type === "REOPENED"
        ? index
        : result,
    -1,
  );
  const activeEvents = caseItem.events.slice(Math.max(0, lastReopenIndex));
  const activeCause = latestValue(activeEvents, (event) => event.cause) ?? "DESCONHECIDA";
  const correctionSummary = latestValue(activeEvents, (event) => event.correctionSummary);
  const preventionRule = latestValue(activeEvents, (event) => event.preventionRule);
  const verificationPasses = activeEvents.filter((event) => event.type === "VERIFICATION_PASSED").length;
  const lastEvent = caseItem.events.at(-1);
  const lastErrorAt = latestValue(caseItem.events, (event) =>
    event.type === "OPENED" || event.type === "ERROR_RECORDED" || event.type === "REOPENED"
      ? event.recordedAt
      : undefined,
  ) ?? caseItem.openedAt;
  const sourceAttemptIds = caseItem.events.flatMap((event) => event.attemptIds ?? []);

  let status: ErrorRecoveryCaseState["status"];
  if (verificationPasses >= ERROR_RECOVERY_CONFIRMATIONS_REQUIRED) status = "STABILIZED";
  else if (verificationPasses === 1) status = "RECOVERED_PROVISIONALLY";
  else if (correctionSummary && preventionRule && activeCause !== "DESCONHECIDA") status = "READY_FOR_VERIFICATION";
  else if (activeCause === "DESCONHECIDA") status = "PENDING_CLASSIFICATION";
  else status = "PENDING_CORRECTION";

  if (lastEvent?.type === "REOPENED" || lastEvent?.type === "ERROR_RECORDED") {
    status = activeCause === "DESCONHECIDA" ? "PENDING_CLASSIFICATION" : "PENDING_CORRECTION";
  }

  return {
    status,
    activeCause,
    correctionSummary,
    preventionRule,
    verificationPasses,
    confirmationsRequired: ERROR_RECOVERY_CONFIRMATIONS_REQUIRED,
    lastErrorAt,
    sourceAttemptIds: [...new Set(sourceAttemptIds)],
    lastEventAt: lastEvent?.recordedAt ?? caseItem.updatedAt,
  };
}

function isIndependentVerification(episode: ErrorRecoveryEpisode): boolean {
  return (
    episode.correct === true &&
    episode.consultedMaterial !== true &&
    (episode.confidence === "MEDIA" || episode.confidence === "ALTA")
  );
}

export function applyErrorRecoveryEpisode(
  cases: readonly ErrorRecoveryCase[],
  episode: ErrorRecoveryEpisode,
): ErrorRecoveryCase[] {
  const currentIndex = cases.findIndex((item) => item.subassuntoId === episode.subassuntoId);
  const existing = currentIndex >= 0 ? cases[currentIndex] : null;

  if (!existing) {
    if (episode.correct) return [...cases];
    const caseId = `error-case-${episode.subassuntoId}`;
    let created: ErrorRecoveryCase = {
      id: caseId,
      disciplinaId: episode.disciplinaId,
      assuntoId: episode.assuntoId,
      subassuntoId: episode.subassuntoId,
      policyVersion: ERROR_RECOVERY_POLICY_VERSION,
      openedAt: episode.recordedAt,
      updatedAt: episode.recordedAt,
      events: [],
    };
    created = appendEvent(created, {
      type: "OPENED",
      recordedAt: episode.recordedAt,
      attemptIds: episode.attemptIds,
      cause: episode.declaredCause ?? "DESCONHECIDA",
      note: episode.note,
    });
    return [...cases, created];
  }

  const state = deriveErrorRecoveryCaseState(existing);
  let updated = existing;
  if (!episode.correct) {
    updated = appendEvent(existing, {
      type: state.status === "STABILIZED" || state.status === "RECOVERED_PROVISIONALLY" ? "REOPENED" : "ERROR_RECORDED",
      recordedAt: episode.recordedAt,
      attemptIds: episode.attemptIds,
      cause: episode.declaredCause ?? state.activeCause,
      note: episode.note,
    });
  } else if (
    state.status === "READY_FOR_VERIFICATION" ||
    state.status === "RECOVERED_PROVISIONALLY"
  ) {
    updated = appendEvent(existing, {
      type: isIndependentVerification(episode) ? "VERIFICATION_PASSED" : "VERIFICATION_INSUFFICIENT",
      recordedAt: episode.recordedAt,
      attemptIds: episode.attemptIds,
      consultedMaterial: episode.consultedMaterial,
      confidence: episode.confidence,
      note: isIndependentVerification(episode)
        ? "Acerto independente registrado como evidência de recuperação."
        : "O resultado não confirmou recuperação independente: exige acerto sem consulta e confiança média ou alta.",
    });
  }

  return cases.map((item, index) => (index === currentIndex ? updated : item));
}

export function recordErrorCorrection(
  cases: readonly ErrorRecoveryCase[],
  caseId: string,
  input: ErrorCorrectionInput,
): { cases: ErrorRecoveryCase[]; error?: string } {
  const index = cases.findIndex((item) => item.id === caseId);
  if (index < 0) return { cases: [...cases], error: "Caso de erro inexistente." };
  const correctionSummary = input.correctionSummary.trim();
  const preventionRule = input.preventionRule.trim();
  if (input.cause === "DESCONHECIDA") {
    return { cases: [...cases], error: "Confirme uma causa antes de registrar a correção." };
  }
  if (!correctionSummary) return { cases: [...cases], error: "Registre o que foi corrigido." };
  if (!preventionRule) return { cases: [...cases], error: "Registre como evitar o mesmo erro." };
  if (correctionSummary.length > 2000 || preventionRule.length > 1000) {
    return { cases: [...cases], error: "A correção excede o limite de texto permitido." };
  }

  let updated = appendEvent(cases[index], {
    type: "CAUSE_CONFIRMED",
    recordedAt: input.recordedAt,
    cause: input.cause,
  });
  updated = appendEvent(updated, {
    type: "CORRECTION_RECORDED",
    recordedAt: input.recordedAt,
    cause: input.cause,
    correctionSummary,
    preventionRule,
  });
  return {
    cases: cases.map((item, itemIndex) => (itemIndex === index ? updated : item)),
  };
}

export function confidenceLabel(confidence?: AnswerConfidence): string {
  if (confidence === "ALTA") return "alta";
  if (confidence === "MEDIA") return "média";
  if (confidence === "BAIXA") return "baixa";
  return "não informada";
}


/**
 * Builds conservative recovery cases for snapshots created before this feature.
 * Earlier correct answers are not promoted to recovery evidence because no
 * explicit correction had been recorded at the time.
 */
export function buildLegacyErrorRecoveryCases(
  attempts: readonly LegacyErrorRecoveryAttempt[],
): ErrorRecoveryCase[] {
  const latestErrorBySubtopic = new Map<string, LegacyErrorRecoveryAttempt>();
  for (const attempt of attempts) {
    if (attempt.acertou || !attempt.subassuntoId) continue;
    const current = latestErrorBySubtopic.get(attempt.subassuntoId);
    if (!current || current.respondidaEm.localeCompare(attempt.respondidaEm) <= 0) {
      latestErrorBySubtopic.set(attempt.subassuntoId, attempt);
    }
  }

  return [...latestErrorBySubtopic.values()]
    .sort((left, right) => left.subassuntoId!.localeCompare(right.subassuntoId!))
    .reduce<ErrorRecoveryCase[]>((cases, attempt) =>
      applyErrorRecoveryEpisode(cases, {
        disciplinaId: attempt.disciplinaId,
        assuntoId: attempt.assuntoId,
        subassuntoId: attempt.subassuntoId!,
        attemptIds: [attempt.id],
        recordedAt: attempt.respondidaEm,
        correct: false,
        declaredCause: attempt.erroCausa ?? "DESCONHECIDA",
        note: attempt.erroNota ?? "Erro legado migrado sem inventar evidência de correção.",
      }),
    []);
}
