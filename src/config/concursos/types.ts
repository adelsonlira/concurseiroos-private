/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Assunto as SDEAssunto,
  Disciplina as SDEDisciplina,
  EditalConfig,
  EliminationRiskPolicy,
  KnowledgeGraph,
  LearningLeveragePolicy,
  OpportunityCostPolicy,
  Subassunto as SDESubassunto
} from "../../core/sde/prioritization/types";
import { PlannerPolicy } from "../../core/sde/planner/plannerTypes";
import { StrategicEvidencePackage } from "../../core/evidence/types";
import type { CompetitionStudyGuidance } from "../../core/prescription/studyFocusGuide";
import type {
  Assunto,
  Concurso,
  ConfigUsuario,
  Disciplina,
  Edital,
  Estatisticas,
  ItemBiblioteca,
  Subassunto
} from "../../types";


export interface CompetitionAppSeed {
  concurso: Concurso;
  edital: Edital;
  disciplinas: Disciplina[];
  assuntos: Assunto[];
  subassuntos: Subassunto[];
  estatisticas: Estatisticas;
  configuracao: ConfigUsuario;
  biblioteca: ItemBiblioteca[];
}

export interface OfficialSourceReference {
  document: string;
  section: string;
  page: number;
  note?: string;
}

export interface ModelingAssumption {
  id: string;
  description: string;
  impact: string;
  status: "ACTIVE" | "PENDING_EMPIRICAL_DATA";
}

export interface LocalityVacancies {
  locality: string;
  immediate: {
    total: number;
    amplaConcorrencia: number;
    pcd: number;
    pretosPardos: number;
    indigenas: number;
    quilombolas: number;
  };
  reserve: {
    total: number;
    amplaConcorrencia: number;
    pcd: number;
    pretosPardos: number;
    indigenas: number;
    quilombolas: number;
  };
}

export interface OfficialExamRules {
  examDate: string;
  startTimeBrasilia: string;
  endTimeBrasilia: string;
  durationMinutes: number;
  totalQuestions: number;
  maximumPoints: number;
  minimumTotalPoints: number;
  eliminatesOnZeroDiscipline: boolean;
  questionType: "MULTIPLA_ESCOLHA" | "CERTO_ERRADO";
  optionsPerQuestion: number;
  wrongAnswerPenalty: "NONE" | "CANCELS_CORRECT";
  tieBreakCriteria: string[];
}

export interface CompetitionConfigurationPackage {
  id: string;
  version: string;
  officialDocument: string;
  concursoName: string;
  organization: string;
  banca: string;
  profileName: string;
  profileNumber: number;
  testLocality: string;
  workLocality: string;
  remunerationInitial: number;
  vacancies: LocalityVacancies;
  officialRules: OfficialExamRules;
  sources: OfficialSourceReference[];
  assumptions: ModelingAssumption[];
  strategicEvidence: StrategicEvidencePackage;
  studyGuidance: CompetitionStudyGuidance | null;
  sde: {
    edital: EditalConfig;
    disciplinas: SDEDisciplina[];
    assuntos: SDEAssunto[];
    subassuntos: SDESubassunto[];
    names: {
      disciplinas: Record<string, string>;
      assuntos: Record<string, string>;
      subassuntos: Record<string, string>;
    };
    assuntoToDisciplina: Record<string, string>;
    subassuntoToAssunto: Record<string, string>;
    assuntoToSubassuntos: Record<string, string[]>;
    knowledgeGraph: KnowledgeGraph;
    eliminationRiskPolicy: EliminationRiskPolicy;
    opportunityCostPolicy: OpportunityCostPolicy;
    learningLeveragePolicy: LearningLeveragePolicy;
    plannerPolicy: PlannerPolicy;
  };
}
