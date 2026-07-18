import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FGV_TRAINING_FILTERS, normalizeFgvTrainingAdherenceFilter } from "../defaults";
import { countFgvTrainingProgress, createFgvTrainingAttempt } from "../engine";
import { FGV_TRAINING_ALTERNATIVE_IMAGE_CLASS_NAME, FGV_TRAINING_SCROLL_CONTAINER_CLASS_NAME, FGV_TRAINING_STATEMENT_IMAGE_CLASS_NAME } from "../layout";
import { saveActiveFgvTrainingAttempt, type FgvTrainingStorage } from "../storage";
import { useFgvTrainingStore } from "../store";
import type { FgvTrainingCheckedCorrection } from "../types";

const apiMocks = vi.hoisted(() => ({
  check: vi.fn(),
  finalize: vi.fn(),
}));

vi.mock("../api", () => ({
  checkFgvTrainingAnswer: apiMocks.check,
  finalizeFgvTraining: apiMocks.finalize,
}));

class MemoryStorage implements FgvTrainingStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let localStorage: MemoryStorage;

function resetStore() {
  useFgvTrainingStore.setState({
    hydrated: false,
    activeAttempt: null,
    finalizedAttempts: [],
    submitting: false,
    checkingQuestionId: null,
    attemptError: null,
    landingError: null,
  });
}

function installWindow(storage: MemoryStorage) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
}

function activeAttempt() {
  return createFgvTrainingAttempt(
    "hotfix-attempt",
    "2026-07-18T21:00:00.000Z",
    { ...DEFAULT_FGV_TRAINING_FILTERS, quantity: 5 },
    "hotfix-seed",
  );
}

beforeEach(() => {
  apiMocks.check.mockReset();
  apiMocks.finalize.mockReset();
  localStorage = new MemoryStorage();
  installWindow(localStorage);
  resetStore();
});

afterEach(() => {
  resetStore();
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("Hotfix crítico do Treino FGV", () => {
  it("usa aderência Direta como padrão e fallback", () => {
    expect(DEFAULT_FGV_TRAINING_FILTERS.adherence).toBe("DIRECT");
    expect(normalizeFgvTrainingAdherenceFilter(undefined)).toBe("DIRECT");
    expect(normalizeFgvTrainingAdherenceFilter("INVALID")).toBe("DIRECT");
    expect(normalizeFgvTrainingAdherenceFilter("PARTIAL")).toBe("PARTIAL");
    expect(normalizeFgvTrainingAdherenceFilter("BOTH")).toBe("BOTH");
  });

  it("mantém a resposta selecionada e permite repetir após falha", async () => {
    let attempt = activeAttempt();
    const questionId = attempt.questionOrder[0];
    attempt = { ...attempt, answers: { [questionId]: "A" } };
    saveActiveFgvTrainingAttempt(localStorage, attempt);
    useFgvTrainingStore.getState().hydrate();

    apiMocks.check.mockRejectedValueOnce(new Error("Serviço temporariamente indisponível."));
    const failed = await useFgvTrainingStore.getState().check(questionId);
    expect(failed.success).toBe(false);
    expect(useFgvTrainingStore.getState().activeAttempt?.answers[questionId]).toBe("A");
    expect(useFgvTrainingStore.getState().activeAttempt?.checkedCorrections[questionId]).toBeUndefined();
    expect(useFgvTrainingStore.getState().attemptError).toMatch(/indisponível/);

    const correction: FgvTrainingCheckedCorrection = { questionId, selectedAnswer: "A", operationalAnswer: "B", status: "INCORRECT" };
    apiMocks.check.mockResolvedValueOnce(correction);
    const retried = await useFgvTrainingStore.getState().check(questionId);
    expect(retried.success).toBe(true);
    expect(useFgvTrainingStore.getState().attemptError).toBeNull();
    expect(useFgvTrainingStore.getState().activeAttempt?.checkedCorrections[questionId]).toEqual(correction);
  });

  it("atualiza o contador, bloqueia a resposta e preserva a conferência após F5", async () => {
    let attempt = activeAttempt();
    const questionId = attempt.questionOrder[0];
    attempt = { ...attempt, answers: { [questionId]: "C" } };
    saveActiveFgvTrainingAttempt(localStorage, attempt);
    useFgvTrainingStore.getState().hydrate();
    apiMocks.check.mockResolvedValueOnce({ questionId, selectedAnswer: "C", operationalAnswer: "C", status: "CORRECT" });

    await useFgvTrainingStore.getState().check(questionId);
    const checked = useFgvTrainingStore.getState().activeAttempt!;
    expect(countFgvTrainingProgress(checked).checked).toBe(1);
    useFgvTrainingStore.getState().answer(questionId, "D");
    expect(useFgvTrainingStore.getState().activeAttempt?.answers[questionId]).toBe("C");

    resetStore();
    useFgvTrainingStore.getState().hydrate();
    expect(useFgvTrainingStore.getState().activeAttempt?.checkedCorrections[questionId]?.status).toBe("CORRECT");
  });

  it("limpa erro ao trocar questão, cancelar ou navegar para outro estado", () => {
    const attempt = activeAttempt();
    saveActiveFgvTrainingAttempt(localStorage, attempt);
    useFgvTrainingStore.getState().hydrate();
    useFgvTrainingStore.setState({ attemptError: "erro transitório" });
    useFgvTrainingStore.getState().navigate(1);
    expect(useFgvTrainingStore.getState().attemptError).toBeNull();

    useFgvTrainingStore.setState({ attemptError: "erro transitório", landingError: "erro de landing" });
    useFgvTrainingStore.getState().clearTransientState();
    expect(useFgvTrainingStore.getState().attemptError).toBeNull();
    expect(useFgvTrainingStore.getState().landingError).toBeNull();

    useFgvTrainingStore.setState({ attemptError: "erro transitório" });
    useFgvTrainingStore.getState().cancel();
    expect(useFgvTrainingStore.getState().activeAttempt).toBeNull();
    expect(useFgvTrainingStore.getState().attemptError).toBeNull();
  });

  it("não persiste mensagens transitórias na tentativa", () => {
    const attempt = activeAttempt();
    saveActiveFgvTrainingAttempt(localStorage, attempt);
    useFgvTrainingStore.getState().hydrate();
    useFgvTrainingStore.setState({ attemptError: "não persistir" });
    const serialized = localStorage.getItem("concurseiroos.training.fgv.active.v1") ?? "";
    expect(serialized).not.toContain("não persistir");
    expect(serialized).not.toContain("attemptError");
  });

  it("mantém uma única área vertical rolável e imagens contidas", () => {
    const scrollClasses = FGV_TRAINING_SCROLL_CONTAINER_CLASS_NAME.split(/\s+/);
    expect(scrollClasses).toContain("h-full");
    expect(scrollClasses).toContain("min-h-0");
    expect(scrollClasses).toContain("overflow-y-auto");
    expect(scrollClasses).toContain("overflow-x-hidden");
    expect(FGV_TRAINING_STATEMENT_IMAGE_CLASS_NAME.split(/\s+/)).toEqual(expect.arrayContaining(["h-auto", "max-w-full"]));
    expect(FGV_TRAINING_ALTERNATIVE_IMAGE_CLASS_NAME.split(/\s+/)).toEqual(expect.arrayContaining(["h-auto", "max-w-full"]));
  });

  it("renderiza marcadores de acesso até a alternativa E e controles inferiores", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/FgvTrainingView.tsx"), "utf8");
    expect(source).toContain('data-testid="fgv-training-scroll-container"');
    expect(source).toContain('data-testid={`fgv-training-alternative-${alternative.label}`}');
    expect(source).toContain('data-testid="fgv-training-navigation"');
    expect(source).toContain("store.landingError");
    expect(source).toContain("store.attemptError");
  });
});
