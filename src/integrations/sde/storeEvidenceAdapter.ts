/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CronogramaRevisao,
  Flashcard,
  SessaoEstudo,
  Subassunto,
  TentativaQuestaoUsuario
} from "../../types";
import {
  EvidenciaSubassunto,
  EvidenciasCandidato,
  RevisaoHistorico,
  TentativaQuestao
} from "../../core/sde/prioritization/types";

export interface StoreEvidenceSnapshot {
  concursoId: string;
  referenceDate: string;
  timeZone: string;
  subassuntos: Subassunto[];
  tentativasQuestoes: TentativaQuestaoUsuario[];
  sessoesEstudo: SessaoEstudo[];
  flashcards: Flashcard[];
  cronogramasRevisao: CronogramaRevisao[];
}

function timestampToDateKey(timestamp: string, timeZone: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data inválida nas evidências: '${timestamp}'.`);
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toDateKey(value: string, timeZone: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : timestampToDateKey(value, timeZone);
}

function latestDate(values: (string | undefined)[]): string | undefined {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) return undefined;
  return [...valid].sort().at(-1);
}

function mapAttempts(
  concursoId: string,
  subassuntoId: string,
  attempts: TentativaQuestaoUsuario[],
  timeZone: string
): TentativaQuestao[] {
  return attempts
    .filter(
      (attempt) =>
        attempt.concursoId === concursoId &&
        attempt.subassuntoId === subassuntoId
    )
    .map((attempt) => ({
      id: attempt.id,
      subassuntoId,
      acertou: attempt.acertou,
      data: toDateKey(attempt.respondidaEm, timeZone),
      origem: attempt.origem,
      tempoRespostaSegundos: attempt.tempoRespostaSegundos,
      nivelConfianca: attempt.nivelConfianca,
      respostaEmBranco: attempt.respostaEmBranco,
      diagnosticoInicial: attempt.diagnosticoInicial,
      consultouMaterial: attempt.consultouMaterial
    }));
}

function mapRevisionHistory(params: {
  subassuntoId: string;
  cronogramas: CronogramaRevisao[];
  flashcards: Flashcard[];
  timeZone: string;
}): RevisaoHistorico[] {
  const { subassuntoId, cronogramas, flashcards, timeZone } = params;
  const revisions: RevisaoHistorico[] = [];

  for (const schedule of cronogramas.filter(
    (item) => item.subassuntoId === subassuntoId
  )) {
    for (const attempt of schedule.historicoTentativas) {
      revisions.push({ data: toDateKey(attempt.revisadoEm, timeZone), tipo: "revisao" });
    }
  }

  for (const card of flashcards.filter(
    (item) => item.subassuntoId === subassuntoId && item.ultimaRevisaoData
  )) {
    revisions.push({ data: toDateKey(card.ultimaRevisaoData!, timeZone), tipo: "flashcards" });
  }

  return revisions.sort((left, right) => left.data.localeCompare(right.data));
}

export function buildCanonicalEvidenceFromStore(
  snapshot: StoreEvidenceSnapshot
): EvidenciasCandidato {
  const porSubassunto: Record<string, EvidenciaSubassunto> = {};

  for (const subassunto of snapshot.subassuntos) {
    const attempts = mapAttempts(
      snapshot.concursoId,
      subassunto.id,
      snapshot.tentativasQuestoes,
      snapshot.timeZone
    );
    const sessions = snapshot.sessoesEstudo.filter(
      (session) => session.subassuntoId === subassunto.id
    );
    const flashcards = snapshot.flashcards.filter(
      (card) => card.subassuntoId === subassunto.id
    );
    const revisions = mapRevisionHistory({
      subassuntoId: subassunto.id,
      cronogramas: snapshot.cronogramasRevisao,
      flashcards: snapshot.flashcards,
      timeZone: snapshot.timeZone
    });
    const activeSchedules = snapshot.cronogramasRevisao
      .filter(
        (item) =>
          item.subassuntoId === subassunto.id &&
          !item.desabilitada &&
          !item.isDeleted
      )
      .slice()
      .sort(
        (left, right) =>
          left.proximaRevisaoData.localeCompare(right.proximaRevisaoData) ||
          left.id.localeCompare(right.id)
      );
    const nextSchedule = activeSchedules[0];
    const nextScheduledDate = nextSchedule
      ? toDateKey(nextSchedule.proximaRevisaoData, snapshot.timeZone)
      : undefined;

    const hasEvidence =
      subassunto.completado ||
      attempts.length > 0 ||
      sessions.length > 0 ||
      flashcards.length > 0 ||
      revisions.length > 0;

    if (!hasEvidence) continue;

    porSubassunto[subassunto.id] = {
      subassuntoId: subassunto.id,
      teoriaConcluida: subassunto.completado,
      dataUltimoEstudo: latestDate([
        ...sessions.map((session) => toDateKey(session.dataFim, snapshot.timeZone)),
        ...attempts.map((attempt) => attempt.data),
        ...revisions.map((revision) => revision.data)
      ]),
      flashcardsDisponiveis: flashcards.length,
      flashcardsPendentes: flashcards.filter(
        (card) =>
          card.status !== "REVIEW" ||
          card.proximaRevisaoData.slice(0, 10) <= snapshot.referenceDate
      ).length,
      tentativas: attempts,
      historicoRevisoes: revisions,
      proximaRevisaoProgramada: nextScheduledDate,
      revisaoProgramadaPendente:
        nextScheduledDate !== undefined && nextScheduledDate <= snapshot.referenceDate,
      revisaoProgramadaGatilho: nextSchedule?.gatilhoOrigem
    };
  }

  return {
    concursoId: snapshot.concursoId,
    porSubassunto
  };
}
