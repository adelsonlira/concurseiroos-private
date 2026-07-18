import { create } from "zustand";
import { checkFgvTrainingAnswer, finalizeFgvTraining } from "./api";
import { answerFgvTrainingQuestion, applyCheckedFgvTrainingCorrection, buildCheckFgvTrainingRequest, buildFinalizeFgvTrainingRequest, createFgvTrainingAttempt, navigateFgvTraining, toggleFgvTrainingReview } from "./engine";
import { appendFinalizedFgvTrainingAttempt, cancelActiveFgvTrainingAttempt, readFgvTrainingSnapshot, saveActiveFgvTrainingAttempt, startActiveFgvTrainingAttempt, type FgvTrainingStorage } from "./storage";
import type { ActiveFgvTrainingAttempt, FgvTrainingFilters, FgvTrainingOptionLabel, FinalizedFgvTrainingAttempt } from "./types";

interface State {
  hydrated: boolean; activeAttempt: ActiveFgvTrainingAttempt | null; finalizedAttempts: FinalizedFgvTrainingAttempt[]; submitting: boolean; checkingQuestionId: string | null; error: string | null;
  hydrate: () => void; start: (filters: FgvTrainingFilters) => { success: boolean; error?: string }; answer: (questionId: string, answer: FgvTrainingOptionLabel) => void;
  check: (questionId: string) => Promise<{ success: boolean; error?: string }>; toggleReview: (questionId: string) => void; navigate: (index: number) => void; cancel: () => void;
  finalize: () => Promise<{ success: boolean; attemptId?: string; error?: string }>; clearError: () => void;
}
function storage(): FgvTrainingStorage | null { return typeof window === "undefined" ? null : window.localStorage; }
function now(): string { return new Date().toISOString(); }
function id(prefix: string): string { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export const useFgvTrainingStore = create<State>((set, get) => ({
  hydrated: false, activeAttempt: null, finalizedAttempts: [], submitting: false, checkingQuestionId: null, error: null,
  hydrate: () => { const target = storage(); if (!target) return set({ hydrated: true }); const snapshot = readFgvTrainingSnapshot(target); set({ hydrated: true, ...snapshot, error: null }); },
  start: (filters) => { const target = storage(); if (!target) return { success: false, error: "Armazenamento local indisponível." }; const existing = readFgvTrainingSnapshot(target).activeAttempt; if (existing) { set({ activeAttempt: existing }); return { success: false, error: "Já existe um treino ativo." }; }
    try { const attempt = createFgvTrainingAttempt(id("training"), now(), filters, id("seed")); startActiveFgvTrainingAttempt(target, attempt); set({ activeAttempt: attempt, error: null }); return { success: true }; } catch (error) { const message = error instanceof Error ? error.message : "Não foi possível iniciar o treino."; set({ error: message }); return { success: false, error: message }; } },
  answer: (questionId, answer) => { const attempt = get().activeAttempt; const target = storage(); if (!attempt || !target) return; try { const next = answerFgvTrainingQuestion(attempt, questionId, answer, now()); saveActiveFgvTrainingAttempt(target, next); set({ activeAttempt: next, error: null }); } catch (error) { set({ error: error instanceof Error ? error.message : "Resposta inválida." }); } },
  check: async (questionId) => { const attempt = get().activeAttempt; const target = storage(); if (!attempt || !target) return { success: false, error: "Nenhum treino ativo." }; set({ checkingQuestionId: questionId, error: null }); try { const correction = await checkFgvTrainingAnswer(buildCheckFgvTrainingRequest(attempt, questionId)); const next = applyCheckedFgvTrainingCorrection(attempt, correction, now()); saveActiveFgvTrainingAttempt(target, next); set({ activeAttempt: next, checkingQuestionId: null }); return { success: true }; } catch (error) { const message = error instanceof Error ? error.message : "Falha ao conferir."; set({ checkingQuestionId: null, error: message }); return { success: false, error: message }; } },
  toggleReview: (questionId) => { const attempt = get().activeAttempt; const target = storage(); if (!attempt || !target) return; const next = toggleFgvTrainingReview(attempt, questionId, now()); saveActiveFgvTrainingAttempt(target, next); set({ activeAttempt: next }); },
  navigate: (index) => { const attempt = get().activeAttempt; const target = storage(); if (!attempt || !target) return; const next = navigateFgvTraining(attempt, index, now()); saveActiveFgvTrainingAttempt(target, next); set({ activeAttempt: next }); },
  cancel: () => { const target = storage(); if (target) cancelActiveFgvTrainingAttempt(target); set({ activeAttempt: null, error: null }); },
  finalize: async () => { const attempt = get().activeAttempt; const target = storage(); if (!attempt || !target) return { success: false, error: "Nenhum treino ativo." }; set({ submitting: true, error: null }); try { const result = await finalizeFgvTraining(buildFinalizeFgvTrainingRequest(attempt)); const finalizedAttempts = appendFinalizedFgvTrainingAttempt(target, result); set({ submitting: false, activeAttempt: null, finalizedAttempts }); return { success: true, attemptId: result.attemptId }; } catch (error) { const message = error instanceof Error ? error.message : "Falha ao finalizar."; set({ submitting: false, error: message }); return { success: false, error: message }; } },
  clearError: () => set({ error: null }),
}));
