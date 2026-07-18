import { create } from "zustand";
import { checkFgvTrainingAnswer, finalizeFgvTraining } from "./api";
import { answerFgvTrainingQuestion, applyCheckedFgvTrainingCorrection, buildCheckFgvTrainingRequest, buildFinalizeFgvTrainingRequest, createFgvTrainingAttempt, navigateFgvTraining, toggleFgvTrainingReview } from "./engine";
import { appendFinalizedFgvTrainingAttempt, cancelActiveFgvTrainingAttempt, readFgvTrainingSnapshot, saveActiveFgvTrainingAttempt, startActiveFgvTrainingAttempt, type FgvTrainingStorage } from "./storage";
import type { ActiveFgvTrainingAttempt, FgvTrainingFilters, FgvTrainingOptionLabel, FinalizedFgvTrainingAttempt } from "./types";

interface State {
  hydrated: boolean;
  activeAttempt: ActiveFgvTrainingAttempt | null;
  finalizedAttempts: FinalizedFgvTrainingAttempt[];
  submitting: boolean;
  checkingQuestionId: string | null;
  attemptError: string | null;
  landingError: string | null;
  hydrate: () => void;
  start: (filters: FgvTrainingFilters) => { success: boolean; error?: string };
  answer: (questionId: string, answer: FgvTrainingOptionLabel) => void;
  check: (questionId: string) => Promise<{ success: boolean; error?: string }>;
  toggleReview: (questionId: string) => void;
  navigate: (index: number) => void;
  cancel: () => void;
  finalize: () => Promise<{ success: boolean; attemptId?: string; error?: string }>;
  clearAttemptError: () => void;
  clearLandingError: () => void;
  clearTransientState: () => void;
}

function storage(): FgvTrainingStorage | null { return typeof window === "undefined" ? null : window.localStorage; }
function now(): string { return new Date().toISOString(); }
function id(prefix: string): string { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function messageOf(error: unknown, fallback: string): string { return error instanceof Error && error.message.trim() ? error.message : fallback; }

export const useFgvTrainingStore = create<State>((set, get) => ({
  hydrated: false,
  activeAttempt: null,
  finalizedAttempts: [],
  submitting: false,
  checkingQuestionId: null,
  attemptError: null,
  landingError: null,

  hydrate: () => {
    const target = storage();
    if (!target) return set({ hydrated: true, attemptError: null, landingError: null });
    const snapshot = readFgvTrainingSnapshot(target);
    set({ hydrated: true, ...snapshot, attemptError: null, landingError: null, checkingQuestionId: null, submitting: false });
  },

  start: (filters) => {
    const target = storage();
    if (!target) {
      const error = "Armazenamento local indisponível.";
      set({ landingError: error, attemptError: null });
      return { success: false, error };
    }
    const existing = readFgvTrainingSnapshot(target).activeAttempt;
    if (existing) {
      set({ activeAttempt: existing, landingError: null, attemptError: null });
      return { success: false, error: "Já existe um treino ativo." };
    }
    try {
      const attempt = createFgvTrainingAttempt(id("training"), now(), filters, id("seed"));
      startActiveFgvTrainingAttempt(target, attempt);
      set({ activeAttempt: attempt, landingError: null, attemptError: null, checkingQuestionId: null });
      return { success: true };
    } catch (error) {
      const message = messageOf(error, "Não foi possível iniciar o treino.");
      set({ landingError: message, attemptError: null });
      return { success: false, error: message };
    }
  },

  answer: (questionId, answer) => {
    const attempt = get().activeAttempt;
    const target = storage();
    if (!attempt || !target) return;
    try {
      const next = answerFgvTrainingQuestion(attempt, questionId, answer, now());
      saveActiveFgvTrainingAttempt(target, next);
      set({ activeAttempt: next, attemptError: null });
    } catch (error) {
      set({ attemptError: messageOf(error, "Resposta inválida.") });
    }
  },

  check: async (questionId) => {
    const attempt = get().activeAttempt;
    const target = storage();
    if (!attempt || !target) return { success: false, error: "Nenhum treino ativo." };
    set({ checkingQuestionId: questionId, attemptError: null });
    try {
      const correction = await checkFgvTrainingAnswer(buildCheckFgvTrainingRequest(attempt, questionId));
      const currentAttempt = get().activeAttempt;
      if (!currentAttempt || currentAttempt.attemptId !== attempt.attemptId) throw new Error("A tentativa ativa mudou durante a conferência.");
      const next = applyCheckedFgvTrainingCorrection(currentAttempt, correction, now());
      saveActiveFgvTrainingAttempt(target, next);
      set({ activeAttempt: next, checkingQuestionId: null, attemptError: null });
      return { success: true };
    } catch (error) {
      const message = messageOf(error, "Não foi possível conferir a resposta. Sua alternativa foi mantida; tente novamente.");
      set({ checkingQuestionId: null, attemptError: message });
      return { success: false, error: message };
    }
  },

  toggleReview: (questionId) => {
    const attempt = get().activeAttempt;
    const target = storage();
    if (!attempt || !target) return;
    const next = toggleFgvTrainingReview(attempt, questionId, now());
    saveActiveFgvTrainingAttempt(target, next);
    set({ activeAttempt: next });
  },

  navigate: (index) => {
    const attempt = get().activeAttempt;
    const target = storage();
    if (!attempt || !target) return;
    const next = navigateFgvTraining(attempt, index, now());
    saveActiveFgvTrainingAttempt(target, next);
    set({ activeAttempt: next, attemptError: null, checkingQuestionId: null });
  },

  cancel: () => {
    const target = storage();
    if (target) cancelActiveFgvTrainingAttempt(target);
    set({ activeAttempt: null, attemptError: null, landingError: null, checkingQuestionId: null, submitting: false });
  },

  finalize: async () => {
    const attempt = get().activeAttempt;
    const target = storage();
    if (!attempt || !target) return { success: false, error: "Nenhum treino ativo." };
    set({ submitting: true, attemptError: null });
    try {
      const result = await finalizeFgvTraining(buildFinalizeFgvTrainingRequest(attempt));
      const finalizedAttempts = appendFinalizedFgvTrainingAttempt(target, result);
      set({ submitting: false, activeAttempt: null, finalizedAttempts, attemptError: null, landingError: null, checkingQuestionId: null });
      return { success: true, attemptId: result.attemptId };
    } catch (error) {
      const message = messageOf(error, "Não foi possível finalizar o treino.");
      set({ submitting: false, attemptError: message });
      return { success: false, error: message };
    }
  },

  clearAttemptError: () => set({ attemptError: null, checkingQuestionId: null }),
  clearLandingError: () => set({ landingError: null }),
  clearTransientState: () => set({ attemptError: null, landingError: null, checkingQuestionId: null }),
}));
