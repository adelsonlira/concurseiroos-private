import { StudyAvailabilityConfig } from "./core/availability/types";
import type {
  FlashcardRetrievalHistoryEntry,
  FlashcardRetrievalPerformance,
} from "./core/flashcards/types";
import type { GuidedLearningEvidence } from "./core/learning/types";
import type {
  AnswerConfidence,
  ErrorCause,
  ReviewDurationSource,
  ReviewMethod,
  ReviewMethodSelectionReason,
  ReviewMode,
  ReviewTrigger
} from "./core/review/types";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// CONCURSEIROOS - MASTER TYPE DEFINITIONS
// ==========================================
// High-performance NoSQL offline-first relational models designed for Dexie.js
// and Firestore synchronization.

export enum ConcursoStatus {
  PREVISTO = "PREVISTO",
  AUTORIZADO = "AUTORIZADO",
  COM_BANCA_DEFINIDA = "COM_BANCA_DEFINIDA",
  EDITAL_PUBLICADO = "EDITAL_PUBLICADO",
  CONCLUIDO = "CONCLUIDO",
  SUSPENSO = "SUSPENSO"
}

export enum ParseStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  FAILED = "FAILED"
}

export enum CardStatus {
  NEW = "NEW",
  LEARNING = "LEARNING",
  REVIEW = "REVIEW",
  LAPSED = "LAPSED"
}

export type StudyActivityKind =
  | "teoria"
  | "questoes"
  | "revisao"
  | "flashcards"
  | "simulado";

export interface StudySessionDecisionContext {
  atividadeEstudo: StudyActivityKind;
  sdeReferenceDate?: string;
  sdePrioridade?: number;
  sdeReasonCode?: string;
  sdeDiagnosticPurpose?: boolean;
  duracaoPlanejadaMinutos?: number | null;
  prescriptionId?: string;
  targetQuestionCount?: number | null;
  stretchQuestionCount?: number | null;
  materialId?: string;
  materialStartPage?: number;
  materialEndPage?: number;
  questionSourceId?: string;
  questionSourceLabel?: string;
  questionSourceKind?: "PRIVATE_MATERIAL" | "EXTERNAL_BANK";
  /** Explicit user confirmation after a theory session; never inferred automatically. */
  markTheoryCompleted?: boolean;
}

export enum StudySessionType {
  POMODORO = "POMODORO",
  STOPWATCH = "STOPWATCH",
  MANUAL = "MANUAL"
}

export enum TaskType {
  STUDY = "STUDY",
  REVISION = "REVISION",
  EXAM = "EXAM",
  SIMULATED = "SIMULATED",
  OTHER = "OTHER"
}

export enum DifficultyLevel {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD"
}

export enum FileType {
  PDF = "PDF",
  DOCX = "DOCX",
  TXT = "TXT",
  MARKDOWN = "MARKDOWN",
  LINK = "LINK"
}

// ------------------------------------------
// 1. CONCURSO
// ------------------------------------------
export interface Concurso {
  id: string; // UUID v4 or sync ID
  nome: string; // e.g., "Auditor Fiscal da Receita Federal"
  orgao: string; // e.g., "Receita Federal"
  banca: string; // e.g., "FGV", "Cebraspe", "FCC"
  status: ConcursoStatus;
  vagas: number;
  remuneracaoInicial: number; // e.g., 21029.09
  dataInscricaoInicio?: string; // ISO 8601 String
  dataInscricaoFim?: string; // ISO 8601 String
  dataProva?: string; // ISO 8601 String
  siteOficial?: string;
  isFavorite: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean; // Soft delete for offline synchronization
}

// ------------------------------------------
// 2. EDITAL
// ------------------------------------------
export interface Edital {
  id: string;
  concursoId: string; // Foreign Key: Concurso
  documentoId?: string; // Foreign Key: Documento (Se importado de um PDF local)
  urlEdital?: string;
  resumoIA?: string; // AI generated executive summary of the rules, vacancies, weights
  datasImportantes: {
    inscricoes: string;
    isencaoTaxa?: string;
    pagamentoTaxa: string;
    provaObjetiva: string;
    provaDiscursiva?: string;
    gabarito?: string;
  };
  bancaRegras: {
    tipoQuestao: "MULTIPLA_ESCOLHA" | "CERTO_ERRADO";
    penalidadeErrada: boolean; // e.g., Cebraspe: "uma errada anula uma certa"
    critériosDesempate: string[];
  };
  parseStatus: ParseStatus;
  parseError?: string;
  parsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------
// 3. DISCIPLINA
// ------------------------------------------
export interface Disciplina {
  id: string;
  concursoId: string; // Foreign Key: Concurso
  nome: string; // e.g., "Direito Constitucional"
  pesoPadrao: number; // weight of questions for overall grading
  ordem: number; // list visual hierarchy
  percentualAcertosAlvo: number | null; // null when no operational target was configured
  totalQuestoesRespondidas: number;
  totalQuestoesAcertadas: number;
  tempoTotalEstudoMinutos: number; // aggregated study session minutes
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 4. ASSUNTO
// ------------------------------------------
export interface Assunto {
  id: string;
  disciplinaId: string; // Foreign Key: Disciplina
  nome: string; // e.g., "Direitos Fundamentais"
  ordem: number;
  prioridadeEdital: "ALTA" | "MEDIA" | "BAIXA" | "NAO_INFORMADA"; // never infer priority when the source does not provide it
  metaQuestoesResolvidas: number; // e.g., 150 questions goal
  questoesRespondidas: number;
  questoesAcertadas: number;
  tempoEstudadoMinutos: number;
  progressoPorcentagem: number; // dynamic calculated index of study completion
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 5. SUBASSUNTO
// ------------------------------------------
export interface Subassunto {
  id: string;
  assuntoId: string; // Foreign Key: Assunto
  nome: string; // e.g., "Direito de Propriedade"
  ordem: number;
  completado: boolean;
  prioridadeRevisao: DifficultyLevel;
  anotacoesPessoais?: string; // local markdown rich notes
  questoesRespondidas: number;
  questoesAcertadas: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 6. QUESTÃO
// ------------------------------------------
export interface QuestaoOption {
  id: string;
  letra: string; // e.g., "A", "B", "C", "D", "E" or "C", "E"
  texto: string;
  isCorreta: boolean;
}

export interface Questao {
  id: string;
  subassuntoId?: string; // Foreign Key: Subassunto (optional, can map directly to Assunto)
  assuntoId: string; // Foreign Key: Assunto
  disciplinaId: string; // Foreign Key: Disciplina
  enunciado: string; // Markdown rich text
  tipo: "MULTIPLA_ESCOLHA" | "CERTO_ERRADO";
  opcoes: QuestaoOption[];
  explicacaoGeral?: string; // expert static or textbook explanation
  explicacaoIA?: string; // dynamically cached AI explanations
  gabaritoOficial: string; // optionId or letters "C" / "E"
  banca: string; // e.g., "FGV"
  ano: number; // e.g., 2024
  orgao: string; // e.g., "RFB"
  nivelDificuldade: DifficultyLevel;
  fonteDocumentoId?: string; // Reference to original proof, edital, or book PDF
  isCustomQuestion?: boolean; // created by student or AI
  resolvidaPeloUsuario?: boolean;
  ultimoResultadoUsuario?: "ACERTO" | "ERRO";
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 6.1 TENTATIVA DE QUESTÃO DO USUÁRIO
// ------------------------------------------
export interface TentativaQuestaoUsuario {
  id: string;
  questaoId: string;
  concursoId: string;
  disciplinaId: string;
  assuntoId: string;
  subassuntoId?: string;
  opcaoSelecionadaId: string;
  acertou: boolean;
  origem: "TREINO_ISOLADO" | "SIMULADO";
  contextoId?: string;
  tempoRespostaSegundos: number;
  respondidaEm: string;
  registradaManualmente?: boolean;
  fonteExterna?: string;
  /** Self-reported confidence. It is evidence about confidence, not proof of mastery. */
  nivelConfianca?: AnswerConfidence;
  /** User-declared cause when the attempt was wrong; never inferred by the app. */
  erroCausa?: ErrorCause;
  /** Short private note about the mistake. Does not contain or reproduce the source question by default. */
  erroNota?: string;
  /** True when the result came from a summarized batch instead of one-by-one entry. */
  registradaEmLote?: boolean;
  /** Identifier shared by all attempts expanded from the same summarized batch. */
  loteRegistroId?: string;
  /** A blank answer is counted as incorrect but remains distinguishable from a marked error. */
  respostaEmBranco?: boolean;
  /** Time per item was estimated from total batch time rather than observed individually. */
  tempoRespostaEstimado?: boolean;
  /** True only for questions explicitly prescribed as the first-contact diagnostic. */
  diagnosticoInicial?: boolean;
  /** True when the learner consulted material, solution or answer key during the attempt. */
  consultouMaterial?: boolean;
}

export interface ExternalQuestionAttemptInput {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string;
  acertou: boolean;
  tempoRespostaSegundos: number;
  fonteExterna?: string;
  nivelConfianca?: AnswerConfidence;
  erroCausa?: ErrorCause;
  erroNota?: string;
  /** Identificador da prescrição ou simulado que originou o registro. */
  contextId?: string;
  diagnosticoInicial?: boolean;
  consultouMaterial?: boolean;
}

export interface ExternalQuestionBatchInput {
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string;
  totalQuestoes: number;
  acertos: number;
  /** In an initial diagnostic, correct answers explicitly recalled with medium/high confidence. */
  acertosConfiantes?: number;
  emBranco?: number;
  tempoTotalSegundos: number;
  fonteExterna?: string;
  nivelConfianca?: AnswerConfidence;
  /** Identificador da prescrição ou simulado que originou o registro. */
  contextId?: string;
  diagnosticoInicial?: boolean;
  consultouMaterial?: boolean;
}

// ------------------------------------------
// 7. FLASHCARD
// ------------------------------------------
export interface Flashcard {
  id: string;
  subassuntoId?: string; // Foreign Key: Subassunto
  assuntoId: string; // Foreign Key: Assunto
  pergunta: string; // front of card (Markdown / math block syntax)
  resposta: string; // back of card (Markdown / legal article refs)
  status: CardStatus;
  
  // Backward-compatible scheduling fields. They are now governed by the
  // hybrid adaptive retrieval policy, not by a universal fixed ladder.
  intervaloDias: number; // last operational delay decided from observed retrieval
  /** @deprecated Kept only so old backups remain readable. It is not used for scheduling. */
  fatorFacilidade: number;
  repeticoes: number; // consecutive independent recoveries
  proximaRevisaoData: string; // ISO 8601 Date
  ultimaRevisaoData?: string;
  politicaVersao?: string;
  politicaMigradaDe?: string;
  estabilidadeObservadaDias?: number;
  recuperacoesIndependentesConsecutivas?: number;
  falhasRecuperacao?: number;
  ultimoResultadoRecuperacao?: FlashcardRetrievalPerformance;
  racionalUltimoIntervalo?: string[];
  requerReaprendizagemImediata?: boolean;
  dataLimiteProva?: string;
  historicoRecuperacoes?: FlashcardRetrievalHistoryEntry[];
  
  tagHistoricoLog?: string[]; // tags or filters
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 8. DOCUMENTO
// ------------------------------------------
export interface Documento {
  id: string;
  concursoId?: string; // Foreign Key: Concurso (Optional association)
  titulo: string; // e.g., "CF88_Completa.pdf"
  tipoArquivo: FileType;
  tamanhoBytes: number;
  caminhoLocal?: string; // Offline index within Dexie / OPFS / local cache
  urlNuvem?: string; // Remote CDN file if synced
  numeroPalavras?: number;
  dataUpload: string;
  metadadosProcessamento?: {
    totalPaginas?: number;
    reconhecimentoCaractere?: "OCR" | "TEXT_NATIVE";
    idioma?: string;
  };
  isDeleted?: boolean;
}

// ------------------------------------------
// 9. RESUMO
// ------------------------------------------
export interface Resumo {
  id: string;
  subassuntoId?: string; // Foreign Key: Subassunto
  assuntoId: string; // Foreign Key: Assunto
  titulo: string;
  conteudoMarkdown: string; // Rich text notes / synthesized content
  criadoPorIA: boolean; // Flag if generated via Gemini
  versao: number; // optimistic lock / collaborative edit tracking
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 10. ANOTAÇÃO
// ------------------------------------------
export interface Anotacao {
  id: string;
  documentoId?: string; // Target reference if placed inside a study PDF
  paginaDocumento?: number; // PDF coordinates page index
  subassuntoId?: string; // Foreign Key: Subassunto
  conteudo: string; // Note content
  posicaoCanvas?: {
    x: number; // relative placement coordinates for whiteboard/mindmaps
    y: number;
  };
  corHex: string; // custom visual grouping
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 11. PLANO DE ESTUDOS
// ------------------------------------------
export interface HorarioEstudoSemanal {
  diaSemana: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  horaInicio: string; // e.g., "08:00"
  horaFim: string; // e.g., "10:30"
  disciplinaId: string; // Foreign Key: Disciplina
  assuntoId?: string; // Optional target subject
}

export interface PlanoEstudo {
  id: string;
  concursoId: string; // Foreign Key: Concurso target
  nome: string; // e.g., "Ciclo de Estudos RFB - Pós-Edital"
  dataInicio: string;
  dataFim?: string;
  metaHorasSemanais: number; // target total hours of active studying
  gradeHorariaSemanal: HorarioEstudoSemanal[];
  cicloEstudosAtivo: boolean; // true if this represents the current study schedule
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 12. SIMULADO
// ------------------------------------------
export interface RespostaSimulado {
  questaoId: string;
  opcaoSelecionadaId: string; // option identifier or "C"/"E"
  isCorreta: boolean;
  tempoGastoSegundos: number;
}

export interface Simulado {
  id: string;
  concursoId: string; // Foreign Key: Concurso
  titulo: string; // e.g., "Simulado Geral #1 FGV"
  quantidadeQuestoes: number;
  tempoLimiteSegundos: number; // default exam timer
  questoesIds: string[]; // List of Questao ids included
  respostas: { [questaoId: string]: RespostaSimulado };
  percentualAcertos: number; // final grade (0-100)
  tempoEstudoGastoSegundos: number;
  status: "CRIADO" | "EM_ANDAMENTO" | "CONCLUIDO";
  iniciadoEm: string;
  concluidoEm?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 13. ESTATÍSTICAS
// ------------------------------------------
export interface DesempenhoDiario {
  data: string; // YYYY-MM-DD
  tempoEstudadoMinutos: number;
  questoesRespondidas: number;
  questoesAcertadas: number;
  flashcardsRevisados: number;
}

export interface Estatisticas {
  id: string; // User ID or "global_stats" local
  desempenhoGeralPorDisciplina: {
    [disciplinaId: string]: {
      nomeDisciplina: string;
      questoesRespondidas: number;
      questoesAcertadas: number;
      tempoMinutosEstudo: number;
    };
  };
  historicoAcertosQuestoes: {
    data: string;
    taxaAcerto: number;
  }[];
  streakDiasEstudo: number; // Current continuous days streak
  recordeStreakDias: number; // All-time streak
  pomodoroSessoesCompletas: number;
  tempoTotalGeralMinutos: number;
  questoesRespondidas: number;
  questoesAcertadas: number;
  flashcardsRevisados?: number;
  updatedAt: string;
}

// ------------------------------------------
// 14. AGENDA
// ------------------------------------------
export interface AgendaEvento {
  id: string;
  titulo: string;
  descricao?: string;
  dataHoraInicio: string; // ISO 8601 Timestamp
  dataHoraFim: string;
  tipo: TaskType;
  completo: boolean;
  // Dynamic relations
  concursoId?: string;
  disciplinaId?: string;
  planoEstudoId?: string;
  cronogramaRevisaoId?: string; // associated spaced recall
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 15. HISTÓRICO
// ------------------------------------------
export interface LogHistoricoAtividade {
  id: string;
  tipoAtividade: "ESTUDO_TEORIA" | "RESOLUCAO_QUESTAO" | "REVISAO_FLASHCARD" | "REVISAO_PROGRAMADA" | "SIMULADO" | "AI_COACH_CHAT" | "PARSER_DOCUMENTO";
  dataHora: string;
  descricao: string; // e.g., "Estudou Direito de Propriedade por 45 minutos"
  tempoGastoSegundos?: number;
  
  // Associative links for relational traceability
  concursoId?: string;
  disciplinaId?: string;
  assuntoId?: string;
  subassuntoId?: string;
  questaoId?: string;
  simuladoId?: string;
  
  metadata?: any; // versatile action payload logs
}

// ------------------------------------------
// 16. REVISÃO
// ------------------------------------------
export interface CronogramaRevisao {
  id: string;
  subassuntoId: string; // Foreign Key: Subassunto
  assuntoId: string; // Foreign Key: Assunto
  disciplinaId: string; // Foreign Key: Disciplina
  metodoRevisao: "SA" | "ANOTACOES" | "EXERCICIOS" | "OUTRO"; // SA = Spaced Repetition, active notes, exercises
  /** Legacy-compatible counter. In the adaptive policy it represents consecutive independent recoveries. */
  passosCicloAtuais: number;
  historicoTentativas: {
    revisadoEm: string;
    desempenhoAutoAvaliado: DifficultyLevel;
    recuperacaoIndependente?: boolean;
    usouAjuda?: boolean;
    intervaloDecididoDias?: number;
    racionalIntervalo?: string[];
    modoSeguinte?: ReviewMode;
    metodoAplicado?: ReviewMethod;
    motivoSelecaoMetodo?: ReviewMethodSelectionReason;
    selecaoExploratoria?: boolean;
    diasDesdeRevisaoAnterior?: number;
    tempoGastoSegundos?: number;
    duracaoFonte?: ReviewDurationSource;
  }[];
  proximaRevisaoData: string;
  desabilitada: boolean;
  /** Transparent trigger that created or refreshed this schedule. */
  gatilhoOrigem?: ReviewTrigger;
  ultimoGatilhoEm?: string;
  ultimoGatilhoId?: string;
  /** Versioned operational policy; not a claim of optimal retention. */
  politicaVersao?: string;
  estabilidadeDias?: number;
  recuperacoesIndependentesConsecutivas?: number;
  falhasRecuperacao?: number;
  ultimaDecisaoIntervaloDias?: number;
  racionalUltimoIntervalo?: string[];
  modoProximaRevisao?: ReviewMode;
  requerReaprendizagemImediata?: boolean;
  dataLimiteProva?: string;
  politicaMigradaDe?: string;
  metodoProximaRevisao?: ReviewMethod;
  motivoMetodoProximaRevisao?: ReviewMethodSelectionReason;
  proximaSelecaoExploratoria?: boolean;
  metodoPreferidoObservado?: ReviewMethod;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 17. IA (CONFIGURAÇÃO DE MODELOS & AGENTES)
// ------------------------------------------
export interface IAConfig {
  apiKey?: string; // Local override, else uses server-side inject
  modeloPadrao: "gemini-3.5-flash" | "gemini-3.1-pro-preview";
  temperaturaPadrao: number; // study generation parameters
  modoExplicacaoRapida: boolean; // default display size for AI responses
  promptPersonalizadoCoach?: string; // customize AI coach personality (e.g., "focado em tribunais")
}

// ------------------------------------------
// 18. COACH
// ------------------------------------------
export interface DiagnosticoEstudoCoach {
  id: string;
  dataDiagnostico: string;
  analiseSwot: {
    forcas: string[];
    fraquezas: string[];
    oportunidades: string[];
    ameacas: string[];
  };
  disciplinasCriticasIds: string[]; // Areas needing urgent attention (low hit rate)
  planoAcaoRecomendado: string; // Markdown step-by-step studying program guidelines
  cronogramaRevisaoFoco: string[]; // specific subjects suggested for immediate review
}

// ------------------------------------------
// 19. BIBLIOTECA
// ------------------------------------------
export interface PrivateLibraryMaterialMetadata {
  catalogMaterialId: string;
  accessMode: "USER_PRIVATE_LOCAL_COPY" | "USER_PRIVATE_CLOUD_COPY";
  rightsClassification: "PRIVATE_LICENSED_USER_COPY";
  sharingAllowed: false;
  contentExportAllowed: false;
  metadataExportAllowed: true;
  strategicUse: "PEDAGOGICAL_ROUTING_ONLY";
  sourceFileName: string;
  sourceGroup: string;
  courseTitle: string;
  lessonLabel: string;
  storageProvider?: "SUPABASE";
  storageBucket?: string;
  storagePath?: string;
  storageStatus?: "NOT_UPLOADED" | "AVAILABLE" | "MISSING";
  sourceSizeBytes?: number;
  sourceMimeType?: string;
  uploadedAt?: string;
  sourceSha256?: string;
}

export interface ItemBiblioteca {
  id: string;
  concursoId?: string; // Association to specific concurso
  disciplinaId?: string; // Parent discipline
  assuntoId?: string; // Parent assunto/topic
  titulo: string;
  descricao?: string;
  categoria: "LEGISLACAO" | "DOUTRINA" | "JURISPRUDENCIA" | "BIBLIOGRAFIA" | "OUTROS";
  linkAcesso: string; // online portal or internal document reference
  isFavorito: boolean;
  tags: string[];
  tipoMaterial?: "PDF" | "VIDEO" | "RESUMO" | "MAPA_MENTAL" | "QUESTAO" | "FLASHCARD" | "LINK" | "MARKDOWN" | "ANOTACAO";
  conteudoMarkdown?: string; // raw notes or markdown content
  dadosMapaMental?: string; // JSON serialized mind map node structure
  dadosVideo?: {
    linkUrl: string;
    notasEstudo?: { tempo: number; texto: string; }[];
  };
  dadosPDF?: {
    textoExtraido?: string;
    totalPaginas?: number;
    notasEstudo?: { pagina: number; texto: string; }[];
    indice?: Array<{
      titulo: string;
      paginaInicial: number;
      paginaFinal: number;
      disciplinaId?: string;
      assuntoId?: string;
      subassuntoIds?: string[];
      confianca: number;
      status: "AUTO_REVIEWABLE" | "USER_CONFIRMED";
    }>;
    indexStatus?: "NOT_INDEXED" | "AUTO_REVIEWABLE" | "USER_CONFIRMED";
    indexedAt?: string;
  };
  /** Metadata-only pointer to a private licensed study PDF. Never contains source text. */
  privateMaterial?: PrivateLibraryMaterialMetadata;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 20. CONFIGURAÇÃO (APP STATE CONFIG)
// ------------------------------------------
export interface ConfigUsuario {
  id: string; // Local single record "app_config"
  estudanteNome: string;
  estudanteEmail?: string;
  metaHorariaDiariaMinutos: number; // compatibility summary; daily truth comes from disponibilidadeEstudo
  concursoAlvoId?: string;
  localProva?: string;
  localLotacao?: string;
  disponibilidadeEstudo: StudyAvailabilityConfig;
  duracaoSessaoPreferidaMinutos: {
    teoria: number;
    questoes: number;
    revisao: number;
    flashcards: number;
    simulado: number;
  };
  configuracoesPomodoro: {
    focoMinutos: number; // e.g., 25
    descansoCurtoMinutos: number; // e.g., 5
    descansoLongoMinutos: number; // e.g., 15
    intervaloSessoes: number; // e.g., 4 sessions before long break
  };
  notificacoesAtivas: boolean;
  temaVisual: "LIGHT" | "DARK" | "SYSTEM";
  offlineSyncAtivo: boolean; // sync database automatically with cloud storage
  ultimoSyncTimestamp?: string;
  idiomaApp: "pt-BR" | "en";
}

// ------------------------------------------
// 21. HISTÓRICO DE IA (COACH CHAT & DOC PARSER LOGS)
// ------------------------------------------
export interface MensagemChat {
  id: string;
  remetente: "USER" | "AI";
  conteudo: string; // Markdown rich text containing studying advice, tables, equations
  timestamp: string;
}

export interface HistoricoChatIA {
  id: string;
  concursoId?: string; // Optional filter context
  titulo: string; // e.g., "Dúvidas Direito Administrativo FGV"
  mensagens: MensagemChat[];
  tokensUtilizadosTotal?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ------------------------------------------
// 22. SESSÃO (ACTIVE WORK STOPWATCH/POMODORO LOGS)
// ------------------------------------------
export interface SessaoEstudo {
  id: string;
  disciplinaId: string; // Foreign Key: Disciplina
  assuntoId?: string; // Foreign Key: Assunto
  subassuntoId?: string; // Foreign Key: Subassunto
  tipo: StudySessionType;
  /** Cognitive activity performed; separate from the timer mechanism. */
  atividadeEstudo?: StudyActivityKind;
  decisaoSDE?: Omit<StudySessionDecisionContext, "atividadeEstudo">;
  tempoGastoSegundos: number;
  concluidaComSucesso: boolean; // Pomodoro successfully completed
  logsPomodoroParadas?: {
    parouEm: string;
    retomouEm: string;
    motivo?: string;
  }[];
  dataInicio: string;
  dataFim: string;
  /** Explicit local calendar day used by the availability engine. */
  dataLocal?: string;
  contabilizaNaDisponibilidade?: boolean;
  anotacoesSession?: string; // notes generated on focus mode
  createdAt: string;
}

// ------------------------------------------
// 23. BACKUP (LOCAL STANDALONE STATE JSON EXPORT SCHEMA)
// ------------------------------------------
export interface BackupExportSchema {
  metadata: {
    versaoBackup: string; // e.g., "1.0.0"
    exportadoEm: string; // ISO timestamp
    estudanteNome: string;
    totalTamanhoBytes: number;
    appSource: "ConcurseiroOS";
    integrityAlgorithm?: "FNV1A64_CANONICAL_JSON";
    checksum?: string;
  };
  dados: {
    concursos: Concurso[];
    editais: Edital[];
    disciplinas: Disciplina[];
    assuntos: Assunto[];
    subassuntos: Subassunto[];
    questoes: Questao[];
    tentativasQuestoes: TentativaQuestaoUsuario[];
    flashcards: Flashcard[];
    documentos: Documento[];
    resumos: Resumo[];
    anotacoes: Anotacao[];
    planosEstudo: PlanoEstudo[];
    simulados: Simulado[];
    estatisticas: Estatisticas | null;
    agenda: AgendaEvento[];
    historicos: LogHistoricoAtividade[];
    cronogramasRevisao: CronogramaRevisao[];
    configuracao: ConfigUsuario | null;
    conversasIA: HistoricoChatIA[];
    sessoesEstudo: SessaoEstudo[];
    evidenciasAprendizagemGuiada: GuidedLearningEvidence[];
    itensBiblioteca: ItemBiblioteca[];
  };
}
