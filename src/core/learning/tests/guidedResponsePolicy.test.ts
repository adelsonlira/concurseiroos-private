import { describe, expect, it } from "vitest";
import {
  areGuidedQuestionDraftsComplete,
  toGuidedQuestionResponses
} from "../guidedResponsePolicy";

const questions = ["Q1", "Q2"];

describe("guided response policy", () => {
  it("aceita ainda não sei sem exigir texto adicional", () => {
    expect(
      areGuidedQuestionDraftsComplete(questions, {
        0: { state: "DONT_KNOW", answerText: "" },
        1: { state: "CORRECT", answerText: "Resposta recuperada" }
      })
    ).toBe(true);
  });

  it("exige uma resposta escrita quando o estudante declara conteúdo recuperado", () => {
    expect(
      areGuidedQuestionDraftsComplete(questions, {
        0: { state: "CORRECT", answerText: "" },
        1: { state: "DONT_KNOW", answerText: "" }
      })
    ).toBe(false);
  });

  it("converte rascunhos completos em evidência persistível", () => {
    expect(
      toGuidedQuestionResponses(questions, {
        0: { state: "DONT_KNOW", answerText: "Ainda não sei" },
        1: { state: "PARTIAL", answerText: "Lembrei apenas uma parte" }
      })
    ).toEqual([
      { questionIndex: 0, state: "DONT_KNOW", answerText: "Ainda não sei" },
      { questionIndex: 1, state: "PARTIAL", answerText: "Lembrei apenas uma parte" }
    ]);
  });
});
