import { create } from "zustand";
import { buildDataprev2026Profile3AppSeed, DATAPREV_2026_PROFILE_3_ID } from "./config/concursos/dataprev-2026-perfil-3";
import { calculateDailyAvailability } from "./core/availability/availabilityEngine";
import { scheduleFlashcardReview } from "./core/flashcards/flashcardScheduler";
import type { FlashcardRetrievalPerformance } from "./core/flashcards/types";
import { AvailabilityOverride, DailyAvailabilityResult, WeeklyAvailabilityDay } from "./core/availability/types";
import { runDataprevDecisionForDate } from "./integrations/sde/dataprevDecisionAdapter";
import { SDEApplicationResult } from "./integrations/sde/types";
import { mergeLibrarySeedItems, sanitizeLibraryForBackup } from "./core/materials/libraryPrivacy";
import { completeReviewSchedule, createOrRefreshReviewSchedule } from "./core/review/reviewEngine";
import type {
  ReviewCompletionInput,
  ReviewPerformance,
  ReviewScheduleLike,
  ReviewTrigger
} from "./core/review/types";
import { 
  Concurso, Edital, Disciplina, Assunto, Subassunto, Questao, 
  Flashcard, Documento, Resumo, Anotacao, PlanoEstudo, Simulado, 
  Estatisticas, AgendaEvento, LogHistoricoAtividade, CronogramaRevisao, 
  ConfigUsuario, HistoricoChatIA, SessaoEstudo, ItemBiblioteca, TentativaQuestaoUsuario, ExternalQuestionAttemptInput, StudySessionDecisionContext,
  ConcursoStatus, ParseStatus, CardStatus, StudySessionType, 
  TaskType, DifficultyLevel, FileType, BackupExportSchema, MensagemChat
} from "./types";

interface ConcurseiroState {
  // Database tables
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
  estatisticas: Estatisticas;
  agenda: AgendaEvento[];
  historicoAtividades: LogHistoricoAtividade[];
  cronogramasRevisao: CronogramaRevisao[];
  configuracao: ConfigUsuario;
  conversasIA: HistoricoChatIA[];
  sessoesEstudo: SessaoEstudo[];
  biblioteca: ItemBiblioteca[];
  /** Ephemeral SDE output. It is recalculated from source data and is not persisted. */
  ultimaDecisaoSDE: SDEApplicationResult | null;

  // Active UI States
  activeConcursoId: string | null;
  activeDisciplinaId: string | null;
  activeAssuntoId: string | null;
  activeChatId: string | null;
  activeSimuladoId: string | null;
  activeDocumentoId: string | null;

  // Active STUDY TIMER state (Pomodoro / stopwatch)
  isTimerRunning: boolean;
  timerSecondsElapsed: number;
  timerType: StudySessionType;
  timerIntervalId: any | null;

  // Core Actions
  hydrateStore: () => void;
  resetAllData: () => void;
  importBackup: (backup: BackupExportSchema) => { success: boolean; error?: string };
  exportBackup: () => BackupExportSchema;

  updateConfiguracao: (updates: Partial<ConfigUsuario>) => void;
  setWeeklyAvailabilityDay: (day: WeeklyAvailabilityDay) => void;
  setAvailabilityOverride: (override: AvailabilityOverride) => void;
  removeAvailabilityOverride: (date: string) => void;
  getDailyAvailability: (date: string) => DailyAvailabilityResult;
  executarSDEParaData: (date: string) => SDEApplicationResult;
  limparDecisaoSDE: () => void;

  // Concurso Actions
  addConcurso: (concurso: Concurso) => void;
  updateConcurso: (id: string, updates: Partial<Concurso>) => void;
  deleteConcurso: (id: string) => void;
  setActiveConcurso: (id: string | null) => void;

  // Syllabus Parsing & Custom Integration
  importSyllabusFromAI: (data: {
    concursoNome: string;
    orgao: string;
    banca: string;
    disciplinas: Array<{
      nome: string;
      peso: number;
      assuntos: Array<{
        nome: string;
        prioridade: "ALTA" | "MEDIA" | "BAIXA";
        subassuntos: string[];
      }>;
    }>;
  }) => string; // returns created Concurso ID

  // Manual Syllabus Editing Actions
  addDisciplina: (disciplina: Disciplina) => void;
  updateDisciplina: (id: string, updates: Partial<Disciplina>) => void;
  deleteDisciplina: (id: string) => void;

  addAssunto: (assunto: Assunto) => void;
  updateAssunto: (id: string, updates: Partial<Assunto>) => void;
  deleteAssunto: (id: string) => void;

  addSubassunto: (subassunto: Subassunto) => void;
  updateSubassunto: (id: string, updates: Partial<Subassunto>) => void;
  deleteSubassunto: (id: string) => void;

  // Studying Focus Timer Actions
  startStudyTimer: (type: StudySessionType) => void;
  stopStudyTimer: () => void;
  tickStudyTimer: () => void;
  finishStudySession: (disciplinaId: string, assuntoId?: string, subassuntoId?: string, notes?: string, context?: StudySessionDecisionContext) => void;

  // Exercises
  addQuestao: (questao: Questao) => void;
  resolveQuestao: (questaoId: string, selectedOptionId: string, isCorrect: boolean, timeSpentSeconds: number, origin?: "TREINO_ISOLADO" | "SIMULADO", contextId?: string) => void;
  registrarTentativaExterna: (input: ExternalQuestionAttemptInput) => { success: boolean; error?: string };

  // Review cycle and error recovery
  agendarRevisaoSubassunto: (subassuntoId: string, trigger?: ReviewTrigger, triggerId?: string) => { success: boolean; error?: string };
  concluirRevisaoProgramada: (
    cronogramaId: string,
    input: ReviewPerformance | ReviewCompletionInput
  ) => { success: boolean; error?: string };
  definirRevisaoDesabilitada: (cronogramaId: string, desabilitada: boolean) => void;

  // Active retrieval with adaptive, exam-oriented flashcard scheduling
  addFlashcard: (flashcard: Flashcard) => void;
  reviewFlashcard: (id: string, performance: FlashcardRetrievalPerformance) => void;
  deleteFlashcard: (id: string) => void;

  // Simulated Exam Actions
  createSimulado: (titulo: string, concursoId: string, qCount: number, timeLimitSeconds: number, selectedSubjectIds?: string[]) => string;
  submitSimuladoAnswer: (simuladoId: string, questaoId: string, optionId: string, isCorrect: boolean, timeSpentSeconds: number) => void;
  finishSimulado: (simuladoId: string) => void;

  // AI Chat Messages
  addChatMessage: (chatId: string, message: Omit<MensagemChat, "id" | "timestamp">) => void;
  createNewChat: (concursoId?: string, title?: string) => string;

  // Library/Doc actions
  addDocumento: (doc: Documento) => void;
  addResumo: (resumo: Resumo) => void;
  updateResumo: (id: string, updates: Partial<Resumo>) => void;
  addBibliotecaItem: (item: ItemBiblioteca) => void;
  updateBibliotecaItem: (id: string, updates: Partial<ItemBiblioteca>) => void;
  deleteBibliotecaItem: (id: string) => void;
  saveToLocalStorage: () => void;
}

// -------------------------------------------------------------
// Initial official package: DATAPREV 2026 — Perfil 3
// -------------------------------------------------------------
const DATAPREV_SEED = buildDataprev2026Profile3AppSeed();
const DEFAULT_CONFIG: ConfigUsuario = DATAPREV_SEED.configuracao;
const DEFAULT_STATS: Estatisticas = DATAPREV_SEED.estatisticas;
const DEFAULT_ACTIVE_DISCIPLINE_ID = DATAPREV_SEED.disciplinas[0]?.id ?? null;
const DEFAULT_ACTIVE_ASSUNTO_ID = DATAPREV_SEED.assuntos[0]?.id ?? null;

function cloneDefaultAvailability() {
  return structuredClone(DEFAULT_CONFIG.disponibilidadeEstudo);
}

function normalizeConfig(input?: Partial<ConfigUsuario> | null): ConfigUsuario {
  const base = DEFAULT_CONFIG;
  const defaultAvailability = cloneDefaultAvailability();
  const suppliedAvailability = input?.disponibilidadeEstudo;
  const availability = suppliedAvailability
    ? {
        ...defaultAvailability,
        ...structuredClone(suppliedAvailability),
        weekly:
          Array.isArray(suppliedAvailability.weekly) &&
          suppliedAvailability.weekly.length === 7
            ? suppliedAvailability.weekly.map((day) => ({ ...day }))
            : defaultAvailability.weekly,
        overrides: Array.isArray(suppliedAvailability.overrides)
          ? suppliedAvailability.overrides.map((item) => ({ ...item }))
          : []
      }
    : defaultAvailability;

  return {
    ...base,
    ...input,
    metaHorariaDiariaMinutos:
      input?.metaHorariaDiariaMinutos ?? base.metaHorariaDiariaMinutos,
    concursoAlvoId: input?.concursoAlvoId ?? DATAPREV_2026_PROFILE_3_ID,
    localProva: input?.localProva ?? "Natal/RN",
    localLotacao: input?.localLotacao ?? "Natal/RN",
    disponibilidadeEstudo: availability,
    duracaoSessaoPreferidaMinutos: {
      ...base.duracaoSessaoPreferidaMinutos,
      ...(input?.duracaoSessaoPreferidaMinutos ?? {})
    },
    configuracoesPomodoro: {
      ...base.configuracoesPomodoro,
      ...(input?.configuracoesPomodoro ?? {})
    }
  };
}

function toLocalDateKey(timestamp: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}


function toCoreReviewSchedule(schedule: CronogramaRevisao): ReviewScheduleLike {
  return {
    ...schedule,
    historicoTentativas: schedule.historicoTentativas.map((item) => ({
      revisadoEm: item.revisadoEm,
      desempenhoAutoAvaliado: item.desempenhoAutoAvaliado as ReviewPerformance,
      recuperacaoIndependente: item.recuperacaoIndependente,
      usouAjuda: item.usouAjuda,
      intervaloDecididoDias: item.intervaloDecididoDias,
      racionalIntervalo: item.racionalIntervalo ? [...item.racionalIntervalo] : undefined,
      modoSeguinte: item.modoSeguinte,
      metodoAplicado: item.metodoAplicado,
      motivoSelecaoMetodo: item.motivoSelecaoMetodo,
      selecaoExploratoria: item.selecaoExploratoria,
      diasDesdeRevisaoAnterior: item.diasDesdeRevisaoAnterior,
      tempoGastoSegundos: item.tempoGastoSegundos,
      duracaoFonte: item.duracaoFonte
    }))
  };
}

function upsertReviewScheduleForSubtopic(args: {
  schedules: CronogramaRevisao[];
  disciplinaId: string;
  assuntoId: string;
  subassuntoId: string;
  trigger: ReviewTrigger;
  triggerTimestamp: string;
  triggerId?: string;
  examDate?: string;
}): CronogramaRevisao[] {
  const existing = args.schedules.find(
    (item) => item.subassuntoId === args.subassuntoId && !item.isDeleted
  );
  const updated = createOrRefreshReviewSchedule({
    existing,
    identity: {
      id: existing?.id ?? `review-${args.subassuntoId}`,
      disciplinaId: args.disciplinaId,
      assuntoId: args.assuntoId,
      subassuntoId: args.subassuntoId
    },
    trigger: args.trigger,
    triggerTimestamp: args.triggerTimestamp,
    triggerId: args.triggerId,
    examDate: args.examDate
  });

  const schedule: CronogramaRevisao = {
    ...updated,
    metodoRevisao: existing?.metodoRevisao ?? "SA",
    historicoTentativas: updated.historicoTentativas.map((item) => ({
      revisadoEm: item.revisadoEm,
      desempenhoAutoAvaliado: item.desempenhoAutoAvaliado as DifficultyLevel,
      recuperacaoIndependente: item.recuperacaoIndependente,
      usouAjuda: item.usouAjuda,
      intervaloDecididoDias: item.intervaloDecididoDias,
      racionalIntervalo: item.racionalIntervalo ? [...item.racionalIntervalo] : undefined,
      modoSeguinte: item.modoSeguinte,
      metodoAplicado: item.metodoAplicado,
      motivoSelecaoMetodo: item.motivoSelecaoMetodo,
      selecaoExploratoria: item.selecaoExploratoria,
      diasDesdeRevisaoAnterior: item.diasDesdeRevisaoAnterior,
      tempoGastoSegundos: item.tempoGastoSegundos,
      duracaoFonte: item.duracaoFonte
    }))
  };

  return existing
    ? args.schedules.map((item) => (item.id === existing.id ? schedule : item))
    : [...args.schedules, schedule];
}

function isUntouchedLegacyDemo(parsed: any): boolean {
  return (
    Array.isArray(parsed?.concursos) &&
    parsed.concursos.length === 1 &&
    parsed.concursos[0]?.id === "concurso-rfb-2026" &&
    (!Array.isArray(parsed.sessoesEstudo) || parsed.sessoesEstudo.length === 0) &&
    (!Array.isArray(parsed.historicoAtividades) || parsed.historicoAtividades.length === 0)
  );
}

// -------------------------------------------------------------
// 2. State & Actions Implementation with localStorage Support
// -------------------------------------------------------------
export const useConcurseiroStore = create<ConcurseiroState>((set, get) => ({
  concursos: [],
  editais: [],
  disciplinas: [],
  assuntos: [],
  subassuntos: [],
  questoes: [],
  tentativasQuestoes: [],
  flashcards: [],
  documentos: [],
  resumos: [],
  anotacoes: [],
  planosEstudo: [],
  simulados: [],
  estatisticas: DEFAULT_STATS,
  agenda: [],
  historicoAtividades: [],
  cronogramasRevisao: [],
  configuracao: DEFAULT_CONFIG,
  conversasIA: [],
  sessoesEstudo: [],
  biblioteca: [],
  ultimaDecisaoSDE: null,

  activeConcursoId: null,
  activeDisciplinaId: null,
  activeAssuntoId: null,
  activeChatId: null,
  activeSimuladoId: null,
  activeDocumentoId: null,

  isTimerRunning: false,
  timerSecondsElapsed: 0,
  timerType: StudySessionType.POMODORO,
  timerIntervalId: null,

  hydrateStore: () => {
    try {
      const stored = localStorage.getItem("CONCURSEIRO_OS_STORE");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isUntouchedLegacyDemo(parsed)) {
          const seed = buildDataprev2026Profile3AppSeed();
          set({
            concursos: [seed.concurso],
            editais: [seed.edital],
            disciplinas: seed.disciplinas,
            assuntos: seed.assuntos,
            subassuntos: seed.subassuntos,
            questoes: [],
            tentativasQuestoes: [],
            flashcards: [],
            documentos: [],
            resumos: [],
            anotacoes: [],
            planosEstudo: [],
            simulados: [],
            estatisticas: seed.estatisticas,
            agenda: [],
            historicoAtividades: [],
            cronogramasRevisao: [],
            configuracao: seed.configuracao,
            conversasIA: [],
            sessoesEstudo: [],
            biblioteca: seed.biblioteca,
            ultimaDecisaoSDE: null,
            activeConcursoId: seed.concurso.id,
            activeDisciplinaId: seed.disciplinas[0]?.id ?? null,
            activeAssuntoId: seed.assuntos[0]?.id ?? null,
            activeChatId: null,
            activeSimuladoId: null,
            activeDocumentoId: null,
            isTimerRunning: false,
            timerSecondsElapsed: 0,
            timerIntervalId: null
          });
          get().createNewChat(seed.concurso.id, "Coach DATAPREV — Perfil 3");
          get().saveToLocalStorage();
          return;
        }

        const seed = buildDataprev2026Profile3AppSeed();
        set({
          ...parsed,
          tentativasQuestoes: parsed.tentativasQuestoes ?? [],
          configuracao: normalizeConfig(parsed.configuracao),
          biblioteca: mergeLibrarySeedItems(parsed.biblioteca ?? [], seed.biblioteca),
          ultimaDecisaoSDE: null,
          isTimerRunning: false,
          timerSecondsElapsed: 0,
          timerIntervalId: null
        });
      } else {
        const seed = buildDataprev2026Profile3AppSeed();
        set({
          concursos: [seed.concurso],
          editais: [seed.edital],
          disciplinas: seed.disciplinas,
          assuntos: seed.assuntos,
          subassuntos: seed.subassuntos,
          questoes: [],
          tentativasQuestoes: [],
          flashcards: [],
          documentos: [],
          resumos: [],
          anotacoes: [],
          planosEstudo: [],
          simulados: [],
          estatisticas: seed.estatisticas,
          agenda: [],
          historicoAtividades: [],
          cronogramasRevisao: [],
          configuracao: seed.configuracao,
          conversasIA: [],
          sessoesEstudo: [],
          biblioteca: seed.biblioteca,
          ultimaDecisaoSDE: null,
          activeConcursoId: seed.concurso.id,
          activeDisciplinaId: seed.disciplinas[0]?.id ?? null,
          activeAssuntoId: seed.assuntos[0]?.id ?? null,
          activeChatId: null,
          activeSimuladoId: null,
          activeDocumentoId: null,
          isTimerRunning: false,
          timerSecondsElapsed: 0,
          timerIntervalId: null
        });
        get().createNewChat(seed.concurso.id, "Coach DATAPREV — Perfil 3");
        get().saveToLocalStorage();
      }
    } catch (e) {
      console.error("Hydration Error in ConcurseiroOS Store", e);
    }
  },

  resetAllData: () => {
    localStorage.removeItem("CONCURSEIRO_OS_STORE");
    const seed = buildDataprev2026Profile3AppSeed();
    set({
      concursos: [seed.concurso],
      editais: [seed.edital],
      disciplinas: seed.disciplinas,
      assuntos: seed.assuntos,
      subassuntos: seed.subassuntos,
      questoes: [],
      tentativasQuestoes: [],
      flashcards: [],
      documentos: [],
      resumos: [],
      anotacoes: [],
      planosEstudo: [],
      simulados: [],
      estatisticas: seed.estatisticas,
      agenda: [],
      historicoAtividades: [],
      cronogramasRevisao: [],
      configuracao: seed.configuracao,
      conversasIA: [],
      sessoesEstudo: [],
      biblioteca: seed.biblioteca,
      ultimaDecisaoSDE: null,
      activeConcursoId: seed.concurso.id,
      activeDisciplinaId: seed.disciplinas[0]?.id ?? null,
      activeAssuntoId: seed.assuntos[0]?.id ?? null,
      activeChatId: null,
      activeSimuladoId: null,
      activeDocumentoId: null,
      isTimerRunning: false,
      timerSecondsElapsed: 0,
      timerIntervalId: null
    });
    get().createNewChat(seed.concurso.id, "Coach DATAPREV — Perfil 3");
    get().saveToLocalStorage();
  },

  saveToLocalStorage: () => {
    if (typeof localStorage === "undefined") return;
    const { 
      concursos, editais, disciplinas, assuntos, subassuntos, questoes, tentativasQuestoes, 
      flashcards, documentos, resumos, anotacoes, planosEstudo, simulados, 
      estatisticas, agenda, historicoAtividades, cronogramasRevisao, 
      configuracao, conversasIA, sessoesEstudo, biblioteca, activeConcursoId,
      activeDisciplinaId, activeAssuntoId, activeChatId, activeSimuladoId,
      activeDocumentoId
    } = get();
    
    const rawToSave = {
      concursos, editais, disciplinas, assuntos, subassuntos, questoes, tentativasQuestoes, 
      flashcards, documentos, resumos, anotacoes, planosEstudo, simulados, 
      estatisticas, agenda, historicoAtividades, cronogramasRevisao, 
      configuracao, conversasIA, sessoesEstudo, biblioteca, activeConcursoId,
      activeDisciplinaId, activeAssuntoId, activeChatId, activeSimuladoId,
      activeDocumentoId
    };
    
    localStorage.setItem("CONCURSEIRO_OS_STORE", JSON.stringify(rawToSave));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("concurseiroos:local-save"));
    }
  },

  importBackup: (backup: BackupExportSchema) => {
    try {
      if (backup.metadata?.appSource !== "ConcurseiroOS") {
        return { success: false, error: "Formato de arquivo inválido. Backup desconhecido." };
      }
      
      const d = backup.dados;
      set({
        concursos: d.concursos || [],
        editais: d.editais || [],
        disciplinas: d.disciplinas || [],
        assuntos: d.assuntos || [],
        subassuntos: d.subassuntos || [],
        questoes: d.questoes || [],
        tentativasQuestoes: d.tentativasQuestoes || [],
        flashcards: d.flashcards || [],
        documentos: d.documentos || [],
        resumos: d.resumos || [],
        anotacoes: d.anotacoes || [],
        planosEstudo: d.planosEstudo || [],
        simulados: d.simulados || [],
        estatisticas: d.estatisticas || DEFAULT_STATS,
        agenda: d.agenda || [],
        historicoAtividades: d.historicos || [],
        cronogramasRevisao: d.cronogramasRevisao || [],
        configuracao: normalizeConfig(d.configuracao),
        conversasIA: d.conversasIA || [],
        sessoesEstudo: d.sessoesEstudo || [],
        biblioteca: mergeLibrarySeedItems(
          sanitizeLibraryForBackup(d.itensBiblioteca || []),
          buildDataprev2026Profile3AppSeed().biblioteca
        ),
        ultimaDecisaoSDE: null,
        activeConcursoId: d.concursos?.[0]?.id || null,
        activeDisciplinaId: d.disciplinas?.[0]?.id || null,
        activeAssuntoId: d.assuntos?.[0]?.id || null,
        isTimerRunning: false,
        timerSecondsElapsed: 0
      });
      
      get().saveToLocalStorage();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro desconhecido ao processar JSON." };
    }
  },

  exportBackup: () => {
    const s = get();
    return {
      metadata: {
        versaoBackup: "1.0.0",
        exportadoEm: new Date().toISOString(),
        estudanteNome: s.configuracao.estudanteNome,
        totalTamanhoBytes: JSON.stringify(s).length,
        appSource: "ConcurseiroOS"
      },
      dados: {
        concursos: s.concursos,
        editais: s.editais,
        disciplinas: s.disciplinas,
        assuntos: s.assuntos,
        subassuntos: s.subassuntos,
        questoes: s.questoes,
        tentativasQuestoes: s.tentativasQuestoes,
        flashcards: s.flashcards,
        documentos: s.documentos,
        resumos: s.resumos,
        anotacoes: s.anotacoes,
        planosEstudo: s.planosEstudo,
        simulados: s.simulados,
        estatisticas: s.estatisticas,
        agenda: s.agenda,
        historicos: s.historicoAtividades,
        cronogramasRevisao: s.cronogramasRevisao,
        configuracao: s.configuracao,
        conversasIA: s.conversasIA,
        sessoesEstudo: s.sessoesEstudo,
        itensBiblioteca: sanitizeLibraryForBackup(s.biblioteca)
      }
    };
  },

  updateConfiguracao: (updates) => {
    set((state) => ({
      configuracao: normalizeConfig({ ...state.configuracao, ...updates })
    }));
    get().saveToLocalStorage();
  },

  setWeeklyAvailabilityDay: (day) => {
    const current = get().configuracao.disponibilidadeEstudo;
    const weekly = current.weekly.map((item) =>
      item.dayOfWeek === day.dayOfWeek ? { ...day } : { ...item }
    );
    set((state) => ({
      configuracao: {
        ...state.configuracao,
        metaHorariaDiariaMinutos: Math.max(
          0,
          ...weekly.filter((item) => item.enabled).map((item) => item.totalMinutes)
        ),
        disponibilidadeEstudo: {
          ...state.configuracao.disponibilidadeEstudo,
          weekly
        }
      }
    }));
    get().saveToLocalStorage();
  },

  setAvailabilityOverride: (override) => {
    const current = get().configuracao.disponibilidadeEstudo;
    const overrides = [
      ...current.overrides.filter((item) => item.date !== override.date),
      { ...override }
    ].sort((a, b) => a.date.localeCompare(b.date));
    set((state) => ({
      configuracao: {
        ...state.configuracao,
        disponibilidadeEstudo: {
          ...state.configuracao.disponibilidadeEstudo,
          overrides
        }
      }
    }));
    get().saveToLocalStorage();
  },

  removeAvailabilityOverride: (date) => {
    set((state) => ({
      configuracao: {
        ...state.configuracao,
        disponibilidadeEstudo: {
          ...state.configuracao.disponibilidadeEstudo,
          overrides: state.configuracao.disponibilidadeEstudo.overrides.filter(
            (item) => item.date !== date
          )
        }
      }
    }));
    get().saveToLocalStorage();
  },

  getDailyAvailability: (date) => {
    const state = get();
    const timeZone = state.configuracao.disponibilidadeEstudo.timeZone;
    return calculateDailyAvailability({
      date,
      config: state.configuracao.disponibilidadeEstudo,
      completedStudy: state.sessoesEstudo.map((session) => ({
        id: session.id,
        date: session.dataLocal ?? toLocalDateKey(session.dataFim, timeZone),
        minutes: Math.ceil(session.tempoGastoSegundos / 60),
        countsAgainstAvailability: session.contabilizaNaDisponibilidade ?? true
      }))
    });
  },

  executarSDEParaData: (date) => {
    const state = get();
    const result = runDataprevDecisionForDate(
      {
        configuracao: state.configuracao,
        subassuntos: state.subassuntos,
        tentativasQuestoes: state.tentativasQuestoes,
        sessoesEstudo: state.sessoesEstudo,
        flashcards: state.flashcards,
        cronogramasRevisao: state.cronogramasRevisao
      },
      date
    );
    set({ ultimaDecisaoSDE: result });
    return result;
  },

  limparDecisaoSDE: () => set({ ultimaDecisaoSDE: null }),

  // -------------------------------------------------------------
  // Concurso Actions
  // -------------------------------------------------------------
  addConcurso: (c) => {
    set(state => ({ concursos: [...state.concursos, c] }));
    get().saveToLocalStorage();
  },
  updateConcurso: (id, updates) => {
    set(state => ({
      concursos: state.concursos.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
    }));
    get().saveToLocalStorage();
  },
  deleteConcurso: (id) => {
    set(state => ({
      concursos: state.concursos.filter(c => c.id !== id),
      activeConcursoId: state.activeConcursoId === id ? null : state.activeConcursoId
    }));
    get().saveToLocalStorage();
  },
  setActiveConcurso: (id) => {
    const firstDisc = get().disciplinas.find(d => d.concursoId === id);
    const firstAss = firstDisc ? get().assuntos.find(a => a.disciplinaId === firstDisc.id) : null;
    
    set({
      activeConcursoId: id,
      activeDisciplinaId: firstDisc?.id || null,
      activeAssuntoId: firstAss?.id || null
    });
    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // Syllabus Import Mechanism
  // -------------------------------------------------------------
  importSyllabusFromAI: (data) => {
    const concursoId = "concurso-" + Date.now();
    const newConcurso: Concurso = {
      id: concursoId,
      nome: data.concursoNome || "Novo Concurso Importado",
      orgao: data.orgao || "Órgão Indefinido",
      banca: data.banca || "Banca Indefinida",
      status: ConcursoStatus.EDITAL_PUBLICADO,
      vagas: 0,
      remuneracaoInicial: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newDisciplinas: Disciplina[] = [];
    const newAssuntos: Assunto[] = [];
    const newSubassuntos: Subassunto[] = [];

    // Pre-existing subjects in DB to avoid any duplication across the applet
    const existingDisciplinas = get().disciplinas;
    const existingAssuntos = get().assuntos;

    data.disciplinas.forEach((d, dIdx) => {
      const discId = `disc-${concursoId}-${dIdx}`;
      newDisciplinas.push({
        id: discId,
        concursoId: concursoId,
        nome: d.nome,
        pesoPadrao: d.peso || 1,
        ordem: dIdx + 1,
        percentualAcertosAlvo: 80,
        totalQuestoesRespondidas: 0,
        totalQuestoesAcertadas: 0,
        tempoTotalEstudoMinutos: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      d.assuntos.forEach((a, aIdx) => {
        const assId = `ass-${discId}-${aIdx}`;
        newAssuntos.push({
          id: assId,
          disciplinaId: discId,
          nome: a.nome,
          ordem: aIdx + 1,
          prioridadeEdital: a.prioridade || "MEDIA",
          metaQuestoesResolvidas: 100,
          questoesRespondidas: 0,
          questoesAcertadas: 0,
          tempoEstudadoMinutos: 0,
          progressoPorcentagem: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        a.subassuntos.forEach((sa, saIdx) => {
          const subId = `sub-${assId}-${saIdx}`;
          newSubassuntos.push({
            id: subId,
            assuntoId: assId,
            nome: sa,
            ordem: saIdx + 1,
            completado: false,
            prioridadeRevisao: DifficultyLevel.MEDIUM,
            questoesRespondidas: 0,
            questoesAcertadas: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
      });
    });

    set(state => ({
      concursos: [...state.concursos, newConcurso],
      disciplinas: [...state.disciplinas, ...newDisciplinas],
      assuntos: [...state.assuntos, ...newAssuntos],
      subassuntos: [...state.subassuntos, ...newSubassuntos],
      activeConcursoId: concursoId,
      activeDisciplinaId: newDisciplinas[0]?.id || null,
      activeAssuntoId: newAssuntos[0]?.id || null
    }));

    // Generate dynamic activity log
    const activity: LogHistoricoAtividade = {
      id: "act-" + Date.now(),
      tipoAtividade: "PARSER_DOCUMENTO",
      dataHora: new Date().toISOString(),
      descricao: `Importou com IA o Edital para o concurso ${newConcurso.nome} (${newConcurso.banca}).`,
      concursoId: concursoId
    };

    set(state => ({
      historicoAtividades: [activity, ...state.historicoAtividades]
    }));

    get().saveToLocalStorage();
    return concursoId;
  },

  // -------------------------------------------------------------
  // Manual Syllabus CRUD (Allows complete manual customization)
  // -------------------------------------------------------------
  addDisciplina: (d) => {
    set(state => ({ disciplinas: [...state.disciplinas, d] }));
    get().saveToLocalStorage();
  },
  updateDisciplina: (id, updates) => {
    set(state => ({
      disciplinas: state.disciplinas.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)
    }));
    get().saveToLocalStorage();
  },
  deleteDisciplina: (id) => {
    set(state => ({
      disciplinas: state.disciplinas.filter(d => d.id !== id),
      assuntos: state.assuntos.filter(a => a.disciplinaId !== id),
      activeDisciplinaId: state.activeDisciplinaId === id ? null : state.activeDisciplinaId
    }));
    get().saveToLocalStorage();
  },

  addAssunto: (a) => {
    set(state => ({ assuntos: [...state.assuntos, a] }));
    get().saveToLocalStorage();
  },
  updateAssunto: (id, updates) => {
    set(state => ({
      assuntos: state.assuntos.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a)
    }));
    get().saveToLocalStorage();
  },
  deleteAssunto: (id) => {
    set(state => ({
      assuntos: state.assuntos.filter(a => a.id !== id),
      subassuntos: state.subassuntos.filter(sa => sa.assuntoId !== id),
      activeAssuntoId: state.activeAssuntoId === id ? null : state.activeAssuntoId
    }));
    get().saveToLocalStorage();
  },

  addSubassunto: (sa) => {
    set(state => ({ subassuntos: [...state.subassuntos, sa] }));
    get().saveToLocalStorage();
  },
  updateSubassunto: (id, updates) => {
    set(state => ({
      subassuntos: state.subassuntos.map(sa => sa.id === id ? { ...sa, ...updates, updatedAt: new Date().toISOString() } : sa)
    }));
    get().saveToLocalStorage();
  },
  deleteSubassunto: (id) => {
    set(state => ({ subassuntos: state.subassuntos.filter(sa => sa.id !== id) }));
    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // Study stopwatch & Pomodoro Timer Actions
  // -------------------------------------------------------------
  startStudyTimer: (type) => {
    if (get().isTimerRunning) return;
    
    set({
      isTimerRunning: true,
      timerType: type
    });
  },

  stopStudyTimer: () => {
    set({ isTimerRunning: false });
  },

  tickStudyTimer: () => {
    if (get().isTimerRunning) {
      set(state => ({ timerSecondsElapsed: state.timerSecondsElapsed + 1 }));
    }
  },

  finishStudySession: (disciplinaId, assuntoId, subassuntoId, notes, context) => {
    const elapsedSeconds = get().timerSecondsElapsed;
    if (elapsedSeconds < 5) {
      // Avoid tracking trivial elapsed sessions under 5 seconds
      set({ isTimerRunning: false, timerSecondsElapsed: 0 });
      return;
    }

    const elapsedMinutes = Math.ceil(elapsedSeconds / 60);
    const now = new Date().toISOString();
    const localDate = toLocalDateKey(
      now,
      get().configuracao.disponibilidadeEstudo.timeZone
    );

    const newSession: SessaoEstudo = {
      id: "sess-" + Date.now(),
      disciplinaId,
      assuntoId,
      subassuntoId,
      tipo: get().timerType,
      atividadeEstudo: context?.atividadeEstudo,
      decisaoSDE: context
        ? {
            sdeReferenceDate: context.sdeReferenceDate,
            sdePrioridade: context.sdePrioridade,
            sdeReasonCode: context.sdeReasonCode,
            sdeDiagnosticPurpose: context.sdeDiagnosticPurpose,
            duracaoPlanejadaMinutos: context.duracaoPlanejadaMinutos
          }
        : undefined,
      tempoGastoSegundos: elapsedSeconds,
      concluidaComSucesso: true,
      dataInicio: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      dataFim: now,
      dataLocal: localDate,
      contabilizaNaDisponibilidade: true,
      anotacoesSession: notes,
      createdAt: now
    };

    // Update study statistics dynamically
    const stats = { ...get().estatisticas };
    stats.tempoTotalGeralMinutos += elapsedMinutes;
    
    if (!stats.desempenhoGeralPorDisciplina[disciplinaId]) {
      const disc = get().disciplinas.find(d => d.id === disciplinaId);
      stats.desempenhoGeralPorDisciplina[disciplinaId] = {
        nomeDisciplina: disc?.nome || "Indefinida",
        questoesRespondidas: 0,
        questoesAcertadas: 0,
        tempoMinutosEstudo: 0
      };
    }
    stats.desempenhoGeralPorDisciplina[disciplinaId].tempoMinutosEstudo += elapsedMinutes;

    if (get().timerType === StudySessionType.POMODORO) {
      stats.pomodoroSessoesCompletas += 1;
    }

    // Accumulate time on specific Assunto & Subassunto if supplied
    const updatedAssuntos = get().assuntos.map(a => {
      if (a.id === assuntoId) {
        return { ...a, tempoEstudadoMinutos: a.tempoEstudadoMinutos + elapsedMinutes };
      }
      return a;
    });

    const updatedDisciplinas = get().disciplinas.map(d => {
      if (d.id === disciplinaId) {
        return { ...d, tempoTotalEstudoMinutos: d.tempoTotalEstudoMinutos + elapsedMinutes };
      }
      return d;
    });

    const updatedSubassuntos = get().subassuntos.map((subtopic) => {
      const shouldConfirmTheory =
        context?.atividadeEstudo === "teoria" &&
        context.markTheoryCompleted === true &&
        subassuntoId === subtopic.id;
      return shouldConfirmTheory
        ? { ...subtopic, completado: true, updatedAt: now }
        : subtopic;
    });

    const shouldScheduleTheoryReview =
      context?.atividadeEstudo === "teoria" &&
      context.markTheoryCompleted === true &&
      Boolean(assuntoId && subassuntoId);
    const updatedReviewSchedules = shouldScheduleTheoryReview
      ? upsertReviewScheduleForSubtopic({
          schedules: get().cronogramasRevisao,
          disciplinaId,
          assuntoId: assuntoId!,
          subassuntoId: subassuntoId!,
          trigger: "TEORIA_CONCLUIDA",
          triggerTimestamp: now,
          triggerId: newSession.id,
          examDate: get().concursos.find((item) => item.id === get().configuracao.concursoAlvoId)?.dataProva
        })
      : get().cronogramasRevisao;

    // Create a new visual activity log trace
    const discObj = get().disciplinas.find(d => d.id === disciplinaId);
    const assObj = get().assuntos.find(a => a.id === assuntoId);
    const desc = `Estudou ${discObj?.nome || "Matéria"}${assObj ? ` - ${assObj.nome}` : ""} por ${Math.round(elapsedSeconds / 60)} min.`;

    const activity: LogHistoricoAtividade = {
      id: "act-" + Date.now(),
      tipoAtividade: "ESTUDO_TEORIA",
      dataHora: now,
      descricao: desc,
      tempoGastoSegundos: elapsedSeconds,
      disciplinaId,
      assuntoId,
      subassuntoId,
      metadata: context
        ? {
            atividadeEstudo: context.atividadeEstudo,
            sdeReferenceDate: context.sdeReferenceDate ?? null,
            sdePrioridade: context.sdePrioridade ?? null,
            sdeReasonCode: context.sdeReasonCode ?? null,
            diagnosticPurpose: context.sdeDiagnosticPurpose ?? false,
            duracaoPlanejadaMinutos: context.duracaoPlanejadaMinutos ?? null,
            markTheoryCompleted: context.markTheoryCompleted ?? false
          }
        : undefined
    };

    set(state => ({
      sessoesEstudo: [...state.sessoesEstudo, newSession],
      estatisticas: stats,
      assuntos: updatedAssuntos,
      disciplinas: updatedDisciplinas,
      subassuntos: updatedSubassuntos,
      cronogramasRevisao: updatedReviewSchedules,
      historicoAtividades: [activity, ...state.historicoAtividades],
      isTimerRunning: false,
      timerSecondsElapsed: 0
    }));

    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // Simulated Exercises & Questions
  // -------------------------------------------------------------
  addQuestao: (q) => {
    set(state => ({ questoes: [...state.questoes, q] }));
    get().saveToLocalStorage();
  },

  resolveQuestao: (questaoId, selectedOptionId, isCorrect, timeSpentSeconds, origin = "TREINO_ISOLADO", contextId) => {
    const q = get().questoes.find(item => item.id === questaoId);
    if (!q) return;

    const respondedAt = new Date().toISOString();
    const concursoId = get().disciplinas.find((item) => item.id === q.disciplinaId)?.concursoId;
    if (!concursoId) return;

    const attempt: TentativaQuestaoUsuario = {
      id: `attempt-${Date.now()}-${questaoId}`,
      questaoId,
      concursoId,
      disciplinaId: q.disciplinaId,
      assuntoId: q.assuntoId,
      subassuntoId: q.subassuntoId,
      opcaoSelecionadaId: selectedOptionId,
      acertou: isCorrect,
      origem: origin,
      contextoId: contextId,
      tempoRespostaSegundos: Math.max(0, timeSpentSeconds),
      respondidaEm: respondedAt
    };

    // Update questao with user response marker
    const updatedQuestoes = get().questoes.map(item => {
      if (item.id === questaoId) {
        return {
          ...item,
          resolvidaPeloUsuario: true,
          ultimoResultadoUsuario: isCorrect ? "ACERTO" as const : "ERRO" as const,
          updatedAt: respondedAt
        };
      }
      return item;
    });

    // Increment metrics on stats and subject counts
    const discId = q.disciplinaId;
    const assId = q.assuntoId;
    const subId = q.subassuntoId;

    const updatedDisciplinas = get().disciplinas.map(d => {
      if (d.id === discId) {
        return {
          ...d,
          totalQuestoesRespondidas: d.totalQuestoesRespondidas + 1,
          totalQuestoesAcertadas: d.totalQuestoesAcertadas + (isCorrect ? 1 : 0),
          updatedAt: respondedAt
        };
      }
      return d;
    });

    const updatedAssuntos = get().assuntos.map(a => {
      if (a.id === assId) {
        const correctCount = a.questoesAcertadas + (isCorrect ? 1 : 0);
        const totalCount = a.questoesRespondidas + 1;
        return {
          ...a,
          questoesRespondidas: totalCount,
          questoesAcertadas: correctCount,
          progressoPorcentagem: a.metaQuestoesResolvidas > 0
            ? Math.min(100, Math.round((totalCount / a.metaQuestoesResolvidas) * 100))
            : 0,
          updatedAt: respondedAt
        };
      }
      return a;
    });

    const updatedSubassuntos = get().subassuntos.map(sa => {
      if (sa.id === subId) {
        return {
          ...sa,
          questoesRespondidas: sa.questoesRespondidas + 1,
          questoesAcertadas: sa.questoesAcertadas + (isCorrect ? 1 : 0),
          updatedAt: new Date().toISOString()
        };
      }
      return sa;
    });

    // Update global statistics
    const stats = { ...get().estatisticas };
    if (!stats.desempenhoGeralPorDisciplina[discId]) {
      stats.desempenhoGeralPorDisciplina[discId] = {
        nomeDisciplina: get().disciplinas.find(d => d.id === discId)?.nome || "Matéria",
        questoesRespondidas: 0,
        questoesAcertadas: 0,
        tempoMinutosEstudo: 0
      };
    }
    stats.desempenhoGeralPorDisciplina[discId].questoesRespondidas += 1;
    stats.desempenhoGeralPorDisciplina[discId].questoesAcertadas += isCorrect ? 1 : 0;
    stats.questoesRespondidas += 1;
    stats.questoesAcertadas += isCorrect ? 1 : 0;

    // Create activity logs
    const activity: LogHistoricoAtividade = {
      id: "act-" + Date.now(),
      tipoAtividade: "RESOLUCAO_QUESTAO",
      dataHora: respondedAt,
      descricao: `Resolveu questão de ${q.banca} (${q.ano}) - Resultado: ${isCorrect ? "ACERTO" : "ERRO"}.`,
      disciplinaId: discId,
      assuntoId: assId,
      subassuntoId: subId,
      questaoId,
      tempoGastoSegundos: timeSpentSeconds,
      metadata: { origin, contextId, isCorrect, selectedOptionId }
    };

    const updatedReviewSchedules = !isCorrect && subId
      ? upsertReviewScheduleForSubtopic({
          schedules: get().cronogramasRevisao,
          disciplinaId: discId,
          assuntoId: assId,
          subassuntoId: subId,
          trigger: "ERRO_QUESTAO",
          triggerTimestamp: respondedAt,
          triggerId: attempt.id,
          examDate: get().concursos.find((item) => item.id === get().configuracao.concursoAlvoId)?.dataProva
        })
      : get().cronogramasRevisao;

    set(state => ({
      questoes: updatedQuestoes,
      tentativasQuestoes: [...state.tentativasQuestoes, attempt],
      disciplinas: updatedDisciplinas,
      assuntos: updatedAssuntos,
      subassuntos: updatedSubassuntos,
      estatisticas: stats,
      cronogramasRevisao: updatedReviewSchedules,
      historicoAtividades: [activity, ...state.historicoAtividades]
    }));

    get().saveToLocalStorage();
  },

  registrarTentativaExterna: (input) => {
    const state = get();
    const discipline = state.disciplinas.find((item) => item.id === input.disciplinaId);
    const subject = state.assuntos.find((item) => item.id === input.assuntoId);
    const subtopic = state.subassuntos.find((item) => item.id === input.subassuntoId);

    if (!discipline) return { success: false, error: "Disciplina inexistente." };
    if (!subject || subject.disciplinaId !== discipline.id) {
      return { success: false, error: "O assunto não pertence à disciplina selecionada." };
    }
    if (!subtopic || subtopic.assuntoId !== subject.id) {
      return { success: false, error: "O subassunto não pertence ao assunto selecionado." };
    }
    if (!Number.isFinite(input.tempoRespostaSegundos) || input.tempoRespostaSegundos < 0) {
      return { success: false, error: "O tempo de resposta deve ser um número não negativo." };
    }
    if (input.erroNota && input.erroNota.trim().length > 1000) {
      return { success: false, error: "A nota do erro deve ter no máximo 1.000 caracteres." };
    }

    const respondedAt = new Date().toISOString();
    const externalId = `external-${Date.now()}-${state.tentativasQuestoes.length + 1}`;
    const attempt: TentativaQuestaoUsuario = {
      id: `attempt-${externalId}`,
      questaoId: externalId,
      concursoId: discipline.concursoId,
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      opcaoSelecionadaId: input.acertou ? "MANUAL_ACERTO" : "MANUAL_ERRO",
      acertou: input.acertou,
      origem: "TREINO_ISOLADO",
      tempoRespostaSegundos: Math.round(input.tempoRespostaSegundos),
      respondidaEm: respondedAt,
      registradaManualmente: true,
      fonteExterna: input.fonteExterna?.trim() || undefined,
      nivelConfianca: input.nivelConfianca,
      erroCausa: input.acertou ? undefined : input.erroCausa ?? "DESCONHECIDA",
      erroNota: input.acertou ? undefined : input.erroNota?.trim() || undefined
    };

    const updatedDisciplinas = state.disciplinas.map((item) =>
      item.id === discipline.id
        ? {
            ...item,
            totalQuestoesRespondidas: item.totalQuestoesRespondidas + 1,
            totalQuestoesAcertadas: item.totalQuestoesAcertadas + (input.acertou ? 1 : 0),
            updatedAt: respondedAt
          }
        : item
    );

    const updatedAssuntos = state.assuntos.map((item) => {
      if (item.id !== subject.id) return item;
      const total = item.questoesRespondidas + 1;
      return {
        ...item,
        questoesRespondidas: total,
        questoesAcertadas: item.questoesAcertadas + (input.acertou ? 1 : 0),
        progressoPorcentagem:
          item.metaQuestoesResolvidas > 0
            ? Math.min(100, Math.round((total / item.metaQuestoesResolvidas) * 100))
            : 0,
        updatedAt: respondedAt
      };
    });

    const updatedSubassuntos = state.subassuntos.map((item) =>
      item.id === subtopic.id
        ? {
            ...item,
            questoesRespondidas: item.questoesRespondidas + 1,
            questoesAcertadas: item.questoesAcertadas + (input.acertou ? 1 : 0),
            updatedAt: respondedAt
          }
        : item
    );

    const stats = structuredClone(state.estatisticas);
    const disciplineStats = stats.desempenhoGeralPorDisciplina[discipline.id] ?? {
      nomeDisciplina: discipline.nome,
      questoesRespondidas: 0,
      questoesAcertadas: 0,
      tempoMinutosEstudo: 0
    };
    stats.desempenhoGeralPorDisciplina[discipline.id] = {
      ...disciplineStats,
      questoesRespondidas: disciplineStats.questoesRespondidas + 1,
      questoesAcertadas: disciplineStats.questoesAcertadas + (input.acertou ? 1 : 0)
    };
    stats.questoesRespondidas += 1;
    stats.questoesAcertadas += input.acertou ? 1 : 0;
    stats.updatedAt = respondedAt;

    const activity: LogHistoricoAtividade = {
      id: `act-${externalId}`,
      tipoAtividade: "RESOLUCAO_QUESTAO",
      dataHora: respondedAt,
      descricao: `Registrou questão externa em ${subtopic.nome}: ${input.acertou ? "ACERTO" : "ERRO"}.`,
      concursoId: discipline.concursoId,
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      questaoId: externalId,
      tempoGastoSegundos: Math.round(input.tempoRespostaSegundos),
      metadata: {
        origin: "TREINO_ISOLADO",
        manual: true,
        source: input.fonteExterna?.trim() || null,
        isCorrect: input.acertou,
        confidence: input.nivelConfianca ?? null,
        declaredErrorCause: attempt.erroCausa ?? null,
        hasPrivateErrorNote: Boolean(attempt.erroNota)
      }
    };

    const reviewTrigger: ReviewTrigger | null = !input.acertou
      ? "ERRO_QUESTAO"
      : input.nivelConfianca === "BAIXA"
        ? "ACERTO_BAIXA_CONFIANCA"
        : null;
    const updatedReviewSchedules = reviewTrigger
      ? upsertReviewScheduleForSubtopic({
          schedules: state.cronogramasRevisao,
          disciplinaId: discipline.id,
          assuntoId: subject.id,
          subassuntoId: subtopic.id,
          trigger: reviewTrigger,
          triggerTimestamp: respondedAt,
          triggerId: attempt.id,
          examDate: state.concursos.find((item) => item.id === state.configuracao.concursoAlvoId)?.dataProva
        })
      : state.cronogramasRevisao;

    set({
      tentativasQuestoes: [...state.tentativasQuestoes, attempt],
      disciplinas: updatedDisciplinas,
      assuntos: updatedAssuntos,
      subassuntos: updatedSubassuntos,
      estatisticas: stats,
      cronogramasRevisao: updatedReviewSchedules,
      historicoAtividades: [activity, ...state.historicoAtividades],
      ultimaDecisaoSDE: null
    });
    get().saveToLocalStorage();
    return { success: true };
  },

  // -------------------------------------------------------------
  // Review cycle and error recovery
  // -------------------------------------------------------------
  agendarRevisaoSubassunto: (subassuntoId, trigger = "MANUAL", triggerId) => {
    const state = get();
    const subtopic = state.subassuntos.find((item) => item.id === subassuntoId);
    if (!subtopic) return { success: false, error: "Subassunto inexistente." };
    const subject = state.assuntos.find((item) => item.id === subtopic.assuntoId);
    if (!subject) return { success: false, error: "Assunto do subassunto não encontrado." };
    const discipline = state.disciplinas.find((item) => item.id === subject.disciplinaId);
    if (!discipline) return { success: false, error: "Disciplina do assunto não encontrada." };

    const now = new Date().toISOString();
    const schedules = upsertReviewScheduleForSubtopic({
      schedules: state.cronogramasRevisao,
      disciplinaId: discipline.id,
      assuntoId: subject.id,
      subassuntoId: subtopic.id,
      trigger,
      triggerTimestamp: now,
      triggerId,
      examDate: state.concursos.find((item) => item.id === state.configuracao.concursoAlvoId)?.dataProva
    });

    set({ cronogramasRevisao: schedules, ultimaDecisaoSDE: null });
    get().saveToLocalStorage();
    return { success: true };
  },

  concluirRevisaoProgramada: (cronogramaId, input) => {
    const state = get();
    const completion: ReviewCompletionInput =
      typeof input === "string" ? { performance: input } : input;
    const { performance, tempoGastoSegundos, duracaoFonte } = completion;

    if (
      tempoGastoSegundos !== undefined &&
      (!Number.isInteger(tempoGastoSegundos) ||
        tempoGastoSegundos <= 0 ||
        tempoGastoSegundos > 28_800)
    ) {
      return {
        success: false,
        error: "A duração da revisão deve estar entre 1 segundo e 8 horas."
      };
    }

    const schedule = state.cronogramasRevisao.find((item) => item.id === cronogramaId);
    if (!schedule) return { success: false, error: "Revisão programada inexistente." };
    if (schedule.desabilitada) {
      return { success: false, error: "A revisão está desabilitada." };
    }

    const now = new Date().toISOString();
    const updatedCore = completeReviewSchedule({
      schedule: toCoreReviewSchedule(schedule),
      performance,
      reviewedAt: now,
      examDate: state.concursos.find((item) => item.id === state.configuracao.concursoAlvoId)?.dataProva,
      peerSchedules: state.cronogramasRevisao
        .filter((item) => !item.isDeleted)
        .map(toCoreReviewSchedule),
      tempoGastoSegundos,
      duracaoFonte
    });
    const updatedSchedule: CronogramaRevisao = {
      ...schedule,
      ...updatedCore,
      historicoTentativas: updatedCore.historicoTentativas.map((item) => ({
        revisadoEm: item.revisadoEm,
        desempenhoAutoAvaliado: item.desempenhoAutoAvaliado as DifficultyLevel,
        recuperacaoIndependente: item.recuperacaoIndependente,
        usouAjuda: item.usouAjuda,
        intervaloDecididoDias: item.intervaloDecididoDias,
        racionalIntervalo: item.racionalIntervalo ? [...item.racionalIntervalo] : undefined,
        modoSeguinte: item.modoSeguinte,
        metodoAplicado: item.metodoAplicado,
        motivoSelecaoMetodo: item.motivoSelecaoMetodo,
        selecaoExploratoria: item.selecaoExploratoria,
        diasDesdeRevisaoAnterior: item.diasDesdeRevisaoAnterior,
        tempoGastoSegundos: item.tempoGastoSegundos,
        duracaoFonte: item.duracaoFonte
      }))
    };

    const subtopic = state.subassuntos.find((item) => item.id === schedule.subassuntoId);
    const elapsedMinutes = tempoGastoSegundos ? Math.ceil(tempoGastoSegundos / 60) : 0;
    const localDate = toLocalDateKey(
      now,
      state.configuracao.disponibilidadeEstudo.timeZone
    );
    const reviewSession: SessaoEstudo | null = tempoGastoSegundos
      ? {
          id: `sess-review-${Date.now()}`,
          disciplinaId: schedule.disciplinaId,
          assuntoId: schedule.assuntoId,
          subassuntoId: schedule.subassuntoId,
          tipo: StudySessionType.STOPWATCH,
          atividadeEstudo: "revisao",
          tempoGastoSegundos,
          concluidaComSucesso: true,
          dataInicio: new Date(Date.now() - tempoGastoSegundos * 1000).toISOString(),
          dataFim: now,
          dataLocal: localDate,
          contabilizaNaDisponibilidade: true,
          anotacoesSession: `Revisão programada — ${performance}`,
          createdAt: now
        }
      : null;

    const stats = structuredClone(state.estatisticas);
    if (elapsedMinutes > 0) {
      stats.tempoTotalGeralMinutos += elapsedMinutes;
      if (!stats.desempenhoGeralPorDisciplina[schedule.disciplinaId]) {
        const discipline = state.disciplinas.find((item) => item.id === schedule.disciplinaId);
        stats.desempenhoGeralPorDisciplina[schedule.disciplinaId] = {
          nomeDisciplina: discipline?.nome ?? "Indefinida",
          questoesRespondidas: 0,
          questoesAcertadas: 0,
          tempoMinutosEstudo: 0
        };
      }
      stats.desempenhoGeralPorDisciplina[schedule.disciplinaId].tempoMinutosEstudo += elapsedMinutes;
    }

    const updatedDisciplines = elapsedMinutes > 0
      ? state.disciplinas.map((item) =>
          item.id === schedule.disciplinaId
            ? { ...item, tempoTotalEstudoMinutos: item.tempoTotalEstudoMinutos + elapsedMinutes }
            : item
        )
      : state.disciplinas;
    const updatedSubjects = elapsedMinutes > 0
      ? state.assuntos.map((item) =>
          item.id === schedule.assuntoId
            ? { ...item, tempoEstudadoMinutos: item.tempoEstudadoMinutos + elapsedMinutes }
            : item
        )
      : state.assuntos;

    const activity: LogHistoricoAtividade = {
      id: `act-review-${Date.now()}`,
      tipoAtividade: "REVISAO_PROGRAMADA",
      dataHora: now,
      descricao: `Revisão programada de ${subtopic?.nome ?? "subassunto"} registrada como ${performance}. Autoavaliação não equivale a domínio comprovado.`,
      tempoGastoSegundos,
      disciplinaId: schedule.disciplinaId,
      assuntoId: schedule.assuntoId,
      subassuntoId: schedule.subassuntoId,
      metadata: {
        performance,
        durationSeconds: tempoGastoSegundos ?? null,
        durationSource: tempoGastoSegundos ? duracaoFonte ?? "TIMER" : "LEGACY_UNKNOWN",
        nextReviewDate: updatedSchedule.proximaRevisaoData,
        intervalDays: updatedSchedule.ultimaDecisaoIntervaloDias ?? null,
        nextMode: updatedSchedule.modoProximaRevisao ?? null,
        requiresImmediateRelearning: updatedSchedule.requerReaprendizagemImediata ?? false,
        intervalRationale: updatedSchedule.racionalUltimoIntervalo ?? [],
        policyVersion: updatedSchedule.politicaVersao ?? null,
        methodApplied: updatedCore.historicoTentativas.at(-1)?.metodoAplicado ?? null,
        nextMethod: updatedSchedule.metodoProximaRevisao ?? null,
        methodSelectionReason: updatedSchedule.motivoMetodoProximaRevisao ?? null,
        observedPreferredMethod: updatedSchedule.metodoPreferidoObservado ?? null
      }
    };

    set({
      cronogramasRevisao: state.cronogramasRevisao.map((item) =>
        item.id === cronogramaId ? updatedSchedule : item
      ),
      historicoAtividades: [activity, ...state.historicoAtividades],
      sessoesEstudo: reviewSession ? [reviewSession, ...state.sessoesEstudo] : state.sessoesEstudo,
      estatisticas: stats,
      disciplinas: updatedDisciplines,
      assuntos: updatedSubjects,
      ultimaDecisaoSDE: null
    });
    get().saveToLocalStorage();
    return { success: true };
  },

  definirRevisaoDesabilitada: (cronogramaId, desabilitada) => {
    const now = new Date().toISOString();
    set((state) => ({
      cronogramasRevisao: state.cronogramasRevisao.map((item) =>
        item.id === cronogramaId
          ? { ...item, desabilitada, updatedAt: now }
          : item
      ),
      ultimaDecisaoSDE: null
    }));
    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // Flashcards: hybrid adaptive retrieval, capped by the exam horizon
  // -------------------------------------------------------------
  addFlashcard: (fc) => {
    set(state => ({ flashcards: [...state.flashcards, fc] }));
    get().saveToLocalStorage();
  },

  reviewFlashcard: (id, performance) => {
    const card = get().flashcards.find(c => c.id === id);
    if (!card) return;

    const reviewedAt = new Date().toISOString();
    const examDate = get().concursos.find(
      (item) => item.id === get().configuracao.concursoAlvoId
    )?.dataProva;
    const decision = scheduleFlashcardReview({
      card,
      performance,
      reviewedAt,
      examDate
    });

    const updatedFlashcards = get().flashcards.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        status: decision.nextStatus as CardStatus,
        intervaloDias: decision.intervalDays,
        repeticoes: decision.independentRecoveryStreak,
        proximaRevisaoData: `${decision.nextReviewDate}T00:00:00.000Z`,
        ultimaRevisaoData: reviewedAt,
        politicaVersao: decision.policyVersion,
        politicaMigradaDe: c.politicaMigradaDe ?? decision.migratedFrom,
        estabilidadeObservadaDias: decision.observedStabilityDays,
        recuperacoesIndependentesConsecutivas: decision.independentRecoveryStreak,
        falhasRecuperacao: decision.retrievalFailures,
        ultimoResultadoRecuperacao: performance,
        racionalUltimoIntervalo: decision.rationale,
        requerReaprendizagemImediata: decision.requiresImmediateRelearning,
        dataLimiteProva: examDate,
        historicoRecuperacoes: [
          ...(c.historicoRecuperacoes ?? []),
          decision.historyEntry
        ],
        updatedAt: reviewedAt
      };
    });

    const stats = { ...get().estatisticas };
    stats.flashcardsRevisados = (stats.flashcardsRevisados || 0) + 1;

    const resultLabel: Record<FlashcardRetrievalPerformance, string> = {
      FAILED: "não recuperou antes de consultar",
      EFFORTFUL: "recuperou com esforço",
      FLUENT: "recuperou com fluência"
    };
    const nextLabel = decision.intervalDays === 0
      ? "sem agendamento posterior à prova"
      : `próximo contato em ${decision.intervalDays} dia(s)`;
    const activity: LogHistoricoAtividade = {
      id: "act-" + Date.now(),
      tipoAtividade: "REVISAO_FLASHCARD",
      dataHora: reviewedAt,
      descricao: `Flashcard: ${resultLabel[performance]}; ${nextLabel}.`
    };

    set(state => ({
      flashcards: updatedFlashcards,
      estatisticas: stats,
      historicoAtividades: [activity, ...state.historicoAtividades]
    }));

    get().saveToLocalStorage();
  },

  deleteFlashcard: (id) => {
    set(state => ({ flashcards: state.flashcards.filter(c => c.id !== id) }));
    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // Simulated Exams / Simulado Logic
  // -------------------------------------------------------------
  createSimulado: (titulo, concursoId, qCount, timeLimitSeconds, selectedSubjectIds) => {
    const id = "sim-" + Date.now();
    
    // Pick questions matching concurso & optional subjects
    let candidateQuestions = get().questoes.filter(q => {
      const matchConcurso = true; // mapped via subject/discipline relations
      if (selectedSubjectIds && selectedSubjectIds.length > 0) {
        return selectedSubjectIds.includes(q.assuntoId);
      }
      return true;
    });

    // If zero questions match, fallback to any available questions in DB
    if (candidateQuestions.length === 0) {
      candidateQuestions = get().questoes;
    }

    // Shuffle questions and select the count
    const shuffled = [...candidateQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, qCount);

    const newSimulado: Simulado = {
      id,
      concursoId,
      titulo,
      quantidadeQuestoes: selected.length,
      tempoLimiteSegundos: timeLimitSeconds,
      questoesIds: selected.map(q => q.id),
      respostas: {},
      percentualAcertos: 0,
      tempoEstudoGastoSegundos: 0,
      status: "CRIADO",
      iniciadoEm: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set(state => ({
      simulados: [...state.simulados, newSimulado],
      activeSimuladoId: id
    }));

    get().saveToLocalStorage();
    return id;
  },

  submitSimuladoAnswer: (simuladoId, questaoId, optionId, isCorrect, timeSpentSeconds) => {
    const currentSimulado = get().simulados.find((sim) => sim.id === simuladoId);
    const previousAnswer = currentSimulado?.respostas[questaoId];

    set(state => ({
      simulados: state.simulados.map(sim => {
        if (sim.id === simuladoId) {
          const updatedRespostas = {
            ...sim.respostas,
            [questaoId]: {
              questaoId,
              opcaoSelecionadaId: optionId,
              isCorreta: isCorrect,
              tempoGastoSegundos: timeSpentSeconds
            }
          };
          const previousTime = previousAnswer?.tempoGastoSegundos ?? 0;

          return {
            ...sim,
            respostas: updatedRespostas,
            tempoEstudoGastoSegundos: Math.max(
              0,
              sim.tempoEstudoGastoSegundos - previousTime + timeSpentSeconds
            ),
            updatedAt: new Date().toISOString()
          };
        }
        return sim;
      })
    }));

    // Only the first finalized response becomes a new canonical attempt.
    if (!previousAnswer) {
      get().resolveQuestao(
        questaoId,
        optionId,
        isCorrect,
        timeSpentSeconds,
        "SIMULADO",
        simuladoId
      );
    } else {
      get().saveToLocalStorage();
    }
  },

  finishSimulado: (simuladoId) => {
    set(state => ({
      simulados: state.simulados.map(sim => {
        if (sim.id === simuladoId) {
          const totalAnswers = Object.values(sim.respostas).length;
          const correctAnswers = Object.values(sim.respostas).filter(r => r.isCorreta).length;
          const pct = sim.quantidadeQuestoes > 0 ? Math.round((correctAnswers / sim.quantidadeQuestoes) * 100) : 0;

          return {
            ...sim,
            status: "CONCLUIDO",
            percentualAcertos: pct,
            concluidoEm: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        return sim;
      }),
      activeSimuladoId: null
    }));

    const sim = get().simulados.find(s => s.id === simuladoId);
    if (sim) {
      const activity: LogHistoricoAtividade = {
        id: "act-" + Date.now(),
        tipoAtividade: "SIMULADO",
        dataHora: new Date().toISOString(),
        descricao: `Finalizou o Simulado '${sim.titulo}' com taxa de acerto de ${sim.percentualAcertos}%.`
      };
      set(state => ({
        historicoAtividades: [activity, ...state.historicoAtividades]
      }));
    }

    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // AI Chat Messages Action
  // -------------------------------------------------------------
  createNewChat: (concursoId, title) => {
    const id = "chat-" + Date.now();
    const newChat: HistoricoChatIA = {
      id,
      concursoId,
      titulo: title || `Sessão de Mentoria #${get().conversasIA.length + 1}`,
      mensagens: [
        {
          id: "m-welcome",
          remetente: "AI",
          conteudo: "Olá! Sou seu Coach IA ConcurseiroOS. Estou pronto para criar planos de estudo, analisar seu progresso ou dar dicas sobre disciplinas específicas para o seu concurso público. Como posso ajudar você hoje?",
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set(state => ({
      conversasIA: [...state.conversasIA, newChat],
      activeChatId: id
    }));

    get().saveToLocalStorage();
    return id;
  },

  addChatMessage: (chatId, message) => {
    const newMessage = {
      ...message,
      id: "msg-" + Date.now(),
      timestamp: new Date().toISOString()
    };

    set(state => ({
      conversasIA: state.conversasIA.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            mensagens: [...chat.mensagens, newMessage],
            updatedAt: new Date().toISOString()
          };
        }
        return chat;
      })
    }));

    get().saveToLocalStorage();
  },

  // -------------------------------------------------------------
  // Library & Doc uploads
  // -------------------------------------------------------------
  addDocumento: (doc) => {
    set(state => ({ documentos: [...state.documentos, doc] }));
    get().saveToLocalStorage();
  },

  addResumo: (resumo) => {
    set(state => ({ resumos: [...state.resumos, resumo] }));
    get().saveToLocalStorage();
  },

  updateResumo: (id, updates) => {
    set(state => ({
      resumos: state.resumos.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)
    }));
    get().saveToLocalStorage();
  },

  addBibliotecaItem: (item) => {
    set(state => ({ biblioteca: [...(state.biblioteca || []), item] }));
    get().saveToLocalStorage();
  },

  updateBibliotecaItem: (id, updates) => {
    set(state => ({
      biblioteca: (state.biblioteca || []).map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item)
    }));
    get().saveToLocalStorage();
  },

  deleteBibliotecaItem: (id) => {
    set(state => ({
      biblioteca: (state.biblioteca || []).filter(item => item.id !== id)
    }));
    get().saveToLocalStorage();
  }

}));
