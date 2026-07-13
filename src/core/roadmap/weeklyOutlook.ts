import { buildActionId } from "../sde/prioritization/priorityEngine";
import type { StrategicAction } from "../sde/prioritization/types";
import type {
  WeeklyOutlook,
  WeeklyOutlookAction,
  WeeklyOutlookDay,
  WeeklyOutlookInput
} from "./types";

function assertDateKey(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Data inválida: ${value}`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Data calendariamente inválida: ${value}`);
  }
}

function addDays(dateKey: string, days: number): string {
  assertDateKey(dateKey);
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function actionId(action: StrategicAction): string {
  return buildActionId({
    disciplinaId: action.disciplinaId,
    assuntoId: action.assuntoId,
    subassuntoId: action.subassuntoId,
    tipo: action.tipo
  });
}

function isRepeatAllowed(action: StrategicAction): boolean {
  return [
    "SCHEDULED_REVIEW_DUE",
    "REVISION_EXPIRED",
    "RECENT_REGRESSION",
    "HIGH_DECAY",
    "FLASHCARDS_PENDING"
  ].includes(action.reasonCode);
}

function toOutlookAction(action: StrategicAction, remainingMinutes: number): WeeklyOutlookAction {
  const configured = action.estimatedDurationMinutes ?? action.tempoEstimadoMinutos;
  const durationMinutes = Math.max(1, Math.min(remainingMinutes, Math.round(configured)));
  return {
    actionId: actionId(action),
    tipo: action.tipo,
    reasonCode: action.reasonCode,
    disciplinaId: action.disciplinaId,
    disciplinaNome: action.disciplinaNome,
    assuntoId: action.assuntoId,
    assuntoNome: action.assuntoNome,
    subassuntoId: action.subassuntoId,
    subassuntoNome: action.subassuntoNome,
    durationMinutes,
    diagnosticPurpose: action.diagnosticPurpose ?? false,
    reason: action.justificativaXAI.porQue
  };
}

function orderedActions(actions: readonly StrategicAction[]): StrategicAction[] {
  return actions
    .map((action, index) => ({ action, index }))
    .sort((left, right) =>
      left.action.prioridade - right.action.prioridade ||
      right.action.score - left.action.score ||
      left.index - right.index ||
      actionId(left.action).localeCompare(actionId(right.action))
    )
    .map((entry) => entry.action);
}

/**
 * Produces a seven-day provisional outlook. It deliberately avoids persisting a
 * rigid weekly plan: every day is recalculated from the current evidence, and
 * repeated non-review actions are diversified when an equivalent candidate is
 * available. Actual SDE decisions always remain authoritative on execution day.
 */
export function buildWeeklyOutlook(input: WeeklyOutlookInput): WeeklyOutlook {
  assertDateKey(input.referenceDate);
  const numberOfDays = input.numberOfDays ?? 7;
  if (!Number.isInteger(numberOfDays) || numberOfDays < 1 || numberOfDays > 14) {
    throw new Error("numberOfDays deve ser um inteiro entre 1 e 14.");
  }

  const lastScheduledIndex = new Map<string, number>();
  const days: WeeklyOutlookDay[] = [];

  for (let index = 0; index < numberOfDays; index += 1) {
    const date = addDays(input.referenceDate, index);
    const decision = input.decisionForDate(date);
    const scheduledMinutes = decision.availability?.scheduledMinutes ?? 0;
    const remainingMinutes = decision.availability?.remainingMinutes ?? 0;

    if (decision.status === "INVALID_INPUT") {
      days.push({
        date,
        status: "INVALID_INPUT",
        scheduledMinutes,
        remainingMinutes,
        primary: null,
        supporting: [],
        notes: [...decision.errors]
      });
      continue;
    }

    if (scheduledMinutes <= 0) {
      days.push({
        date,
        status: "REST_DAY",
        scheduledMinutes,
        remainingMinutes,
        primary: null,
        supporting: [],
        notes: ["Dia sem disponibilidade configurada; nenhuma atividade foi inventada."]
      });
      continue;
    }

    if (decision.status === "NO_TIME_AVAILABLE" || remainingMinutes <= 0) {
      days.push({
        date,
        status: "NO_TIME_AVAILABLE",
        scheduledMinutes,
        remainingMinutes,
        primary: null,
        supporting: [],
        notes: ["A disponibilidade deste dia já foi consumida por sessões registradas."]
      });
      continue;
    }

    const ordered = orderedActions(decision.actions);
    const diversified = ordered.filter((action) => {
      if (isRepeatAllowed(action)) return true;
      const previous = lastScheduledIndex.get(actionId(action));
      return previous === undefined || index - previous >= 2;
    });
    const candidates = diversified.length > 0 ? diversified : ordered;
    const primaryAction = candidates[0] ?? null;
    const primary = primaryAction ? toOutlookAction(primaryAction, remainingMinutes) : null;
    if (primaryAction) lastScheduledIndex.set(actionId(primaryAction), index);

    let budget = Math.max(0, remainingMinutes - (primary?.durationMinutes ?? 0));
    const supporting: WeeklyOutlookAction[] = [];
    for (const action of candidates.slice(1)) {
      if (supporting.length >= 2 || budget <= 0) break;
      const id = actionId(action);
      if (id === primary?.actionId) continue;
      const candidate = toOutlookAction(action, budget);
      if (candidate.durationMinutes <= 0) continue;
      supporting.push(candidate);
      budget -= candidate.durationMinutes;
      lastScheduledIndex.set(id, index);
    }

    const notes = [
      "Prévia recalculável: a decisão do dia será refeita após novos estudos, questões ou revisões.",
      ...(diversified.length === 0 && ordered.length > 0
        ? ["Não havia alternativa não repetida; a ação recorrente foi mantida e sinalizada como provisória."]
        : [])
    ];
    if (!primary) notes.push("O SDE não encontrou ação executável com os dados atuais.");

    days.push({
      date,
      status: "PROVISIONAL",
      scheduledMinutes,
      remainingMinutes,
      primary,
      supporting,
      notes
    });
  }

  return {
    referenceDate: input.referenceDate,
    endDate: addDays(input.referenceDate, numberOfDays - 1),
    days,
    totalScheduledMinutes: days.reduce((sum, day) => sum + day.scheduledMinutes, 0),
    totalRemainingMinutes: days.reduce((sum, day) => sum + day.remainingMinutes, 0),
    activeDays: days.filter((day) => day.scheduledMinutes > 0).length,
    caveats: [
      "Esta é uma visão operacional provisória, não um compromisso rígido de sete dias.",
      "Revisões vencidas e riscos observados podem reaparecer em dias consecutivos; ações de expansão são diversificadas quando existem alternativas equivalentes.",
      "O plano diário recalculado pelo SDE no momento do estudo substitui automaticamente esta prévia."
    ]
  };
}
