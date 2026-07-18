import catalogJson from "./data/trainingPublicCatalog.json";
import type { FgvTrainingPublicCatalog } from "./types";

export const FGV_TRAINING_CATALOG = catalogJson as unknown as FgvTrainingPublicCatalog;
export const FGV_TRAINING_QUESTION_BY_ID = new Map(
  FGV_TRAINING_CATALOG.questions.map((question) => [question.questionId, question]),
);

export function getFgvTrainingQuestion(questionId: string) {
  return FGV_TRAINING_QUESTION_BY_ID.get(questionId);
}

export function getFgvTrainingSelectionAreas(): string[] {
  return [...new Set(FGV_TRAINING_CATALOG.questions.map((question) => question.selectionArea))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function getFgvTrainingPrimaryItems(): Array<{ id: string; name: string }> {
  return [...new Map(FGV_TRAINING_CATALOG.questions.map((question) => [question.primaryItem.id, question.primaryItem])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
