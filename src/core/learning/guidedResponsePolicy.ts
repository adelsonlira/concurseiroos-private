import type { GuidedQuestionDraft, GuidedQuestionResponse } from "./types";

export function isGuidedQuestionDraftComplete(draft: GuidedQuestionDraft | undefined): boolean {
  if (!draft?.state) return false;
  if (draft.state === "DONT_KNOW") return true;
  return draft.answerText.trim().length > 0;
}

export function areGuidedQuestionDraftsComplete(
  questions: readonly string[],
  drafts: Readonly<Record<number, GuidedQuestionDraft>>
): boolean {
  return questions.length > 0 && questions.every((_, index) => isGuidedQuestionDraftComplete(drafts[index]));
}

export function toGuidedQuestionResponses(
  questions: readonly string[],
  drafts: Readonly<Record<number, GuidedQuestionDraft>>
): GuidedQuestionResponse[] {
  if (!areGuidedQuestionDraftsComplete(questions, drafts)) {
    throw new Error("Todas as perguntas-guia precisam de uma tentativa registrada.");
  }
  return questions.map((_, questionIndex) => ({
    questionIndex,
    state: drafts[questionIndex]!.state!,
    answerText: drafts[questionIndex]!.answerText.trim() || undefined
  }));
}
