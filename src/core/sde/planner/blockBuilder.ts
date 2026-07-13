/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicAction } from "../prioritization/types";
import {
  ActivityType,
  DeferredPlannerAction,
  ExecutionStep,
  PlannerAdjustment,
  PlannerContext,
  StudyBlock,
  StudyObjective,
  StudySession,
  StudyActivityType
} from "./plannerTypes";
import { ActivityTimeAllocation } from "./timeAllocator";

export interface BuildBlocksResult {
  blocks: StudyBlock[];
  deferredActions: DeferredPlannerAction[];
  adjustments: PlannerAdjustment[];
  unallocatedMinutes: number;
}

export function getPlannerActionId(action: StrategicAction): string {
  return `${action.disciplinaId}-${action.assuntoId}-${action.subassuntoId ?? "geral"}-${action.tipo}`;
}

function orderedActions(actions: StrategicAction[]): StrategicAction[] {
  return actions
    .map((action, index) => ({ action, index }))
    .sort((left, right) =>
      left.action.prioridade - right.action.prioridade ||
      right.action.score - left.action.score ||
      left.index - right.index
    )
    .map(({ action }) => action);
}

export function buildObjectives(
  tipo: ActivityType,
  topicName: string,
  context: PlannerContext
): StudyObjective[] {
  switch (tipo) {
    case "teoria":
      return [
        {
          descricao: `Construir compreensão inicial ou corrigir a base conceitual de '${topicName}'`,
          indicadorMeta: "Registrar os conceitos centrais e as dúvidas remanescentes"
        },
        {
          descricao: `Relacionar os conceitos estudados aos padrões de cobrança informados para ${context.bancaName}`,
          indicadorMeta: "Listar exemplos ou aplicações relevantes ao conteúdo"
        }
      ];
    case "questoes":
      return [
        {
          descricao: `Resolver questões sobre '${topicName}' no formato configurado para ${context.bancaName} e registrar o resultado real`,
          indicadorMeta: "Salvar quantidade de questões, acertos, erros e tempo"
        },
        {
          descricao: "Analisar cada erro e identificar sua causa",
          indicadorMeta: "Atualizar o caderno de erros com a justificativa correta"
        }
      ];
    case "revisao":
      return [
        {
          descricao: `Recuperar ativamente os conceitos de '${topicName}'`,
          indicadorMeta: "Tentar recordar antes de consultar o material"
        },
        {
          descricao: "Registrar os pontos que permaneceram frágeis",
          indicadorMeta: "Atualizar a evidência de revisão no histórico"
        }
      ];
    case "flashcards":
      return [
        {
          descricao: `Revisar os flashcards pendentes de '${topicName}'`,
          indicadorMeta: "Registrar lembrança, erro e dificuldade de cada card"
        }
      ];
    case "simulado":
      return [
        {
          descricao: "Executar o simulado validado pelo SDE nas condições configuradas",
          indicadorMeta: "Concluir dentro do tempo disponível e registrar o gabarito"
        },
        {
          descricao: "Analisar o desempenho por disciplina e assunto",
          indicadorMeta: "Salvar erros, tempo e distribuição de desempenho"
        }
      ];
    case "descanso":
      return [
        {
          descricao: "Interromper a carga cognitiva antes da próxima sessão",
          indicadorMeta: "Pausa sem nova atividade de estudo"
        }
      ];
  }
}

export function buildExecutionSteps(
  tipo: ActivityType,
  tempoTotal: number,
  topicName: string,
  context: PlannerContext,
  reasonCode?: StrategicAction["reasonCode"]
): ExecutionStep[] {
  const allocate = (ratios: number[]): number[] => {
    if (!Number.isInteger(tempoTotal) || tempoTotal < ratios.length) {
      return [tempoTotal];
    }
    const raw = ratios.map((ratio) => ratio * tempoTotal);
    const result = raw.map((value) => Math.max(1, Math.floor(value)));
    let difference = tempoTotal - result.reduce((sum, value) => sum + value, 0);
    const order = raw
      .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
      .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
    let cursor = 0;
    while (difference > 0) {
      result[order[cursor % order.length].index] += 1;
      cursor += 1;
      difference -= 1;
    }
    while (difference < 0) {
      const candidate = [...result]
        .map((value, index) => ({ value, index }))
        .filter((item) => item.value > 1)
        .sort((left, right) => right.value - left.value || left.index - right.index)[0];
      if (!candidate) break;
      result[candidate.index] -= 1;
      difference += 1;
    }
    return result;
  };

  switch (tipo) {
    case "teoria": {
      const [activation, study, recall, check] = allocate([0.1, 0.55, 0.2, 0.15]);
      if (check === undefined) {
        return [{ passo: 1, descricao: `Estudo ativo de '${topicName}'`, tempoMinutos: tempoTotal }];
      }
      return [
        { passo: 1, descricao: "Ativar conhecimentos prévios e formular o que precisa ser respondido", tempoMinutos: activation },
        { passo: 2, descricao: `Estudar seletivamente os conceitos de '${topicName}' no material indicado`, tempoMinutos: study },
        { passo: 3, descricao: "Fechar o material e recuperar os pontos centrais sem consulta", tempoMinutos: recall },
        { passo: 4, descricao: "Verificar a recuperação, registrar lacunas e confirmar a cobertura somente se executada", tempoMinutos: check }
      ];
    }
    case "questoes": {
      const diagnostic = reasonCode === "DIAGNOSTIC_QUESTIONS";
      const [setup, practice, correction, retry] = allocate(
        diagnostic ? [0.1, 0.45, 0.3, 0.15] : [0.08, 0.52, 0.28, 0.12]
      );
      if (retry === undefined) {
        return [{ passo: 1, descricao: `Resolver e corrigir questões de '${topicName}'`, tempoMinutos: tempoTotal }];
      }
      const paceText = context.tempoAlvoPorQuestaoSegundos
        ? ` usando como referência ${context.tempoAlvoPorQuestaoSegundos} segundos por questão`
        : " registrando o tempo real por questão";
      return [
        { passo: 1, descricao: diagnostic ? "Definir uma pequena amostra diagnóstica sem consulta" : "Preparar a bateria e o registro de respostas", tempoMinutos: setup },
        { passo: 2, descricao: `Resolver questões de '${topicName}'${paceText}`, tempoMinutos: practice },
        { passo: 3, descricao: "Corrigir e classificar a causa declarada de cada erro", tempoMinutos: correction },
        { passo: 4, descricao: "Refazer o raciocínio ou responder uma questão contrastiva sem olhar a solução", tempoMinutos: retry }
      ];
    }
    case "revisao": {
      const [recall, feedback, secondRetrieval] = allocate([0.5, 0.25, 0.25]);
      if (secondRetrieval === undefined) {
        return [{ passo: 1, descricao: `Recuperação ativa de '${topicName}'`, tempoMinutos: tempoTotal }];
      }
      return [
        { passo: 1, descricao: `Recuperar '${topicName}' sem consulta inicial`, tempoMinutos: recall },
        { passo: 2, descricao: "Conferir, corrigir apenas as lacunas e evitar releitura integral", tempoMinutos: feedback },
        { passo: 3, descricao: "Executar uma segunda recuperação ou discriminação entre conceitos próximos", tempoMinutos: secondRetrieval }
      ];
    }
    case "flashcards": {
      const [recall, feedback] = allocate([0.75, 0.25]);
      if (feedback === undefined) {
        return [{ passo: 1, descricao: `Executar os flashcards pendentes de '${topicName}'`, tempoMinutos: tempoTotal }];
      }
      return [
        { passo: 1, descricao: `Responder os flashcards de '${topicName}' antes de revelar a resposta`, tempoMinutos: recall },
        { passo: 2, descricao: "Conferir somente após a tentativa e marcar o resultado observado", tempoMinutos: feedback }
      ];
    }
    case "simulado": {
      const [executionTime, correctionTime] = allocate([0.8, 0.2]);
      if (correctionTime === undefined) {
        return [{ passo: 1, descricao: "Executar o simulado sem consulta", tempoMinutos: tempoTotal }];
      }
      return [
        { passo: 1, descricao: "Executar o simulado sem consulta", tempoMinutos: executionTime },
        { passo: 2, descricao: "Registrar gabarito, tempo, erros e itens sem resposta", tempoMinutos: correctionTime }
      ];
    }
    case "descanso":
      return [
        { passo: 1, descricao: "Pausa para água, movimento e descanso da atenção", tempoMinutos: tempoTotal }
      ];
  }
}

export function redistributeAllocations(
  allocations: ActivityTimeAllocation[],
  actions: StrategicAction[]
): ActivityTimeAllocation[] {
  const cloned = allocations.map((allocation) => ({ ...allocation }));
  const actionTypes = orderedActions(actions).map((action) => action.tipo);
  const uniqueTypes = [...new Set(actionTypes)] as StudyActivityType[];
  if (uniqueTypes.length === 0) return [];

  const valid: ActivityTimeAllocation[] = [];
  let excess = 0;
  for (const allocation of cloned) {
    if (uniqueTypes.includes(allocation.tipo)) valid.push(allocation);
    else excess += allocation.tempoMinutos;
  }

  if (valid.length === 0) {
    valid.push({ tipo: uniqueTypes[0], tempoMinutos: excess });
    return valid;
  }

  let cursor = 0;
  while (excess > 0) {
    const targetType = uniqueTypes[cursor % uniqueTypes.length];
    let target = valid.find((allocation) => allocation.tipo === targetType);
    if (!target) {
      target = { tipo: targetType, tempoMinutos: 0 };
      valid.push(target);
    }
    target.tempoMinutos += 1;
    cursor += 1;
    excess -= 1;
  }

  return valid;
}

function createSession(
  action: StrategicAction,
  duration: number,
  seedId: string,
  sessionIndex: number,
  context: PlannerContext
): StudySession {
  const actionId = getPlannerActionId(action);
  const topicName = action.subassuntoNome || action.assuntoNome;
  return {
    id: `sess-${actionId}-${seedId}-${sessionIndex}`,
    sequencia: sessionIndex,
    actionId,
    strategicPriority: action.prioridade,
    sourceScore: action.score,
    disciplinaId: action.disciplinaId,
    disciplinaNome: action.disciplinaNome,
    assuntoId: action.assuntoId,
    assuntoNome: action.assuntoNome,
    subassuntoId: action.subassuntoId,
    subassuntoNome: action.subassuntoNome,
    tipo: action.tipo,
    tempoMinutos: duration,
    objetivos: buildObjectives(action.tipo, topicName, context),
    passosExecucao: buildExecutionSteps(action.tipo, duration, topicName, context, action.reasonCode)
  };
}

function groupSessionsAsInitialBlocks(sessions: StudySession[], seedId: string): StudyBlock[] {
  return sessions.map((session, index) => ({
    id: `block-raw-${session.tipo}-${seedId}-${index + 1}`,
    nome: `Sessão estratégica ${index + 1}`,
    tempoTotalMinutos: session.tempoMinutos,
    sessões: [session]
  }));
}

export function buildBlocks(
  allocations: ActivityTimeAllocation[],
  actions: StrategicAction[],
  seedId: string,
  context: PlannerContext,
  strategyAllowsSimulado: boolean,
  reservedActionMinimums: Readonly<Record<string, number>> = {}
): BuildBlocksResult {
  const allowedActions = orderedActions(actions).filter(
    (action) => action.tipo !== "simulado" || strategyAllowsSimulado
  );
  const deferredActions: DeferredPlannerAction[] = actions
    .filter((action) => action.tipo === "simulado" && !strategyAllowsSimulado)
    .map((action) => ({
      actionId: getPlannerActionId(action),
      prioridade: action.prioridade,
      reasonCode: "STRATEGY_DISALLOWS_SIMULADO",
      reason: "A estratégia operacional atual não permite alocar o simulado nesta janela."
    }));

  const sanitizedAllocations = redistributeAllocations(allocations, allowedActions);
  const remainingByType = new Map<StudyActivityType, number>(
    sanitizedAllocations.map((allocation) => [allocation.tipo, allocation.tempoMinutos])
  );
  const sessions: StudySession[] = [];
  const adjustments: PlannerAdjustment[] = [];
  const invalidActionIds = new Set<string>();
  let sessionIndex = 1;

  for (let actionIndex = 0; actionIndex < allowedActions.length; actionIndex += 1) {
    const action = allowedActions[actionIndex];
    const tipo = action.tipo;
    let remainingBudget = remainingByType.get(tipo) ?? 0;
    if (remainingBudget <= 0) continue;

    const actionId = getPlannerActionId(action);
    const rawDuration = action.tempoEstimadoMinutos;
    if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
      deferredActions.push({
        actionId,
        prioridade: action.prioridade,
        reasonCode: "INVALID_DURATION",
        reason: "A ação não possui duração operacional válida."
      });
      invalidActionIds.add(actionId);
      continue;
    }

    const minDuration = context.policy.minSessionMinutes[tipo];
    const maxDuration = context.policy.maxSessionMinutes[tipo];
    const futureReserved = allowedActions
      .slice(actionIndex + 1)
      .filter((future) => future.tipo === tipo)
      .reduce(
        (sum, future) => sum + (reservedActionMinimums[getPlannerActionId(future)] ?? 0),
        0
      );
    const availableForCurrent = Math.max(0, remainingBudget - futureReserved);
    let actionMinutesRemaining = Math.min(rawDuration, availableForCurrent);
    const currentReservation = reservedActionMinimums[actionId] ?? 0;

    if (currentReservation > 0 && actionMinutesRemaining < currentReservation) {
      deferredActions.push({
        actionId,
        prioridade: action.prioridade,
        reasonCode: "NO_TIME_BUDGET",
        reason: "A reserva de avanço do edital não pôde ser cumprida dentro da janela restante."
      });
      continue;
    }
    if (actionMinutesRemaining < minDuration) continue;

    while (actionMinutesRemaining >= minDuration) {
      let chunk = Math.min(maxDuration, actionMinutesRemaining);
      const remainder = actionMinutesRemaining - chunk;
      if (remainder > 0 && remainder < minDuration) {
        chunk = actionMinutesRemaining;
      }

      sessions.push(createSession(action, chunk, seedId, sessionIndex++, context));
      actionMinutesRemaining -= chunk;
      remainingBudget -= chunk;

      if (rawDuration > maxDuration) {
        adjustments.push({
          code: "SESSION_SPLIT",
          reason: `A ação ${actionId} foi dividida para respeitar o limite operacional por sessão.`,
          actionId,
          minutes: chunk
        });
      }
    }

    remainingByType.set(tipo, remainingBudget);
  }

  for (const action of allowedActions) {
    const actionId = getPlannerActionId(action);
    const wasScheduled = sessions.some((session) => session.actionId === actionId);
    if (!wasScheduled && !invalidActionIds.has(actionId)) {
      const remaining = remainingByType.get(action.tipo) ?? 0;
      deferredActions.push({
        actionId,
        prioridade: action.prioridade,
        reasonCode: remaining > 0 ? "DURATION_BELOW_MINIMUM" : "NO_TIME_BUDGET",
        reason: remaining > 0
          ? "O tempo restante para o tipo de atividade ficou abaixo do mínimo operacional da sessão."
          : "A janela disponível foi consumida por ações de prioridade superior."
      });
    }
  }

  const unallocatedMinutes = [...remainingByType.values()].reduce((sum, minutes) => sum + minutes, 0);
  if (unallocatedMinutes > 0) {
    adjustments.push({
      code: "UNALLOCATED_TIME",
      reason: "Parte da janela não foi alocada porque nenhuma ação validada comportava o tempo restante sem violar os limites de sessão.",
      minutes: unallocatedMinutes
    });
  }

  return {
    blocks: groupSessionsAsInitialBlocks(sessions, seedId),
    deferredActions,
    adjustments,
    unallocatedMinutes
  };
}
