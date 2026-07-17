/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StrategyMode =
  | "NORMAL"
  | "INTENSIVE"
  | "30_DAYS"
  | "15_DAYS"
  | "7_DAYS"
  | "3_DAYS"
  | "EXAM_TOMORROW";

export type StudyActivityType =
  | "teoria"
  | "questoes"
  | "revisao"
  | "flashcards"
  | "simulado";

export type ActivityType = StudyActivityType | "descanso";

export interface PlannerStrategy {
  id: StrategyMode;
  nome: string;
  descricao: string;
  teoriaRatio: number;
  questoesRatio: number;
  revisaoRatio: number;
  flashcardsRatio: number;
  simuladoRatio: number;
  permiteSimulado: boolean;
}

export interface PlannerProgressionGuardPolicy {
  enabled: boolean;
  /** Operational floor for one unseen-theory action when the daily window can safely fit it. */
  minNewContentSessionMinutes: number;
}

export interface PlannerPolicy {
  minSessionMinutes: Record<StudyActivityType, number>;
  maxSessionMinutes: Record<StudyActivityType, number>;
  cognitiveWeight: Record<StudyActivityType, number>;
  maxContinuousCognitiveLoad: number;
  breakDurationMinutes: number;
  minStudyMinutesAfterBreak: number;
  progressionGuard?: PlannerProgressionGuardPolicy;
}

export interface PlannerContext {
  /** Total daily window, including planned breaks. */
  tempoDisponivelMinutos: number;
  diasAteAProva: number;
  referenceDate: string;
  bancaName: string;
  tipoQuestao?: string;
  tempoAlvoPorQuestaoSegundos?: number | null;
  seedId?: string;
  policy: PlannerPolicy;
}

export interface StudyObjective {
  descricao: string;
  indicadorMeta: string;
}

export type ExecutionPhase =
  | "ACTIVATION"
  | "GUIDED_STUDY"
  | "CLOSED_BOOK_RECALL"
  | "VERIFICATION"
  | "SETUP"
  | "QUESTION_PRACTICE"
  | "CORRECTION"
  | "RETRY"
  | "RETRIEVAL"
  | "FEEDBACK"
  | "SECOND_RETRIEVAL"
  | "FLASHCARD_RETRIEVAL"
  | "SIMULATION"
  | "BREAK";

export interface ExecutionStep {
  passo: number;
  phase: ExecutionPhase;
  descricao: string;
  tempoMinutos: number;
}

export interface PlannerAdjustment {
  code:
    | "REALLOCATED_UNUSED_TYPE"
    | "PRIORITY_OVERRIDES_RATIO"
    | "REVIEW_SAFEGUARD"
    | "FLASHCARD_SAFEGUARD"
    | "SESSION_SPLIT"
    | "BREAK_INSERTED"
    | "NEW_CONTENT_PROGRESS_GUARD"
    | "NEW_CONTENT_PROGRESS_GUARD_NOT_APPLIED"
    | "UNALLOCATED_TIME";
  reason: string;
  minutes?: number;
  actionId?: string;
}

export interface DeferredPlannerAction {
  actionId: string;
  prioridade: number;
  reasonCode:
    | "STRATEGY_DISALLOWS_SIMULADO"
    | "NO_TIME_BUDGET"
    | "DURATION_BELOW_MINIMUM"
    | "INVALID_DURATION";
  reason: string;
}

export interface StudySession {
  id: string;
  sequencia: number;
  actionId: string | null;
  strategicPriority: number | null;
  sourceScore: number | null;
  disciplinaId: string;
  disciplinaNome: string;
  assuntoId: string;
  assuntoNome: string;
  subassuntoId?: string;
  subassuntoNome?: string;
  tipo: ActivityType;
  tempoMinutos: number;
  objetivos: StudyObjective[];
  passosExecucao: ExecutionStep[];
}

export interface StudyBlock {
  id: string;
  nome: string;
  tempoTotalMinutos: number;
  sessões: StudySession[];
}

export interface StudyPlan {
  id: string;
  estrategiaId: StrategyMode;
  estrategiaNome: string;
  tempoDisponivelMinutos: number;
  tempoTotalPlanejadoMinutos: number;
  tempoNaoAlocadoMinutos: number;
  blocos: StudyBlock[];
  metaGeral: string;
  justificativaEstrategica: string;
  adjustments: PlannerAdjustment[];
  deferredActions: DeferredPlannerAction[];
}

export interface PlannerResponseSuccess {
  status: "SUCCESS";
  plan: StudyPlan;
  reasons?: string[];
}

export interface PlannerResponseNoActions {
  status: "NO_VALID_ACTIONS";
  plan: null;
  reasons: string[];
}

export interface PlannerResponseInvalidInput {
  status: "INVALID_INPUT";
  plan: null;
  reasons: string[];
}

export type PlannerResponse =
  | PlannerResponseSuccess
  | PlannerResponseNoActions
  | PlannerResponseInvalidInput;
