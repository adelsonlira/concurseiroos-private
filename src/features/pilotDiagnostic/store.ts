import { create } from "zustand";
import { finalizePilotDiagnostic } from "./api";
import {
  answerPilotDiagnosticQuestion,
  buildPilotDiagnosticFinalizationRequest,
  createPilotDiagnosticAttempt,
  navigatePilotDiagnostic,
  togglePilotDiagnosticReview,
} from "./engine";
import {
  appendFinalizedPilotDiagnosticAttempt,
  cancelActivePilotDiagnosticAttempt,
  readPilotDiagnosticSnapshot,
  saveActivePilotDiagnosticAttempt,
  startActivePilotDiagnosticAttempt,
  type DiagnosticStorage,
} from "./storage";
import type {
  ActivePilotDiagnosticAttempt,
  DiagnosticOptionLabel,
  FinalizedPilotDiagnosticAttempt,
} from "./types";

interface PilotDiagnosticState {
  hydrated: boolean;
  activeAttempt: ActivePilotDiagnosticAttempt | null;
  finalizedAttempts: FinalizedPilotDiagnosticAttempt[];
  selectedFinalizedAttemptId: string | null;
  submitting: boolean;
  error: string | null;
  hydrate: () => void;
  start: () => { success: boolean; error?: string };
  answer: (questionId: string, answer: DiagnosticOptionLabel) => void;
  toggleReview: (questionId: string) => void;
  navigate: (position: number) => void;
  cancel: () => void;
  finalize: () => Promise<{ success: boolean; error?: string }>;
  selectFinalizedAttempt: (attemptId: string | null) => void;
  clearError: () => void;
}

function getBrowserStorage(): DiagnosticStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `diag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const usePilotDiagnosticStore = create<PilotDiagnosticState>((set, get) => ({
  hydrated: false,
  activeAttempt: null,
  finalizedAttempts: [],
  selectedFinalizedAttemptId: null,
  submitting: false,
  error: null,

  hydrate: () => {
    const storage = getBrowserStorage();
    if (!storage) {
      set({ hydrated: true });
      return;
    }
    const snapshot = readPilotDiagnosticSnapshot(storage);
    set({
      hydrated: true,
      activeAttempt: snapshot.activeAttempt,
      finalizedAttempts: snapshot.finalizedAttempts,
      selectedFinalizedAttemptId: snapshot.activeAttempt
        ? null
        : snapshot.finalizedAttempts.at(-1)?.attemptId ?? null,
      error: null,
    });
  },

  start: () => {
    const storage = getBrowserStorage();
    if (!storage) return { success: false, error: "Armazenamento local indisponível." };
    const existing = readPilotDiagnosticSnapshot(storage).activeAttempt;
    if (existing) {
      set({ activeAttempt: existing, selectedFinalizedAttemptId: null });
      return { success: false, error: "Já existe uma tentativa ativa. Retome ou cancele antes de iniciar outra." };
    }

    const attempt = createPilotDiagnosticAttempt(createAttemptId(), nowIso());
    startActivePilotDiagnosticAttempt(storage, attempt);
    set({ activeAttempt: attempt, selectedFinalizedAttemptId: null, error: null });
    return { success: true };
  },

  answer: (questionId, answer) => {
    const attempt = get().activeAttempt;
    const storage = getBrowserStorage();
    if (!attempt || !storage) return;
    const next = answerPilotDiagnosticQuestion(attempt, questionId, answer, nowIso());
    saveActivePilotDiagnosticAttempt(storage, next);
    set({ activeAttempt: next, error: null });
  },

  toggleReview: (questionId) => {
    const attempt = get().activeAttempt;
    const storage = getBrowserStorage();
    if (!attempt || !storage) return;
    const next = togglePilotDiagnosticReview(attempt, questionId, nowIso());
    saveActivePilotDiagnosticAttempt(storage, next);
    set({ activeAttempt: next, error: null });
  },

  navigate: (position) => {
    const attempt = get().activeAttempt;
    const storage = getBrowserStorage();
    if (!attempt || !storage) return;
    const next = navigatePilotDiagnostic(attempt, position, nowIso());
    saveActivePilotDiagnosticAttempt(storage, next);
    set({ activeAttempt: next, error: null });
  },

  cancel: () => {
    const storage = getBrowserStorage();
    if (storage) cancelActivePilotDiagnosticAttempt(storage);
    set({ activeAttempt: null, error: null });
  },

  finalize: async () => {
    const attempt = get().activeAttempt;
    const storage = getBrowserStorage();
    if (!attempt || !storage) return { success: false, error: "Nenhuma tentativa ativa." };
    set({ submitting: true, error: null });
    try {
      const result = await finalizePilotDiagnostic(buildPilotDiagnosticFinalizationRequest(attempt));
      const finalizedAttempts = appendFinalizedPilotDiagnosticAttempt(storage, result);
      set({
        submitting: false,
        activeAttempt: null,
        finalizedAttempts,
        selectedFinalizedAttemptId: result.attemptId,
        error: null,
      });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao finalizar o diagnóstico.";
      set({ submitting: false, error: message });
      return { success: false, error: message };
    }
  },

  selectFinalizedAttempt: (attemptId) => set({ selectedFinalizedAttemptId: attemptId, error: null }),
  clearError: () => set({ error: null }),
}));
