import { DailyAvailabilityResult } from "../../core/availability/types";
import { MaterialLocatorRecommendation } from "../../core/materials/types";
import type { WeeklyCalibrationReport } from "../../core/weekly/types";

export interface CoachDisciplineEvidence {
  disciplinaId: string;
  nome: string;
  tentativasReais: number;
  acertosReais: number;
  taxaAcertoObservada: number | null;
  tempoRegistradoMinutos: number;
}

export interface CoachDecisionAction {
  prioridade: number;
  tipo: string;
  disciplina: string;
  assunto: string;
  subassunto: string | null;
  duracaoOperacionalMinutos: number | null;
  camadaConstitucional: string;
  motivo: string;
  confianca: string;
  dadosAusentes: string[];
  diagnosticPurpose: boolean;
  materialSugerido: MaterialLocatorRecommendation | null;
  ranking: {
    isTied: boolean;
    tiedActionCount: number;
    tieBreakRule: "DETERMINISTIC_ACTION_ID" | null;
    note: string | null;
  };
}

export interface CoachPlannedSession {
  sequencia: number;
  tipo: string;
  disciplina: string;
  assunto: string;
  duracaoMinutos: number;
}


export interface CoachErrorRecoveryEvidence {
  disciplina: string;
  assunto: string;
  subassunto: string;
  errosRegistrados: number;
  acertosAposUltimoErro: number;
  estadoRecuperacao:
    | "SEM_ACERTO_POSTERIOR"
    | "UM_ACERTO_POSTERIOR"
    | "DOIS_OU_MAIS_ACERTOS_POSTERIORES";
  causasDeclaradas: Record<string, number>;
}

export interface CoachReviewMethodEvidence {
  method: string;
  delayedOutcomes: number;
  independentRecoveries: number;
  failures: number;
  distinctSubtopics: number;
  successRate: number | null;
  preferenceEligible: boolean;
  timedDelayedOutcomes: number;
  timedIndependentRecoveries: number;
  timedDistinctSubtopics: number;
  totalTimedMinutes: number;
  observedIndependentRecoveriesPer10Minutes: number | null;
  efficiencyEligible: boolean;
}

export interface CoachDueReviewEvidence {
  revisaoId: string;
  disciplina: string;
  assunto: string;
  subassunto: string;
  vencimento: string;
  gatilho: string | null;
  revisoesRegistradas: number;
  proximoModo: string | null;
  intervaloDecididoDias: number | null;
  requerReaprendizagemImediata: boolean;
  racionalIntervalo: string[];
  proximoMetodo: string | null;
  motivoSelecaoMetodo: string | null;
  selecaoExploratoria: boolean;
}


export interface CoachEvidenceRoadmapItem {
  kind: "NEW_CONTENT" | "DIAGNOSTIC_QUESTIONS" | "RECOVERY" | "MAINTENANCE";
  disciplina: string;
  assunto: string;
  subassunto: string;
  state: string;
  reason: string;
}

export interface CoachEvidenceCoverage {
  totalSubtopics: number;
  theoryConfirmed: number;
  withQuestionEvidence: number;
  withRepeatedQuestionEvidence: number;
  activeErrorWithoutRecovery: number;
  roadmap: CoachEvidenceRoadmapItem[];
  caveats: string[];
}

export interface CoachGroundingContext {
  fonte: "REGISTROS_GRANULARES_DO_APLICATIVO";
  referenceDate: string;
  concurso: {
    concursoId: string | null;
    localProva: string | null;
    localLotacao: string | null;
  };
  evidencias: {
    tentativasReais: number;
    acertosReais: number;
    taxaAcertoObservada: number | null;
    tempoRegistradoMinutos: number;
    porDisciplina: CoachDisciplineEvidence[];
    calibracaoSemanal: WeeklyCalibrationReport;
    mapaEvidencias: CoachEvidenceCoverage;
    recuperacao: {
      topicosComErro: number;
      topicosSemAcertoPosterior: number;
      topicosComRecuperacaoRepetida: number;
      errosPorTopico: CoachErrorRecoveryEvidence[];
      revisoesAtivas: number;
      revisoesVencidas: CoachDueReviewEvidence[];
      politicaDeRevisao: string;
      comparacaoMetodos: CoachReviewMethodEvidence[];
      statusComparacaoMetodos:
        | "INSUFFICIENT_DATA"
        | "INCONCLUSIVE"
        | "OBSERVED_PREFERENCE"
        | "OBSERVED_EFFICIENCY_PREFERENCE";
      basePreferenciaMetodos: "RETENTION" | "EFFICIENCY" | null;
      metodoPreferidoObservado: string | null;
      razoesComparacaoMetodos: string[];
    };
  };
  decisaoSDE: {
    status: "SUCCESS" | "NO_TIME_AVAILABLE" | "INVALID_INPUT";
    disponibilidade: DailyAvailabilityResult | null;
    acoesPrioritarias: CoachDecisionAction[];
    plano: CoachPlannedSession[] | null;
    protecoesPlanner: string[];
    avisos: string[];
    erros: string[];
  };
}
