/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlannerAdjustment,
  PlannerContext,
  StudyBlock,
  StudySession
} from "./plannerTypes";
import { buildExecutionSteps, buildObjectives } from "./blockBuilder";

export interface SessionOptimizationResult {
  blocks: StudyBlock[];
  usedBreakMinutes: number;
  unusedBreakMinutes: number;
  adjustments: PlannerAdjustment[];
}

export function getCognitiveLoad(session: StudySession, context: PlannerContext): number {
  if (session.tipo === "descanso") return 0;
  return session.tempoMinutos * context.policy.cognitiveWeight[session.tipo];
}

function cloneSession(session: StudySession): StudySession {
  return {
    ...session,
    objetivos: session.objetivos.map((objective) => ({ ...objective })),
    passosExecucao: session.passosExecucao.map((step) => ({ ...step }))
  };
}

function createBreakSession(
  index: number,
  seedId: string,
  context: PlannerContext
): StudySession {
  const topicName = "Pausa cognitiva";
  return {
    id: `sess-descanso-${seedId}-${index}`,
    sequencia: 0,
    actionId: null,
    strategicPriority: null,
    sourceScore: null,
    disciplinaId: "geral",
    disciplinaNome: "Geral",
    assuntoId: "descanso",
    assuntoNome: topicName,
    tipo: "descanso",
    tempoMinutos: context.policy.breakDurationMinutes,
    objetivos: buildObjectives("descanso", topicName, context),
    passosExecucao: buildExecutionSteps(
      "descanso",
      context.policy.breakDurationMinutes,
      topicName,
      context
    )
  };
}

function blockName(session: StudySession): string {
  switch (session.tipo) {
    case "teoria": return "Bloco de construção conceitual";
    case "questoes": return "Bloco de questões e correção";
    case "revisao": return "Bloco de revisão ativa";
    case "flashcards": return "Bloco de recuperação espaçada";
    case "simulado": return "Bloco de simulado";
    case "descanso": return "Pausa cognitiva";
  }
}

function groupSequentialSessions(sessions: StudySession[], seedId: string): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  let current: StudySession[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0];
    blocks.push({
      id: `block-${first.tipo}-${seedId}-${blocks.length + 1}`,
      nome: blockName(first),
      tempoTotalMinutos: current.reduce((sum, session) => sum + session.tempoMinutos, 0),
      sessões: current
    });
    current = [];
  };

  for (const session of sessions) {
    if (
      current.length > 0 &&
      (current[0].tipo !== session.tipo || session.tipo === "descanso")
    ) {
      flush();
    }
    current.push(session);
    if (session.tipo === "descanso") flush();
  }
  flush();
  return blocks;
}

export function optimizeSessions(
  blocks: StudyBlock[],
  seedId: string,
  context: PlannerContext,
  plannedBreakCount: number,
  breakBudgetMinutes: number
): SessionOptimizationResult {
  const studySessions = blocks
    .flatMap((block) => block.sessões)
    .filter((session) => session.tipo !== "descanso")
    .map(cloneSession);

  if (studySessions.length === 0) {
    return {
      blocks: [],
      usedBreakMinutes: 0,
      unusedBreakMinutes: breakBudgetMinutes,
      adjustments: []
    };
  }

  const usableBreaks = Math.min(plannedBreakCount, Math.max(0, studySessions.length - 1));
  const totalLoad = studySessions.reduce(
    (sum, session) => sum + getCognitiveLoad(session, context),
    0
  );
  const targetSegmentLoad = usableBreaks > 0 ? totalLoad / (usableBreaks + 1) : Number.POSITIVE_INFINITY;

  const ordered: StudySession[] = [];
  const adjustments: PlannerAdjustment[] = [];
  let segmentLoad = 0;
  let insertedBreaks = 0;

  for (let index = 0; index < studySessions.length; index += 1) {
    const session = studySessions[index];
    ordered.push(session);
    segmentLoad += getCognitiveLoad(session, context);

    const remainingStudySessions = studySessions.length - index - 1;
    const remainingBreaks = usableBreaks - insertedBreaks;
    const mustInsertToFit = remainingBreaks > 0 && remainingStudySessions === remainingBreaks;
    const thresholdReached = segmentLoad >= targetSegmentLoad;

    if (
      remainingStudySessions > 0 &&
      remainingBreaks > 0 &&
      (thresholdReached || mustInsertToFit)
    ) {
      const breakSession = createBreakSession(insertedBreaks + 1, seedId, context);
      ordered.push(breakSession);
      insertedBreaks += 1;
      segmentLoad = 0;
      adjustments.push({
        code: "BREAK_INSERTED",
        reason: "A pausa foi inserida entre sessões para limitar a continuidade da carga cognitiva.",
        minutes: breakSession.tempoMinutos
      });
    }
  }

  const renumbered = ordered.map((session, index) => ({
    ...session,
    sequencia: index + 1
  }));
  const usedBreakMinutes = insertedBreaks * context.policy.breakDurationMinutes;

  return {
    blocks: groupSequentialSessions(renumbered, seedId),
    usedBreakMinutes,
    unusedBreakMinutes: Math.max(0, breakBudgetMinutes - usedBreakMinutes),
    adjustments
  };
}
