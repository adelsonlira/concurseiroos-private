/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlannerStrategy, StrategyMode } from "./plannerTypes";

export const STRATEGY_TEMPLATES: Readonly<Record<StrategyMode, PlannerStrategy>> = {
  NORMAL: {
    id: "NORMAL",
    nome: "Modo Estudo Equilibrado",
    descricao: "Distribuição operacional equilibrada entre construção de base, prática e proteção de memória.",
    teoriaRatio: 0.35,
    questoesRatio: 0.4,
    revisaoRatio: 0.15,
    flashcardsRatio: 0.1,
    simuladoRatio: 0,
    permiteSimulado: true
  },
  INTENSIVE: {
    id: "INTENSIVE",
    nome: "Modo Estudo Intensivo",
    descricao: "Maior concentração em prática e correção de lacunas observadas.",
    teoriaRatio: 0.15,
    questoesRatio: 0.6,
    revisaoRatio: 0.15,
    flashcardsRatio: 0.1,
    simuladoRatio: 0,
    permiteSimulado: true
  },
  "30_DAYS": {
    id: "30_DAYS",
    nome: "Sprint de 30 Dias",
    descricao: "Consolidação de conteúdos relevantes com predominância de prática e revisão.",
    teoriaRatio: 0.1,
    questoesRatio: 0.65,
    revisaoRatio: 0.15,
    flashcardsRatio: 0.1,
    simuladoRatio: 0,
    permiteSimulado: true
  },
  "15_DAYS": {
    id: "15_DAYS",
    nome: "Reta Final de 15 Dias",
    descricao: "Predominância de prática e proteção de memória, com teoria apenas quando validada pelo SDE.",
    teoriaRatio: 0.05,
    questoesRatio: 0.7,
    revisaoRatio: 0.15,
    flashcardsRatio: 0.1,
    simuladoRatio: 0,
    permiteSimulado: false
  },
  "7_DAYS": {
    id: "7_DAYS",
    nome: "Última Semana",
    descricao: "Prática e revisões de alta prioridade, sem criação automática de simulados.",
    teoriaRatio: 0,
    questoesRatio: 0.6,
    revisaoRatio: 0.25,
    flashcardsRatio: 0.15,
    simuladoRatio: 0,
    permiteSimulado: false
  },
  "3_DAYS": {
    id: "3_DAYS",
    nome: "Revisão de 3 Dias",
    descricao: "Revisão ativa e prática curta, preservando apenas ações previamente validadas.",
    teoriaRatio: 0,
    questoesRatio: 0.4,
    revisaoRatio: 0.4,
    flashcardsRatio: 0.2,
    simuladoRatio: 0,
    permiteSimulado: false
  },
  EXAM_TOMORROW: {
    id: "EXAM_TOMORROW",
    nome: "Véspera da Prova",
    descricao: "Atividades leves já validadas, com prioridade para recuperação de memória.",
    teoriaRatio: 0,
    questoesRatio: 0,
    revisaoRatio: 0.5,
    flashcardsRatio: 0.5,
    simuladoRatio: 0,
    permiteSimulado: false
  }
};

export function selectStrategyByTimeHorizon(diasAteAProva: number): PlannerStrategy {
  if (diasAteAProva <= 1) return STRATEGY_TEMPLATES.EXAM_TOMORROW;
  if (diasAteAProva <= 3) return STRATEGY_TEMPLATES["3_DAYS"];
  if (diasAteAProva <= 7) return STRATEGY_TEMPLATES["7_DAYS"];
  if (diasAteAProva <= 15) return STRATEGY_TEMPLATES["15_DAYS"];
  if (diasAteAProva <= 30) return STRATEGY_TEMPLATES["30_DAYS"];
  return STRATEGY_TEMPLATES.NORMAL;
}

export function getStrategyRatio(strategy: PlannerStrategy, tipo: string): number {
  switch (tipo) {
    case "teoria": return strategy.teoriaRatio;
    case "questoes": return strategy.questoesRatio;
    case "revisao": return strategy.revisaoRatio;
    case "flashcards": return strategy.flashcardsRatio;
    case "simulado": return strategy.simuladoRatio;
    default: return 0;
  }
}
