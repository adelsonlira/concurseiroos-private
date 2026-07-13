/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum KnowledgeState {
  UNKNOWN = "UNKNOWN",
  UNSEEN = "UNSEEN",
  OBSERVED = "OBSERVED",
  INVALID = "INVALID"
}

export enum ConstitutionalTier {
  RISCO_ELIMINACAO = "RISCO_ELIMINACAO",
  LACUNAS_ALTO_PESO = "LACUNAS_ALTO_PESO",
  RETORNO_ESPERADO = "RETORNO_ESPERADO",
  PROTECAO_MEMORIA = "PROTECAO_MEMORIA",
  EXPANSAO_EDITAL = "EXPANSAO_EDITAL",
  MANUTENCAO_EXCELENCIA = "MANUTENCAO_EXCELENCIA"
}

// 1. Hierarquia de Entidades do Concurso
export interface Concurso {
  id: string;
  nome: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  concursoId: string;
}

export interface Assunto {
  id: string;
  nome: string;
  disciplinaId: string;
}

export interface Subassunto {
  id: string;
  nome: string;
  assuntoId: string;
}

// 2. Configuração genérica do edital
export type TopicWeightSource = "OFFICIAL" | "NEUTRAL_PRIOR";
export type HistoricalIncidenceSource = "EMPIRICAL" | "UNAVAILABLE";

export interface AssuntoModelMetadata {
  topicWeightSource: TopicWeightSource;
  historicalIncidenceSource: HistoricalIncidenceSource;
  note?: string;
}

export interface EditalConfig {
  concursoId: string;
  concursoNome: string;
  banca: string; // e.g., "BancaA", "BancaB", "BancaC"
  tipoQuestao: "MULTIPLA_ESCOLHA" | "CERTO_ERRADO";
  pesosDisciplinas: { [disciplinaId: string]: number }; // weights (e.g., 1, 2, 3)
  minimosDisciplinas: { [disciplinaId: string]: number }; // minimum required hit rate (e.g. 0.40)
  pesosAssuntos: { [assuntoId: string]: number }; // weight or importance score for each topic
  quantidadeQuestoesProva: { [disciplinaId: string]: number };
  pontosPorQuestao: { [disciplinaId: string]: number };
  regrasPenalizacao: "UMA_ERRADA_ANULA_UMA" | "NENHUMA" | string;
  dataProva: string; // ISO date string e.g., "2026-10-15"
  incidenciaHistoricaAssuntos: { [assuntoId: string]: number }; // 0 to 1
  duracaoEstimadaProvaMinutos: number;
  /** Provenance for topic-level values used by the generic engine. */
  assuntoModelMetadata?: { [assuntoId: string]: AssuntoModelMetadata };
  /** Official global cut score, when the edital defines one. */
  pontuacaoMinimaGlobal?: number;
  /** Official maximum score, when the edital defines one. */
  pontuacaoMaximaGlobal?: number;
  /** True when the edital eliminates candidates who score zero in any discipline. */
  eliminaAoZerarDisciplina?: boolean;
}

// 3. Evidências do candidato
export interface TentativaQuestao {
  id: string;
  subassuntoId: string;
  acertou: boolean;
  data: string; // ISO Date e.g. "2026-07-12"
  origem: "TREINO_ISOLADO" | "SIMULADO";
  tempoRespostaSegundos: number;
}

export interface RevisaoHistorico {
  data: string; // ISO Date e.g. "2026-07-12"
  tipo: "teoria" | "questoes" | "revisao" | "flashcards";
}

export interface EvidenciaSubassunto {
  subassuntoId: string;
  teoriaConcluida?: boolean;
  dataUltimoEstudo?: string; // ISO Date e.g. "2026-07-12"
  flashcardsDisponiveis: number;
  flashcardsPendentes: number;
  tentativas: TentativaQuestao[];
  historicoRevisoes: RevisaoHistorico[];
  /** Earliest enabled review date supplied by the application scheduler. */
  proximaRevisaoProgramada?: string;
  /** True only when the scheduled date is on or before the SDE reference date. */
  revisaoProgramadaPendente?: boolean;
  /** Transparent source label; generic core does not infer it. */
  revisaoProgramadaGatilho?: string;
}

export interface EvidenciasCandidato {
  concursoId: string;
  porSubassunto: { [subassuntoId: string]: EvidenciaSubassunto };
}

// Outros tipos internos legados para compatibilidade e processamento
export interface SDEDiagnosis {
  disciplinasCriticasIds: string[];
  swot: {
    forcas: string[];
    fraquezas: string[];
    oportunidades: string[];
    ameacas: string[];
  };
  assuntoRendimento: { [assuntoId: string]: number };
  subassuntoRendimento: { [subassuntoId: string]: number };
  decayRates: { [subassuntoId: string]: number };
  tempoDisponivelMinutos: number;
}

export interface KnowledgeGraphNode {
  id: string;
  nome: string;
  dependencias: string[];
}

export interface KnowledgeGraph {
  nodes: { [id: string]: KnowledgeGraphNode };
}

export interface TimeHorizon {
  dataProva: string;
  diasAteAProva: number;
  horasDisponiveisPorDia?: number;
  referenceDate: string;
}

export enum EliminationRiskLevel {
  CRITICAL = "CRITICAL",
  WARNING = "WARNING",
  SAFE = "SAFE",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  NOT_APPLICABLE = "NOT_APPLICABLE",
  UNKNOWN = "UNKNOWN"
}

export interface OpportunityCostPolicy {
  minimumComparableActions: number;
  durationToleranceRatio: number;
}

export interface LearningLeveragePolicy {
  lowPerformanceUpperBound: number;
  leverageZoneLowerBound: number;
  leverageZoneUpperBound: number;
  masteredLowerBound: number;
}

export interface OpportunityCostResult {
  status: "CALCULATED" | "INSUFFICIENT_DATA";
  value: number | null;
  unit: "RELATIVE_SCORE" | null;
  consideredFactors: string[];
  missingData: string[];
  bestAlternativeActionId: string | null;
  bestAlternativeValue: number | null;
  bestAlternativeName?: string;
}

export interface MarginalReturnEstimate {
  status: "CALCULATED" | "INSUFFICIENT_DATA";
  expectedNetPointsPerHour: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH" | null;
  evidence: string[];
  missingData: string[];
}

export interface EliminationRiskResult {
  level: EliminationRiskLevel;
  disciplineHitRate: number | null;
  minimumRequired: number | null;
  margin: number | null;
  weightedCoverage: number;
  sampleSize: number;
  treinoHitRate: number | null;
  simuladoHitRate: number | null;
}

export interface KnowledgeAssessment {
  state: "UNSEEN" | "UNKNOWN" | "OBSERVED" | "INVALID";
  hitRate: number | null;
  sampleSize: number;
  totalAcertos: number;
  lastEvidenceAt: string | null;
  theoryCompleted: boolean;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number;
}

export interface XAIJustification {
  porQue: string;
  dadosUtilizados: string;
  beneficioEsperado: string | null;
  custoIgnorar: string;
  camadaConstitucional: ConstitutionalTier;
  fatosUtilizados: string;
  inferencias: string;
  dadosAusentes: string[];
  nivelConfianca: "ALTA" | "MEDIA" | "BAIXA";
  custoOportunidade: string;
  vetosConsiderados: string[];
  diagnosticPurpose?: boolean;
}

export interface RankingContext {
  tiedActionCount: number;
  isTied: boolean;
  tieBreakRule: "DETERMINISTIC_ACTION_ID" | null;
  note: string | null;
}

export interface StrategicAction {
  prioridade: number;
  score: number;
  tempoEstimadoMinutos: number;
  estimatedDurationMinutes: number | null;
  disciplinaId: string;
  disciplinaNome: string;
  assuntoId: string;
  assuntoNome: string;
  subassuntoId?: string;
  subassuntoNome?: string;
  tipo: "teoria" | "questoes" | "revisao" | "flashcards" | "simulado";
  ganhoEsperado: number | null;
  riscoEvitado: number | null;
  hitRate: number | null;
  custoOportunidade: number | null;
  justificativaXAI: XAIJustification;
  camadaConstitucional: ConstitutionalTier;
  diagnosticPurpose?: boolean;
  rankingContext?: RankingContext;
  reasonCode: "UNSEEN_THEORY" | "LOW_PERFORMANCE_THEORY" | "DIAGNOSTIC_QUESTIONS" | "OBSERVED_PRACTICE" | "SCHEDULED_REVIEW_DUE" | "REVISION_EXPIRED" | "HIGH_DECAY" | "HISTORICAL_DROP" | "RECENT_REGRESSION" | "FLASHCARDS_PENDING" | "SIMULADO_ELIGIBLE" | "NOT_ELIGIBLE";
  opportunityCostResult?: OpportunityCostResult;
  marginalReturnEstimate?: MarginalReturnEstimate;
  eliminationRiskResult?: EliminationRiskResult;
}

export interface EliminationRiskPolicy {
  minDisciplineSampleSize: number;
  minTopicSampleSizeForCoverage: number;
  minWeightedCoverage: number;
  warningMargin: number;
}

export interface ConstraintCheck {
  type: string;
  result: "PASSED" | "VETOED" | "NOT_APPLICABLE";
  reasonCode: string;
  reason: string;
}

export interface VetoResult {
  isVetoed: boolean;
  vetoType: string | null;
  reasonCode: string | null;
  reason: string | null;
  diagnosticPurpose?: boolean;
  evidence?: string[];
  checksPerformed: ConstraintCheck[];
}


